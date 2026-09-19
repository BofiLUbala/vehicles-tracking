import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { io, Socket } from 'socket.io-client';
import { TrackingModule } from './tracking.module';
import { TrackingService } from './tracking.service';
import { DriversModule } from '../drivers/drivers.module';
import { DriversService } from '../drivers/drivers.service';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { VehiclesService } from '../vehicles/vehicles.service';
import { MissionsModule } from '../missions/missions.module';
import { MissionsService } from '../missions/missions.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';

const DEMO_ORG_ID = '00000000-0000-0000-0000-000000000001';
const BASE_LAT = -4.325;
const BASE_LNG = 15.322;

function randomSuffix(len = 8) {
  return Math.random().toString(36).slice(2, 2 + len);
}

describe('TrackingService (intégration DB réelle)', () => {
  let tracking: TrackingService;
  let drivers: DriversService;
  let vehicles: VehiclesService;
  let missions: MissionsService;
  let prisma: PrismaService;

  const driverIds: string[] = [];
  const vehicleIds: string[] = [];
  const missionIds: string[] = [];
  const locationIds: string[] = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, DriversModule, VehiclesModule, MissionsModule, TrackingModule],
    }).compile();
    await moduleRef.init();

    tracking = moduleRef.get(TrackingService);
    drivers = moduleRef.get(DriversService);
    vehicles = moduleRef.get(VehiclesService);
    missions = moduleRef.get(MissionsService);
    prisma = moduleRef.get(PrismaService);
  }, 30_000);

  afterAll(async () => {
    for (const id of missionIds) {
      await prisma.alert.deleteMany({ where: { missionId: id } }).catch(() => undefined);
      await prisma.missionStepValidation.deleteMany({ where: { missionStep: { missionId: id } } }).catch(() => undefined);
      await prisma.missionEvent.deleteMany({ where: { missionId: id } }).catch(() => undefined);
      await prisma.missionStep.deleteMany({ where: { missionId: id } }).catch(() => undefined);
      await prisma.mission.delete({ where: { id } }).catch(() => undefined);
    }
    for (const id of locationIds) {
      await prisma.location.delete({ where: { id } }).catch(() => undefined);
    }
    await prisma.alert.deleteMany({ where: { vehicleId: { in: vehicleIds } } }).catch(() => undefined);
    await prisma.gpsPosition.deleteMany({ where: { vehicleId: { in: vehicleIds } } }).catch(() => undefined);
    await prisma.vehicleLatestPosition.deleteMany({ where: { vehicleId: { in: vehicleIds } } }).catch(() => undefined);
    await prisma.driverVehicleAssignment.deleteMany({ where: { driverId: { in: driverIds } } }).catch(() => undefined);
    await prisma.driver.deleteMany({ where: { id: { in: driverIds } } }).catch(() => undefined);
    await prisma.vehicle.deleteMany({ where: { id: { in: vehicleIds } } }).catch(() => undefined);
    await prisma.$disconnect();
  });

  async function setupDriverAndVehicle() {
    const phone = `+2439${Math.floor(10000000 + Math.random() * 89999999)}`;
    const driver = await drivers.create(DEMO_ORG_ID, { firstName: 'Chauffeur', lastName: randomSuffix(4), phone });
    driverIds.push(driver.id);

    const plate = `TR-${randomSuffix(6).toUpperCase()}`;
    const vehicle = await vehicles.create(DEMO_ORG_ID, { plateNumber: plate });
    vehicleIds.push(vehicle.id);

    await drivers.assignVehicle(DEMO_ORG_ID, driver.id, vehicle.id);
    return { driver, vehicle };
  }

  async function setupStartedMission() {
    const { driver, vehicle } = await setupDriverAndVehicle();
    const location = await prisma.location.create({
      data: {
        organizationId: DEMO_ORG_ID,
        name: 'Décharge',
        type: 'LANDFILL',
        latitude: BASE_LAT,
        longitude: BASE_LNG,
      },
    });
    locationIds.push(location.id);

    const mission = await missions.create(DEMO_ORG_ID, {
      driverId: driver.id,
      vehicleId: vehicle.id,
      steps: [{ locationId: location.id, order: 1, actionType: 'DROPOFF' as any }],
    } as any);
    missionIds.push(mission.id);

    await missions.assign(DEMO_ORG_ID, mission.id, { driverId: driver.id, vehicleId: vehicle.id });
    const started = await missions.start(driver.id, mission.id);
    return { driver, vehicle, mission: started };
  }

  function positionPayload(overrides: Partial<Parameters<TrackingService['ingestSingle']>[2]> = {}) {
    return {
      clientEventId: randomUUID(),
      vehicleId: '',
      latitude: BASE_LAT,
      longitude: BASE_LNG,
      accuracy: 8.5,
      isMocked: false,
      recordedAt: new Date().toISOString(),
      ...overrides,
    } as any;
  }

  it('ingère une position, met à jour VehicleLatestPosition, et est idempotent sur clientEventId dupliqué', async () => {
    const { driver, vehicle } = await setupDriverAndVehicle();
    const dto = positionPayload({ vehicleId: vehicle.id });

    const created = await tracking.ingestSingle(driver.id, DEMO_ORG_ID, dto);
    expect(created.id).toBeDefined();

    const dup = await tracking.ingestSingle(driver.id, DEMO_ORG_ID, dto);
    expect(dup.id).toBe(created.id);

    const count = await prisma.gpsPosition.count({ where: { clientEventId: dto.clientEventId } });
    expect(count).toBe(1);

    const latest = await prisma.vehicleLatestPosition.findUnique({ where: { vehicleId: vehicle.id } });
    expect(latest).not.toBeNull();
    expect(latest!.latitude).toBeCloseTo(BASE_LAT, 5);
  });

  it("rejette une position soumise par un chauffeur non affecté au véhicule (403)", async () => {
    const { vehicle } = await setupDriverAndVehicle();
    const { driver: otherDriver } = await setupDriverAndVehicle();
    const dto = positionPayload({ vehicleId: vehicle.id });

    await expect(tracking.ingestSingle(otherDriver.id, DEMO_ORG_ID, dto)).rejects.toMatchObject({ status: 403 });
  });

  it('traite un lot avec résultats mixtes (créé/doublon/rejeté)', async () => {
    const { driver, vehicle } = await setupDriverAndVehicle();
    const { driver: otherDriver } = await setupDriverAndVehicle();

    const okDto = positionPayload({ vehicleId: vehicle.id, recordedAt: new Date(Date.now() - 60_000).toISOString() });
    const dupDto = { ...okDto };
    const rejectedDto = positionPayload({ vehicleId: vehicle.id, recordedAt: new Date().toISOString() });

    // Pré-insère okDto pour forcer le statut "duplicate" sur la seconde occurrence du batch.
    await tracking.ingestSingle(driver.id, DEMO_ORG_ID, okDto);

    const results = await tracking.ingestBatch(otherDriver.id, DEMO_ORG_ID, [dupDto, rejectedDto]);
    expect(results).toHaveLength(2);

    const dupResult = results.find((r) => r.clientEventId === dupDto.clientEventId);
    expect(dupResult?.status).toBe('duplicate');

    const rejectedResult = results.find((r) => r.clientEventId === rejectedDto.clientEventId);
    expect(rejectedResult?.status).toBe('rejected');
  });

  it('crée une alerte SPEEDING pour un saut de vitesse impossible mais stocke quand même la position', async () => {
    const { driver, vehicle } = await setupDriverAndVehicle();

    const first = positionPayload({
      vehicleId: vehicle.id,
      latitude: BASE_LAT,
      longitude: BASE_LNG,
      recordedAt: new Date(Date.now() - 10_000).toISOString(),
    });
    await tracking.ingestSingle(driver.id, DEMO_ORG_ID, first);

    // ~111km plus loin, 10s plus tard => vitesse implicite ~40 000 km/h, très au-dessus du seuil.
    const jump = positionPayload({
      vehicleId: vehicle.id,
      latitude: BASE_LAT + 1,
      longitude: BASE_LNG,
      recordedAt: new Date().toISOString(),
    });
    const stored = await tracking.ingestSingle(driver.id, DEMO_ORG_ID, jump);
    expect(stored.id).toBeDefined();

    const alert = await prisma.alert.findFirst({ where: { vehicleId: vehicle.id, type: 'SPEEDING' } });
    expect(alert).not.toBeNull();
    expect(alert!.level).toBe('MEDIUM');
    expect(alert!.score).toBe(20); // barème section 15 : +20 saut géographique impossible
    expect(alert!.scoreBreakdown).toEqual([expect.objectContaining({ points: 20 })]);

    const count = await prisma.gpsPosition.count({ where: { vehicleId: vehicle.id } });
    expect(count).toBe(2);
  });

  it('crée une alerte MOCK_GPS avec un score explicable de 40 (barème section 15)', async () => {
    const { driver, vehicle } = await setupDriverAndVehicle();

    const dto = positionPayload({ vehicleId: vehicle.id, isMocked: true });
    await tracking.ingestSingle(driver.id, DEMO_ORG_ID, dto);

    const alert = await prisma.alert.findFirst({ where: { vehicleId: vehicle.id, type: 'MOCK_GPS' } });
    expect(alert).not.toBeNull();
    expect(alert!.level).toBe('LOW');
    expect(alert!.score).toBe(40);
    expect(alert!.scoreBreakdown).toEqual([expect.objectContaining({ points: 40 })]);
  });

  it('précision GPS insuffisante : position quand même stockée, alerte basse sévérité score 10', async () => {
    const { driver, vehicle } = await setupDriverAndVehicle();

    const dto = positionPayload({ vehicleId: vehicle.id, accuracy: 500 }); // > MAX_GPS_ACCURACY_METERS (100 par défaut)
    const stored = await tracking.ingestSingle(driver.id, DEMO_ORG_ID, dto);
    expect(stored.id).toBeDefined();

    const alert = await prisma.alert.findFirst({ where: { vehicleId: vehicle.id, type: 'OTHER' } });
    expect(alert).not.toBeNull();
    expect(alert!.level).toBe('LOW');
    expect(alert!.score).toBe(10);
  });

  it('GET vehicles/live dérive correctement le statut (STOPPED récent vs OFFLINE ancien)', async () => {
    const { driver: driverA, vehicle: vehicleA } = await setupDriverAndVehicle();
    const { vehicle: vehicleB } = await setupDriverAndVehicle();

    await tracking.ingestSingle(driverA.id, DEMO_ORG_ID, positionPayload({ vehicleId: vehicleA.id, speed: 0 }));
    // vehicleB : aucune position connue => doit apparaître OFFLINE.

    const live = await tracking.liveVehicles(DEMO_ORG_ID);
    const entryA = live.find((v) => v.vehicleId === vehicleA.id);
    const entryB = live.find((v) => v.vehicleId === vehicleB.id);

    expect(entryA?.status).toBe('STOPPED');
    expect(entryB?.status).toBe('OFFLINE');
  });

  it('GET vehicles/:id/trace renvoie un GeoJSON LineString ordonné chronologiquement, coordonnées [lng, lat]', async () => {
    const { driver, vehicle } = await setupDriverAndVehicle();

    const p1 = positionPayload({
      vehicleId: vehicle.id,
      latitude: BASE_LAT,
      longitude: BASE_LNG,
      recordedAt: new Date(Date.now() - 20_000).toISOString(),
    });
    const p2 = positionPayload({
      vehicleId: vehicle.id,
      latitude: BASE_LAT + 0.001,
      longitude: BASE_LNG + 0.001,
      recordedAt: new Date(Date.now() - 10_000).toISOString(),
    });
    await tracking.ingestSingle(driver.id, DEMO_ORG_ID, p1);
    await tracking.ingestSingle(driver.id, DEMO_ORG_ID, p2);

    const trace = await tracking.vehicleTrace(DEMO_ORG_ID, vehicle.id, {} as any);
    expect(trace.type).toBe('Feature');
    expect(trace.geometry.type).toBe('LineString');
    expect(trace.geometry.coordinates.length).toBeGreaterThanOrEqual(2);
    expect(trace.geometry.coordinates[0][0]).toBeCloseTo(BASE_LNG, 5);
    expect(trace.geometry.coordinates[0][1]).toBeCloseTo(BASE_LAT, 5);
    expect(trace.geometry.coordinates[1][0]).toBeCloseTo(BASE_LNG + 0.001, 5);
    expect(trace.geometry.coordinates[1][1]).toBeCloseTo(BASE_LAT + 0.001, 5);
  });

  it('accepte une position GPS associée à une mission active (STARTED) avec missionId', async () => {
    const { driver, vehicle, mission } = await setupStartedMission();

    const dto = positionPayload({ vehicleId: vehicle.id, missionId: mission.id });
    const stored = await tracking.ingestSingle(driver.id, DEMO_ORG_ID, dto);

    expect(stored.missionId).toBe(mission.id);
    const row = await prisma.gpsPosition.findUnique({ where: { clientEventId: dto.clientEventId } });
    expect(row!.missionId).toBe(mission.id);
  });

  it('rejette une position GPS avec missionId quand la mission n\'est pas active (ex: ASSIGNED)', async () => {
    const { driver, vehicle } = await setupDriverAndVehicle();
    const location = await prisma.location.create({
      data: {
        organizationId: DEMO_ORG_ID,
        name: 'Décharge',
        type: 'LANDFILL',
        latitude: BASE_LAT,
        longitude: BASE_LNG,
      },
    });
    locationIds.push(location.id);

    const mission = await missions.create(DEMO_ORG_ID, {
      driverId: driver.id,
      vehicleId: vehicle.id,
      steps: [{ locationId: location.id, order: 1, actionType: 'DROPOFF' as any }],
    } as any);
    missionIds.push(mission.id);
    await missions.assign(DEMO_ORG_ID, mission.id, { driverId: driver.id, vehicleId: vehicle.id });
    // statut = ASSIGNED, pas encore STARTED/IN_PROGRESS

    const dto = positionPayload({ vehicleId: vehicle.id, missionId: mission.id });
    await expect(tracking.ingestSingle(driver.id, DEMO_ORG_ID, dto)).rejects.toMatchObject({ status: 403 });
  });

  it('rejette une position GPS avec missionId d\'une mission d\'un autre véhicule', async () => {
    const { driver, vehicle } = await setupStartedMission();
    const { vehicle: otherVehicle } = await setupDriverAndVehicle();
    const otherDriver = await prisma.driver.findFirst({ where: { id: driverIds[driverIds.length - 1] } });

    const dto = positionPayload({ vehicleId: otherVehicle.id, missionId: '00000000-0000-0000-0000-000000000000' });
    await expect(tracking.ingestSingle(driver.id, DEMO_ORG_ID, dto)).rejects.toMatchObject({ status: 403 });
  });

  it('GET missions/:id/trace renvoie métadonnées + positions + GeoJSON (ordre chronologique)', async () => {
    const { driver, vehicle, mission } = await setupStartedMission();

    const p1 = positionPayload({
      vehicleId: vehicle.id,
      missionId: mission.id,
      latitude: BASE_LAT,
      longitude: BASE_LNG,
      recordedAt: new Date(Date.now() - 30_000).toISOString(),
    });
    const p2 = positionPayload({
      vehicleId: vehicle.id,
      missionId: mission.id,
      latitude: BASE_LAT + 0.001,
      longitude: BASE_LNG + 0.001,
      recordedAt: new Date(Date.now() - 15_000).toISOString(),
    });
    await tracking.ingestSingle(driver.id, DEMO_ORG_ID, p1);
    await tracking.ingestSingle(driver.id, DEMO_ORG_ID, p2);

    const trace = await tracking.missionTrace(DEMO_ORG_ID, mission.id);
    expect(trace.missionId).toBe(mission.id);
    expect(trace.vehicleId).toBe(vehicle.id);
    expect(trace.driverId).toBe(driver.id);
    expect(trace.status).toBe('STARTED');
    expect(trace.startedAt).not.toBeNull();
    expect(trace.lastPositionAt).not.toBeNull();
    expect(trace.totalPoints).toBe(2);
    expect(trace.totalDistanceMeters).toBeGreaterThan(0);
    expect(trace.positions).toHaveLength(2);
    expect(trace.positions[0].latitude).toBeCloseTo(BASE_LAT, 5);
    expect(trace.positions[0].recordedAt < trace.positions[1].recordedAt).toBe(true);
    expect(trace.geojson.type).toBe('Feature');
    expect(trace.geojson.geometry.coordinates[0]).toEqual([BASE_LNG, BASE_LAT]);
  });

  it("isole les traces par organisation (404 si la mission n'appartient pas à l'org)", async () => {
    const { driver, vehicle, mission } = await setupStartedMission();
    const otherOrgId = '00000000-0000-0000-0000-000000000099';

    await expect(tracking.missionTrace(otherOrgId, mission.id)).rejects.toMatchObject({ status: 404 });
  });

  it('GET vehicles/live inclut activeMissionId quand le véhicule porte une mission active', async () => {
    const { driver, vehicle, mission } = await setupStartedMission();

    await tracking.ingestSingle(driver.id, DEMO_ORG_ID, positionPayload({ vehicleId: vehicle.id, missionId: mission.id }));

    const live = await tracking.liveVehicles(DEMO_ORG_ID);
    const entry = live.find((v) => v.vehicleId === vehicle.id);
    expect(entry?.activeMissionId).toBe(mission.id);
    expect(entry?.status).toBe('ON_MISSION');
  });
});

