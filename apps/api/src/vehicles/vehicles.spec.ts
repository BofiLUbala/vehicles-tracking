import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { VehiclesModule } from './vehicles.module';
import { DriversModule } from '../drivers/drivers.module';
import { VehiclesService } from './vehicles.service';
import { DriversService } from '../drivers/drivers.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';

const DEMO_ORG_ID = '00000000-0000-0000-0000-000000000001';

describe('VehiclesService (intégration DB réelle)', () => {
  let vehicles: VehiclesService;
  let drivers: DriversService;
  let prisma: PrismaService;
  let vehicleId: string;
  let driverId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, VehiclesModule, DriversModule],
    }).compile();
    vehicles = moduleRef.get(VehiclesService);
    drivers = moduleRef.get(DriversService);
    prisma = moduleRef.get(PrismaService);
  });

  afterAll(async () => {
    if (vehicleId) await prisma.vehicle.delete({ where: { id: vehicleId } }).catch(() => undefined);
    if (driverId) await prisma.driver.delete({ where: { id: driverId } }).catch(() => undefined);
    await prisma.$disconnect();
  });

  it('crée, lit, met à jour, affecte un chauffeur et consulte l\'historique', async () => {
    const plate = `KIN-${Math.floor(1000 + Math.random() * 8999)}`;
    const vehicle = await vehicles.create(DEMO_ORG_ID, { plateNumber: plate, brand: 'Isuzu' });
    vehicleId = vehicle.id;
    expect(vehicle.plateNumber).toBe(plate);

    const found = await vehicles.findOne(DEMO_ORG_ID, vehicle.id);
    expect(found.brand).toBe('Isuzu');

    const updated = await vehicles.update(DEMO_ORG_ID, vehicle.id, { model: 'NPR' });
    expect(updated.model).toBe('NPR');

    const phone = `+2436${Math.floor(10000000 + Math.random() * 89999999)}`;
    const driver = await drivers.create(DEMO_ORG_ID, { firstName: 'Paul', lastName: 'Kanku', phone });
    driverId = driver.id;

    const assignment = await vehicles.assignDriver(DEMO_ORG_ID, vehicle.id, driver.id);
    expect(assignment.vehicleId).toBe(vehicle.id);

    const history = await vehicles.history(DEMO_ORG_ID, vehicle.id);
    expect(history.length).toBeGreaterThan(0);
    expect(history[0].driverId).toBe(driver.id);
  });

  it('soft-delete un véhicule (ne remonte plus dans findAll)', async () => {
    const plate = `KIN-${Math.floor(1000 + Math.random() * 8999)}`;
    const vehicle = await vehicles.create(DEMO_ORG_ID, { plateNumber: plate });
    await vehicles.remove(DEMO_ORG_ID, vehicle.id);
    const all = await vehicles.findAll(DEMO_ORG_ID);
    expect(all.some((v) => v.id === vehicle.id)).toBe(false);
    await prisma.vehicle.delete({ where: { id: vehicle.id } });
  });
});
