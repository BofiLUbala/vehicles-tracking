import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { MissionStatus } from '@prisma/client';
import { MissionsModule } from './missions.module';
import { MissionsService } from './missions.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';

const DEMO_ORG_ID = '00000000-0000-0000-0000-000000000001';

describe('MissionsService (intégration DB réelle)', () => {
  let missions: MissionsService;
  let prisma: PrismaService;
  let moduleRef: any;

  let driverId: string;
  let otherDriverId: string;
  let vehicleId: string;
  let locationId: string;
  const missionIds: string[] = [];

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, MissionsModule],
    }).compile();
    missions = moduleRef.get(MissionsService);
    prisma = moduleRef.get(PrismaService);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  beforeEach(async () => {
    const phone = `+2431${Math.floor(10000000 + Math.random() * 89999999)}`;
    const driver = await prisma.driver.create({ data: { organizationId: DEMO_ORG_ID, firstName: 'Chauffeur', lastName: 'Un', phone } });
    driverId = driver.id;

    const otherPhone = `+2432${Math.floor(10000000 + Math.random() * 89999999)}`;
    const otherDriver = await prisma.driver.create({ data: { organizationId: DEMO_ORG_ID, firstName: 'Chauffeur', lastName: 'Deux', phone: otherPhone } });
    otherDriverId = otherDriver.id;

    const plate = `MIS-${Math.floor(1000 + Math.random() * 8999)}`;
    const vehicle = await prisma.vehicle.create({ data: { organizationId: DEMO_ORG_ID, plateNumber: plate } });
    vehicleId = vehicle.id;

    const location = await prisma.location.create({
      data: { organizationId: DEMO_ORG_ID, name: 'Décharge Test', type: 'LANDFILL', latitude: -4.4, longitude: 15.3 },
    });
    locationId = location.id;
  });

  afterEach(async () => {
    for (const id of missionIds.splice(0)) {
      await prisma.alert.deleteMany({ where: { missionId: id } });
      await prisma.missionStepValidation.deleteMany({ where: { missionStep: { missionId: id } } });
      await prisma.missionEvent.deleteMany({ where: { missionId: id } });
      await prisma.missionStep.deleteMany({ where: { missionId: id } });
      await prisma.auditLog.deleteMany({ where: { entity: 'Mission', entityId: id } });
      await prisma.mission.delete({ where: { id } }).catch(() => undefined);
    }
    await prisma.location.delete({ where: { id: locationId } }).catch(() => undefined);
    await prisma.vehicle.delete({ where: { id: vehicleId } }).catch(() => undefined);
    await prisma.driver.delete({ where: { id: driverId } }).catch(() => undefined);
    await prisma.driver.delete({ where: { id: otherDriverId } }).catch(() => undefined);
  });

  async function createMission() {
    const mission = await missions.create(DEMO_ORG_ID, {
      driverId,
      vehicleId,
      steps: [
        { locationId, order: 1, actionType: 'DROPOFF' as any },
        { locationId, order: 2, actionType: 'WEIGH' as any },
      ],
    } as any);
    missionIds.push(mission.id);
    return mission;
  }

  it('parcours complet : create -> assign -> start -> complete (toutes étapes validées) -> COMPLETED', async () => {
    const mission = await createMission();
    expect(mission.status).toBe(MissionStatus.PLANNED);
    expect(mission.steps).toHaveLength(2);

    const assigned = await missions.assign(DEMO_ORG_ID, mission.id, { driverId, vehicleId });
    expect(assigned.status).toBe(MissionStatus.ASSIGNED);

    const started = await missions.start(driverId, mission.id);
    expect(started.status).toBe(MissionStatus.STARTED);
    expect(started.actualStart).toBeDefined();

    // Valide manuellement les étapes en base (le test de mission-steps.spec.ts couvre le service
    // de validation lui-même) pour vérifier la règle de complétion de MissionsService.complete().
    await prisma.missionStep.updateMany({ where: { missionId: mission.id }, data: { status: 'VALIDATED' } });

    const completed = await missions.complete({ sub: driverId, type: 'driver' }, mission.id);
    expect(completed.status).toBe(MissionStatus.COMPLETED);
    expect(completed.actualEnd).toBeDefined();

    const events = await prisma.missionEvent.findMany({ where: { missionId: mission.id }, orderBy: { createdAt: 'asc' } });
    const eventTypes = events.map((e) => e.type);
    expect(eventTypes).toEqual(expect.arrayContaining(['mission.created', 'mission.assigned', 'mission.started', 'mission.completed']));
  });

  it('complete() avec des étapes non validées -> NOT_COMPLETED (complétion partielle tracée)', async () => {
    const mission = await createMission();
    await missions.assign(DEMO_ORG_ID, mission.id, { driverId, vehicleId });
    await missions.start(driverId, mission.id);

    const result = await missions.complete({ sub: driverId, type: 'driver' }, mission.id);
    expect(result.status).toBe(MissionStatus.NOT_COMPLETED);

    const events = await prisma.missionEvent.findMany({ where: { missionId: mission.id, type: 'mission.not_completed' } });
    expect(events).toHaveLength(1);
  });

  it("refuse d'affecter un chauffeur déjà engagé sur une autre mission active (409)", async () => {
    const missionA = await createMission();
    await missions.assign(DEMO_ORG_ID, missionA.id, { driverId, vehicleId });

    const missionB = await missions.create(DEMO_ORG_ID, {
      driverId: otherDriverId,
      vehicleId,
      steps: [{ locationId, order: 1, actionType: 'DROPOFF' as any }],
    } as any);
    missionIds.push(missionB.id);

    await expect(missions.assign(DEMO_ORG_ID, missionB.id, { driverId, vehicleId })).rejects.toThrow(ConflictException);
  });

  it("refuse qu'un chauffeur non affecté démarre la mission d'un autre (403)", async () => {
    const mission = await createMission();
    await missions.assign(DEMO_ORG_ID, mission.id, { driverId, vehicleId });
    await expect(missions.start(otherDriverId, mission.id)).rejects.toThrow(ForbiddenException);
  });

  it("refuse qu'un chauffeur non affecté consulte la mission d'un autre en mode mobile (403)", async () => {
    const mission = await createMission();
    await missions.assign(DEMO_ORG_ID, mission.id, { driverId, vehicleId });
    await expect(missions.findOneForDriver(otherDriverId, mission.id)).rejects.toThrow(ForbiddenException);
    const own = await missions.findOneForDriver(driverId, mission.id);
    expect(own.id).toBe(mission.id);
  });

  it('cancel() journalise MissionEvent + AuditLog avec la raison', async () => {
    const mission = await createMission();
    const cancelled = await missions.cancel(DEMO_ORG_ID, mission.id, 'Client a annulé la collecte', undefined);
    expect(cancelled.status).toBe(MissionStatus.CANCELLED);

    const auditLogs = await prisma.auditLog.findMany({ where: { entity: 'Mission', entityId: mission.id, action: 'mission.cancel' } });
    expect(auditLogs).toHaveLength(1);
    expect((auditLogs[0].metadata as any).reason).toBe('Client a annulé la collecte');
  });

  it('todayForDriver() retourne les missions du chauffeur planifiées aujourd\'hui (UTC)', async () => {
    const now = new Date();
    const mission = await missions.create(DEMO_ORG_ID, {
      driverId,
      vehicleId,
      plannedStart: now.toISOString(),
      steps: [{ locationId, order: 1, actionType: 'DROPOFF' as any }],
    } as any);
    missionIds.push(mission.id);

    const today = await missions.todayForDriver(driverId);
    expect(today.some((m) => m.id === mission.id)).toBe(true);
  });
});
