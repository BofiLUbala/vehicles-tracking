import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { TrackingModule } from './tracking.module';
import { VehicleOfflineCron } from './vehicle-offline.cron';
import { RealtimeEventsService } from './realtime-events.service';
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

/**
 * Teste `VehicleOfflineCron.sweep()` DIRECTEMENT (sans attendre un vrai tick de `@Cron`, ni monter
 * `ScheduleModule` — voir docs/PHASE4_NOTES.md sur ce choix).
 */
describe('VehicleOfflineCron (intégration DB réelle)', () => {
  let cron: VehicleOfflineCron;
  let realtime: RealtimeEventsService;
  let drivers: DriversService;
  let vehicles: VehiclesService;
  let prisma: PrismaService;

  const driverIds: string[] = [];
  const vehicleIds: string[] = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, DriversModule, VehiclesModule, TrackingModule],
    }).compile();
    await moduleRef.init();

    cron = moduleRef.get(VehicleOfflineCron);
    realtime = moduleRef.get(RealtimeEventsService);
    drivers = moduleRef.get(DriversService);
    vehicles = moduleRef.get(VehiclesService);
    prisma = moduleRef.get(PrismaService);
  }, 30_000);

  afterAll(async () => {
    await prisma.vehicleLatestPosition.deleteMany({ where: { vehicleId: { in: vehicleIds } } }).catch(() => undefined);
    await prisma.driverVehicleAssignment.deleteMany({ where: { driverId: { in: driverIds } } }).catch(() => undefined);
    await prisma.driver.deleteMany({ where: { id: { in: driverIds } } }).catch(() => undefined);
    await prisma.vehicle.deleteMany({ where: { id: { in: vehicleIds } } }).catch(() => undefined);
    await prisma.$disconnect();
  });

  async function setupStaleVehicle(minutesAgo: number) {
    const phone = `+2439${Math.floor(10000000 + Math.random() * 89999999)}`;
    const driver = await drivers.create(DEMO_ORG_ID, { firstName: 'Chauffeur', lastName: randomSuffix(4), phone });
    driverIds.push(driver.id);

    const plate = `OFF-${randomSuffix(6).toUpperCase()}`;
    const vehicle = await vehicles.create(DEMO_ORG_ID, { plateNumber: plate });
    vehicleIds.push(vehicle.id);

    await prisma.vehicleLatestPosition.create({
      data: { vehicleId: vehicle.id, latitude: -4.325, longitude: 15.322, status: 'AVAILABLE' },
    });
    // updatedAt est géré par @updatedAt — on le recule directement en SQL pour simuler l'ancienneté.
    const staleAt = new Date(Date.now() - minutesAgo * 60_000);
    await prisma.$executeRaw`UPDATE vehicle_latest_positions SET "updatedAt" = ${staleAt} WHERE "vehicleId" = ${vehicle.id}`;

    return { driver, vehicle };
  }

  it('émet vehicle.offline pour un véhicule dont la dernière position dépasse le seuil, une seule fois par updatedAt', async () => {
    const { vehicle } = await setupStaleVehicle(10); // seuil par défaut 5 min
    const emitSpy = jest.spyOn(realtime, 'emitVehicleOffline');

    const firstCount = await cron.sweep();
    expect(firstCount).toBeGreaterThanOrEqual(1);
    const callsForVehicle = emitSpy.mock.calls.filter((c) => c[0].vehicleId === vehicle.id);
    expect(callsForVehicle).toHaveLength(1);

    // Deuxième balayage immédiat : même `updatedAt`, donc AUCUNE nouvelle notification pour ce véhicule.
    await cron.sweep();
    const callsAfterSecondSweep = emitSpy.mock.calls.filter((c) => c[0].vehicleId === vehicle.id);
    expect(callsAfterSecondSweep).toHaveLength(1);

    emitSpy.mockRestore();
  });

  it("n'émet rien pour un véhicule vu récemment (sous le seuil)", async () => {
    const { vehicle } = await setupStaleVehicle(1); // 1 min < seuil 5 min
    const emitSpy = jest.spyOn(realtime, 'emitVehicleOffline');

    await cron.sweep();
    const callsForVehicle = emitSpy.mock.calls.filter((c) => c[0].vehicleId === vehicle.id);
    expect(callsForVehicle).toHaveLength(0);

    emitSpy.mockRestore();
  });
});
