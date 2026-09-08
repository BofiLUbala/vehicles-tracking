import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { HttpStatus } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { MissionStepsModule } from './mission-steps.module';
import { MissionStepsService } from './mission-steps.service';
import { MissionsModule } from '../missions/missions.module';
import { MissionsService } from '../missions/missions.service';
import { DriversModule } from '../drivers/drivers.module';
import { DriversService } from '../drivers/drivers.service';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { VehiclesService } from '../vehicles/vehicles.service';
import { LocationsModule } from '../locations/locations.module';
import { LocationsService } from '../locations/locations.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { MissionStepActionType } from '@prisma/client';

const DEMO_ORG_ID = '00000000-0000-0000-0000-000000000001';
const BASE_LAT = -4.325;
const BASE_LNG = 15.322;

function randomSuffix(len = 8) {
  return Math.random().toString(36).slice(2, 2 + len);
}

function fakePhoto(): Express.Multer.File {
  const buffer = Buffer.from('fake-jpeg-bytes-for-tests');
  return {
    fieldname: 'photo',
    originalname: 'photo.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    size: buffer.length,
    buffer,
    stream: undefined as any,
    destination: '',
    filename: '',
    path: '',
  } as Express.Multer.File;
}

describe('MissionStepsService (intégration DB + MinIO réels)', () => {
  let missionSteps: MissionStepsService;
  let missions: MissionsService;
  let drivers: DriversService;
  let vehicles: VehiclesService;
  let locations: LocationsService;
  let prisma: PrismaService;

  const missionIds: string[] = [];
  const driverIds: string[] = [];
  const vehicleIds: string[] = [];
  const locationIds: string[] = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        DriversModule,
        VehiclesModule,
        LocationsModule,
        MissionsModule,
        MissionStepsModule,
      ],
    }).compile();
    // Déclenche OnModuleInit (création idempotente du bucket S3/MinIO) — non appelé par .compile() seul.
    await moduleRef.init();

    missionSteps = moduleRef.get(MissionStepsService);
    missions = moduleRef.get(MissionsService);
    drivers = moduleRef.get(DriversService);
    vehicles = moduleRef.get(VehiclesService);
    locations = moduleRef.get(LocationsService);
    prisma = moduleRef.get(PrismaService);
  }, 30_000);

  afterAll(async () => {
    await prisma.alert.deleteMany({ where: { missionId: { in: missionIds } } }).catch(() => undefined);
    await prisma.missionStepValidation.deleteMany({ where: { missionStep: { missionId: { in: missionIds } } } }).catch(() => undefined);
    await prisma.missionEvent.deleteMany({ where: { missionId: { in: missionIds } } }).catch(() => undefined);
    await prisma.missionStep.deleteMany({ where: { missionId: { in: missionIds } } }).catch(() => undefined);
    await prisma.mission.deleteMany({ where: { id: { in: missionIds } } }).catch(() => undefined);
    await prisma.driverVehicleAssignment.deleteMany({ where: { driverId: { in: driverIds } } }).catch(() => undefined);
    await prisma.locationQrCode.deleteMany({ where: { locationId: { in: locationIds } } }).catch(() => undefined);
    await prisma.location.deleteMany({ where: { id: { in: locationIds } } }).catch(() => undefined);
    await prisma.driver.deleteMany({ where: { id: { in: driverIds } } }).catch(() => undefined);
    await prisma.vehicle.deleteMany({ where: { id: { in: vehicleIds } } }).catch(() => undefined);
    await prisma.$disconnect();
  });

  /** Crée chauffeur + véhicule (assignés l'un à l'autre) + N lieux + une mission STARTED avec N étapes. */
  async function setupStartedMission(
    stepsSpec: Array<{ actionType?: MissionStepActionType; toleranceMin?: number; plannedAtOffsetMin?: number; allowedRadius?: number }>,
  ) {
    const phone = `+2439${Math.floor(10000000 + Math.random() * 89999999)}`;
    const driver = await drivers.create(DEMO_ORG_ID, { firstName: 'Chauffeur', lastName: randomSuffix(4), phone });
    driverIds.push(driver.id);

    const plate = `MS-${randomSuffix(6).toUpperCase()}`;
    const vehicle = await vehicles.create(DEMO_ORG_ID, { plateNumber: plate });
    vehicleIds.push(vehicle.id);

    await drivers.assignVehicle(DEMO_ORG_ID, driver.id, vehicle.id);

    const stepLocations: Array<{ id: string; latitude: number; longitude: number }> = [];
    for (let i = 0; i < stepsSpec.length; i++) {
      const loc = await locations.create(DEMO_ORG_ID, {
        name: `Lieu test ${randomSuffix(4)}`,
        type: 'DROPOFF' as any,
        latitude: BASE_LAT + i * 0.01,
        longitude: BASE_LNG + i * 0.01,
        allowedRadius: stepsSpec[i].allowedRadius ?? 50,
      });
      locationIds.push(loc.id);
      stepLocations.push(loc);
    }

    const mission = await missions.create(DEMO_ORG_ID, {
      driverId: driver.id,
      vehicleId: vehicle.id,
      steps: stepsSpec.map((s, i) => ({
        locationId: stepLocations[i].id,
        order: i + 1,
        actionType: s.actionType ?? MissionStepActionType.DROPOFF,
        plannedAt: new Date(Date.now() + (s.plannedAtOffsetMin ?? 0) * 60_000).toISOString(),
        toleranceMin: s.toleranceMin ?? 60,
      })),
    } as any);
    missionIds.push(mission.id);

    await missions.assign(DEMO_ORG_ID, mission.id, { driverId: driver.id, vehicleId: vehicle.id });
    await missions.start(driver.id, mission.id);

    const full = await prisma.mission.findUnique({ where: { id: mission.id }, include: { steps: { orderBy: { order: 'asc' } } } });

    return { driver, vehicle, mission: full!, locations: stepLocations };
  }

  it('parcours complet : crée, affecte, démarre, valide toutes les étapes puis complète la mission (COMPLETED)', async () => {
    const { driver, mission, locations: locs } = await setupStartedMission([{}, {}]);

    for (let i = 0; i < mission.steps.length; i++) {
      const step = mission.steps[i];
      const loc = locs[i];
      const { token } = await locations.generateQr(DEMO_ORG_ID, loc.id);
      const validation = await missionSteps.validate(
        driver.id,
        step.id,
        {
          clientEventId: randomUUID(),
          qrToken: token,
          latitude: loc.latitude,
          longitude: loc.longitude,
          accuracy: 8.5,
          isMocked: false,
          recordedAt: new Date().toISOString(),
        },
        fakePhoto(),
      );
      expect(validation.id).toBeDefined();
    }

    const updatedStep = await prisma.missionStep.findUnique({ where: { id: mission.steps[0].id } });
    expect(updatedStep!.status).toBe('VALIDATED');

    const completed = await missions.complete({ sub: driver.id, type: 'driver' }, mission.id);
    expect(completed.status).toBe('COMPLETED');
    expect(completed.actualEnd).not.toBeNull();
  });

  it('rejette un QR code incorrect (INVALID_QR)', async () => {
    const { driver, mission, locations: locs } = await setupStartedMission([{}]);
    const step = mission.steps[0];
    const loc = locs[0];

    await expect(
      missionSteps.validate(
        driver.id,
        step.id,
        {
          clientEventId: randomUUID(),
          qrToken: 'totally.invalid.token',
          latitude: loc.latitude,
          longitude: loc.longitude,
          accuracy: 8.5,
          isMocked: false,
          recordedAt: new Date().toISOString(),
        },
        fakePhoto(),
      ),
    ).rejects.toMatchObject({ errorCode: 'INVALID_QR' });
  });

  it('rejette une position hors de la zone autorisée (OUT_OF_RANGE)', async () => {
    const { driver, mission, locations: locs } = await setupStartedMission([{ allowedRadius: 50 }]);
    const step = mission.steps[0];
    const loc = locs[0];
    const { token } = await locations.generateQr(DEMO_ORG_ID, loc.id);

    await expect(
      missionSteps.validate(
        driver.id,
        step.id,
        {
          clientEventId: randomUUID(),
          qrToken: token,
          latitude: loc.latitude + 1, // ~111km plus loin
          longitude: loc.longitude,
          accuracy: 8.5,
          isMocked: false,
          recordedAt: new Date().toISOString(),
        },
        fakePhoto(),
      ),
    ).rejects.toMatchObject({ errorCode: 'OUT_OF_RANGE' });
  });

  it('rejette une validation sans photo (MISSING_PHOTO)', async () => {
    const { driver, mission, locations: locs } = await setupStartedMission([{}]);
    const step = mission.steps[0];
    const loc = locs[0];
    const { token } = await locations.generateQr(DEMO_ORG_ID, loc.id);

    await expect(
      missionSteps.validate(
        driver.id,
        step.id,
        {
          clientEventId: randomUUID(),
          qrToken: token,
          latitude: loc.latitude,
          longitude: loc.longitude,
          accuracy: 8.5,
          isMocked: false,
          recordedAt: new Date().toISOString(),
        },
        undefined,
      ),
    ).rejects.toMatchObject({ errorCode: 'MISSING_PHOTO' });
  });

  it('un clientEventId déjà utilisé renvoie la validation existante (idempotence, pas de doublon)', async () => {
    const { driver, mission, locations: locs } = await setupStartedMission([{}]);
    const step = mission.steps[0];
    const loc = locs[0];
    const { token } = await locations.generateQr(DEMO_ORG_ID, loc.id);
    const clientEventId = randomUUID();
    const payload = {
      clientEventId,
      qrToken: token,
      latitude: loc.latitude,
      longitude: loc.longitude,
      accuracy: 8.5,
      isMocked: false,
      recordedAt: new Date().toISOString(),
    };

    const first = await missionSteps.validate(driver.id, step.id, payload, fakePhoto());
    const second = await missionSteps.validate(driver.id, step.id, payload, fakePhoto());

    expect(second.id).toBe(first.id);
    const count = await prisma.missionStepValidation.count({ where: { clientEventId } });
    expect(count).toBe(1);
  });

  it("refuse la validation par un chauffeur qui n'est pas affecté à la mission (403)", async () => {
    const { mission, locations: locs } = await setupStartedMission([{}]);
    const step = mission.steps[0];
    const loc = locs[0];
    const { token } = await locations.generateQr(DEMO_ORG_ID, loc.id);

    const otherPhone = `+2438${Math.floor(10000000 + Math.random() * 89999999)}`;
    const otherDriver = await drivers.create(DEMO_ORG_ID, { firstName: 'Autre', lastName: 'Chauffeur', phone: otherPhone });
    driverIds.push(otherDriver.id);

    await expect(
      missionSteps.validate(
        otherDriver.id,
        step.id,
        {
          clientEventId: randomUUID(),
          qrToken: token,
          latitude: loc.latitude,
          longitude: loc.longitude,
          accuracy: 8.5,
          isMocked: false,
          recordedAt: new Date().toISOString(),
        },
        fakePhoto(),
      ),
    ).rejects.toMatchObject({ errorCode: 'WRONG_DRIVER' });

    await expect(
      missionSteps.validate(
        otherDriver.id,
        step.id,
        {
          clientEventId: randomUUID(),
          qrToken: token,
          latitude: loc.latitude,
          longitude: loc.longitude,
          accuracy: 8.5,
          isMocked: false,
          recordedAt: new Date().toISOString(),
        },
        fakePhoto(),
      ),
    ).rejects.toMatchObject({ status: HttpStatus.FORBIDDEN });
  });

  it('rejette une étape validée hors ordre (WRONG_STEP_ORDER)', async () => {
    const { driver, mission, locations: locs } = await setupStartedMission([{}, {}]);
    const step2 = mission.steps[1];
    const loc2 = locs[1];
    const { token } = await locations.generateQr(DEMO_ORG_ID, loc2.id);

    await expect(
      missionSteps.validate(
        driver.id,
        step2.id,
        {
          clientEventId: randomUUID(),
          qrToken: token,
          latitude: loc2.latitude,
          longitude: loc2.longitude,
          accuracy: 8.5,
          isMocked: false,
          recordedAt: new Date().toISOString(),
        },
        fakePhoto(),
      ),
    ).rejects.toMatchObject({ errorCode: 'WRONG_STEP_ORDER' });
  });

  it('rejette une précision GPS insuffisante (LOW_GPS_ACCURACY)', async () => {
    const { driver, mission, locations: locs } = await setupStartedMission([{}]);
    const step = mission.steps[0];
    const loc = locs[0];
    const { token } = await locations.generateQr(DEMO_ORG_ID, loc.id);

    await expect(
      missionSteps.validate(
        driver.id,
        step.id,
        {
          clientEventId: randomUUID(),
          qrToken: token,
          latitude: loc.latitude,
          longitude: loc.longitude,
          accuracy: 150, // > MAX_GPS_ACCURACY_METERS (100 par défaut)
          isMocked: false,
          recordedAt: new Date().toISOString(),
        },
        fakePhoto(),
      ),
    ).rejects.toMatchObject({ errorCode: 'LOW_GPS_ACCURACY' });
  });

  it('rejette une validation hors fenêtre temporelle (WINDOW_EXPIRED)', async () => {
    const { driver, mission, locations: locs } = await setupStartedMission([{ plannedAtOffsetMin: -600, toleranceMin: 10 }]);
    const step = mission.steps[0];
    const loc = locs[0];
    const { token } = await locations.generateQr(DEMO_ORG_ID, loc.id);

    await expect(
      missionSteps.validate(
        driver.id,
        step.id,
        {
          clientEventId: randomUUID(),
          qrToken: token,
          latitude: loc.latitude,
          longitude: loc.longitude,
          accuracy: 8.5,
          isMocked: false,
          recordedAt: new Date().toISOString(),
        },
        fakePhoto(),
      ),
    ).rejects.toMatchObject({ errorCode: 'WINDOW_EXPIRED' });
  });

  it('accepte une validation avec isMocked=true mais crée une alerte MOCK_GPS de sévérité LOW', async () => {
    const { driver, mission, locations: locs } = await setupStartedMission([{}]);
    const step = mission.steps[0];
    const loc = locs[0];
    const { token } = await locations.generateQr(DEMO_ORG_ID, loc.id);

    const validation = await missionSteps.validate(
      driver.id,
      step.id,
      {
        clientEventId: randomUUID(),
        qrToken: token,
        latitude: loc.latitude,
        longitude: loc.longitude,
        accuracy: 8.5,
        isMocked: true,
        recordedAt: new Date().toISOString(),
      },
      fakePhoto(),
    );
    expect(validation.id).toBeDefined();

    const alert = await prisma.alert.findFirst({ where: { missionId: mission.id, type: 'MOCK_GPS' } });
    expect(alert).not.toBeNull();
    expect(alert!.level).toBe('LOW');
  });

  it('GET evidence renvoie la validation + une URL signée de la photo', async () => {
    const { driver, mission, locations: locs } = await setupStartedMission([{}]);
    const step = mission.steps[0];
    const loc = locs[0];
    const { token } = await locations.generateQr(DEMO_ORG_ID, loc.id);

    await missionSteps.validate(
      driver.id,
      step.id,
      {
        clientEventId: randomUUID(),
        qrToken: token,
        latitude: loc.latitude,
        longitude: loc.longitude,
        accuracy: 8.5,
        isMocked: false,
        recordedAt: new Date().toISOString(),
      },
      fakePhoto(),
    );

    const evidence = await missionSteps.getEvidence({ sub: driver.id, type: 'driver' } as any, step.id);
    expect(evidence.validation).toBeDefined();
    expect(evidence.photo?.url).toContain('http');
  });
});