describe('TrackingGateway (WebSocket, instance HTTP réelle)', () => {
  let app: INestApplication;
  let tracking: TrackingService;
  let drivers: DriversService;
  let vehicles: VehiclesService;
  let prisma: PrismaService;
  let jwt: JwtService;
  let port: number;

  const driverIds: string[] = [];
  const vehicleIds: string[] = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, DriversModule, VehiclesModule, TrackingModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    await app.listen(0);
    const address = app.getHttpServer().address();
    port = typeof address === 'object' && address ? address.port : 0;

    tracking = moduleRef.get(TrackingService);
    drivers = moduleRef.get(DriversService);
    vehicles = moduleRef.get(VehiclesService);
    prisma = moduleRef.get(PrismaService);
    jwt = moduleRef.get(JwtService);
  }, 30_000);

  afterAll(async () => {
    await prisma.gpsPosition.deleteMany({ where: { vehicleId: { in: vehicleIds } } }).catch(() => undefined);
    await prisma.vehicleLatestPosition.deleteMany({ where: { vehicleId: { in: vehicleIds } } }).catch(() => undefined);
    await prisma.driverVehicleAssignment.deleteMany({ where: { driverId: { in: driverIds } } }).catch(() => undefined);
    await prisma.driver.deleteMany({ where: { id: { in: driverIds } } }).catch(() => undefined);
    await prisma.vehicle.deleteMany({ where: { id: { in: vehicleIds } } }).catch(() => undefined);
    await app.close();
  });

  it("un client abonné à la room vehicle:{id} reçoit vehicle.position.updated à l'ingestion", async () => {
    const phone = `+2439${Math.floor(10000000 + Math.random() * 89999999)}`;
    const driver = await drivers.create(DEMO_ORG_ID, { firstName: 'Chauffeur', lastName: randomSuffix(4), phone });
    driverIds.push(driver.id);
    const vehicle = await vehicles.create(DEMO_ORG_ID, { plateNumber: `WS-${randomSuffix(6).toUpperCase()}` });
    vehicleIds.push(vehicle.id);
    await drivers.assignVehicle(DEMO_ORG_ID, driver.id, vehicle.id);

    const token = await jwt.signAsync(
      { sub: 'admin-test', type: 'user', role: 'ADMIN', organizationId: DEMO_ORG_ID },
      { secret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret' },
    );

    const client: Socket = io(`http://localhost:${port}/tracking`, {
      auth: { token },
      transports: ['websocket'],
      forceNew: true,
    });

    await new Promise<void>((resolve, reject) => {
      client.on('connect', resolve);
      client.on('connect_error', reject);
    });

    client.emit('subscribe', { room: `vehicle:${vehicle.id}` });
    await new Promise((r) => setTimeout(r, 200));

    const eventPromise = new Promise<any>((resolve) => {
      client.on('vehicle.position.updated', resolve);
    });

    await tracking.ingestSingle(driver.id, DEMO_ORG_ID, {
      clientEventId: randomUUID(),
      vehicleId: vehicle.id,
      latitude: BASE_LAT,
      longitude: BASE_LNG,
      accuracy: 8.5,
      isMocked: false,
      recordedAt: new Date().toISOString(),
    } as any);

    const payload = await eventPromise;
    expect(payload.vehicleId).toBe(vehicle.id);

    client.close();
  }, 15_000);
});
