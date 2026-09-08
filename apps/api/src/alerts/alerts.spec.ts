import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { RoleName } from '@prisma/client';
import { AlertsModule } from './alerts.module';
import { AlertsService } from './alerts.service';
import { DriversModule } from '../drivers/drivers.module';
import { DriversService } from '../drivers/drivers.service';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { VehiclesService } from '../vehicles/vehicles.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';

const DEMO_ORG_ID = '00000000-0000-0000-0000-000000000001';

function randomSuffix(len = 8) {
  return Math.random().toString(36).slice(2, 2 + len);
}

describe('AlertsService (intégration DB réelle)', () => {
  let alerts: AlertsService;
  let drivers: DriversService;
  let vehicles: VehiclesService;
  let prisma: PrismaService;

  const driverIds: string[] = [];
  const vehicleIds: string[] = [];
  const alertIds: string[] = [];
  const userIds: string[] = [];
  let adminUserId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, DriversModule, VehiclesModule, AlertsModule],
    }).compile();
    await moduleRef.init();

    alerts = moduleRef.get(AlertsService);
    drivers = moduleRef.get(DriversService);
    vehicles = moduleRef.get(VehiclesService);
    prisma = moduleRef.get(PrismaService);

    // Un utilisateur ADMIN réel est nécessaire ici uniquement comme `actorId` d'AuditLog (contrainte
    // de clé étrangère User) — UsersService n'expose pas de création (bootstrap lecture seule, voir
    // users.service.ts), donc création directe via Prisma, réutilisant le rôle ADMIN semé par seed.ts.
    const adminRole = await prisma.role.upsert({
      where: { name: RoleName.ADMIN },
      update: {},
      create: { name: RoleName.ADMIN },
    });
    const admin = await prisma.user.create({
      data: {
        organizationId: DEMO_ORG_ID,
        email: `alerts-test-${randomSuffix(8)}@demo.local`,
        passwordHash: 'not-a-real-hash-test-only',
        firstName: 'Admin',
        lastName: 'Test',
        roleId: adminRole.id,
      },
    });
    adminUserId = admin.id;
    userIds.push(admin.id);
  }, 30_000);

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { entityId: { in: alertIds } } }).catch(() => undefined);
    await prisma.alert.deleteMany({ where: { id: { in: alertIds } } }).catch(() => undefined);
    await prisma.driverVehicleAssignment.deleteMany({ where: { driverId: { in: driverIds } } }).catch(() => undefined);
    await prisma.driver.deleteMany({ where: { id: { in: driverIds } } }).catch(() => undefined);
    await prisma.vehicle.deleteMany({ where: { id: { in: vehicleIds } } }).catch(() => undefined);
    await prisma.user.deleteMany({ where: { id: { in: userIds } } }).catch(() => undefined);
    await prisma.$disconnect();
  });

  async function setupVehicleAndAlert(overrides: Partial<{ type: string; level: string; status: string }> = {}) {
    const plate = `AL-${randomSuffix(6).toUpperCase()}`;
    const vehicle = await vehicles.create(DEMO_ORG_ID, { plateNumber: plate });
    vehicleIds.push(vehicle.id);

    const alert = await prisma.alert.create({
      data: {
        type: (overrides.type as any) ?? 'SPEEDING',
        level: (overrides.level as any) ?? 'MEDIUM',
        status: (overrides.status as any) ?? 'NEW',
        vehicleId: vehicle.id,
      },
    });
    alertIds.push(alert.id);
    return { vehicle, alert };
  }

  it('GET /alerts liste et filtre par type/niveau/statut/véhicule, org-scopé', async () => {
    const { vehicle, alert } = await setupVehicleAndAlert({ type: 'SPEEDING', level: 'MEDIUM' });
    await setupVehicleAndAlert({ type: 'MOCK_GPS', level: 'LOW' });

    const all = await alerts.findAll(DEMO_ORG_ID, {} as any);
    expect(all.some((a) => a.id === alert.id)).toBe(true);

    const byType = await alerts.findAll(DEMO_ORG_ID, { type: 'SPEEDING' } as any);
    expect(byType.every((a) => a.type === 'SPEEDING')).toBe(true);

    const byVehicle = await alerts.findAll(DEMO_ORG_ID, { vehicleId: vehicle.id } as any);
    expect(byVehicle).toHaveLength(1);
    expect(byVehicle[0].id).toBe(alert.id);
  });

  it('GET /alerts/:id renvoie une alerte', async () => {
    const { alert } = await setupVehicleAndAlert();
    const found = await alerts.findOne(DEMO_ORG_ID, alert.id);
    expect(found.id).toBe(alert.id);
  });

  it('PATCH transition légale NEW -> ACKNOWLEDGED -> RESOLVED, journalisée dans AuditLog', async () => {
    const { alert } = await setupVehicleAndAlert({ status: 'NEW' });

    const acknowledged = await alerts.updateStatus(DEMO_ORG_ID, adminUserId, alert.id, 'ACKNOWLEDGED' as any);
    expect(acknowledged.status).toBe('ACKNOWLEDGED');

    const resolved = await alerts.updateStatus(DEMO_ORG_ID, adminUserId, alert.id, 'RESOLVED' as any);
    expect(resolved.status).toBe('RESOLVED');

    const logs = await prisma.auditLog.findMany({ where: { entity: 'Alert', entityId: alert.id } });
    expect(logs.length).toBe(2);
    expect(logs.map((l) => (l.metadata as any).to)).toEqual(['ACKNOWLEDGED', 'RESOLVED']);
  });

  it('PATCH rejette une transition illégale (RESOLVED -> ACKNOWLEDGED, ou NEW -> RESOLVED)', async () => {
    const { alert } = await setupVehicleAndAlert({ status: 'NEW' });

    await expect(alerts.updateStatus(DEMO_ORG_ID, adminUserId, alert.id, 'RESOLVED' as any)).rejects.toMatchObject({ status: 400 });

    const { alert: resolvedAlert } = await setupVehicleAndAlert({ status: 'RESOLVED' });
    await expect(alerts.updateStatus(DEMO_ORG_ID, adminUserId, resolvedAlert.id, 'ACKNOWLEDGED' as any)).rejects.toMatchObject({ status: 400 });
  });
});
