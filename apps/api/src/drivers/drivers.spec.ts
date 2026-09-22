import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { DriversModule } from './drivers.module';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { DriversService } from './drivers.service';
import { VehiclesService } from '../vehicles/vehicles.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';

const DEMO_ORG_ID = '00000000-0000-0000-0000-000000000001';

describe('DriversService (intégration DB réelle)', () => {
  let drivers: DriversService;
  let vehicles: VehiclesService;
  let prisma: PrismaService;
  let driverId: string;
  let vehicleId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, DriversModule, VehiclesModule],
    }).compile();
    drivers = moduleRef.get(DriversService);
    vehicles = moduleRef.get(VehiclesService);
    prisma = moduleRef.get(PrismaService);
  });

  afterAll(async () => {
    if (driverId) await prisma.driver.delete({ where: { id: driverId } }).catch(() => undefined);
    if (vehicleId) await prisma.vehicle.delete({ where: { id: vehicleId } }).catch(() => undefined);
    await prisma.$disconnect();
  });

  it('crée, lit, met à jour et affecte un véhicule à un chauffeur (parcours complet)', async () => {
    const phone = `+2438${Math.floor(10000000 + Math.random() * 89999999)}`;
    const driver = await drivers.create(DEMO_ORG_ID, { firstName: 'Jean', lastName: 'Mputu', phone });
    driverId = driver.id;
    expect(driver.id).toBeDefined();

    const found = await drivers.findOne(DEMO_ORG_ID, driver.id);
    expect(found.phone).toBe(phone);

    const updated = await drivers.update(DEMO_ORG_ID, driver.id, { lastName: 'Mputu-Kabila' });
    expect(updated.lastName).toBe('Mputu-Kabila');

    const plate = `KIN-${Math.floor(1000 + Math.random() * 8999)}`;
    const vehicle = await vehicles.create(DEMO_ORG_ID, { plateNumber: plate });
    vehicleId = vehicle.id;

    const assignment = await drivers.assignVehicle(DEMO_ORG_ID, driver.id, vehicle.id);
    expect(assignment.driverId).toBe(driver.id);
    expect(assignment.vehicleId).toBe(vehicle.id);

    const all = await drivers.findAll(DEMO_ORG_ID);
    expect(all.some((d) => d.id === driver.id)).toBe(true);
  });

  it('soft-delete un chauffeur (ne remonte plus dans findAll)', async () => {
    const phone = `+2437${Math.floor(10000000 + Math.random() * 89999999)}`;
    const driver = await drivers.create(DEMO_ORG_ID, { firstName: 'A', lastName: 'B', phone });
    await drivers.remove(DEMO_ORG_ID, driver.id);
    const all = await drivers.findAll(DEMO_ORG_ID);
    expect(all.some((d) => d.id === driver.id)).toBe(false);
    await prisma.driver.delete({ where: { id: driver.id } });
  });

  it('refuse de créer un doublon d’un compte existant (même téléphone)', async () => {
    const phone = `+2435${Math.floor(10000000 + Math.random() * 89999999)}`;
    const driver = await drivers.create(DEMO_ORG_ID, { firstName: 'Gauthier', lastName: 'Bofi', phone });
    try {
      await expect(
        drivers.create(DEMO_ORG_ID, { firstName: 'Gauthier', lastName: 'Bofi', phone }),
      ).rejects.toMatchObject({ status: 409 });
    } finally {
      await prisma.driver.delete({ where: { id: driver.id } }).catch(() => undefined);
    }
  });

  it('listLinkable renvoie uniquement les comptes ACTIVE de l’organisation (avec contexte)', async () => {
    const phone = `+2434${Math.floor(10000000 + Math.random() * 89999999)}`;
    const driver = await drivers.create(DEMO_ORG_ID, { firstName: 'Link', lastName: 'Test', phone });
    const disabled = await drivers.create(DEMO_ORG_ID, {
      firstName: 'Off',
      lastName: 'List',
      phone: `+2433${Math.floor(10000000 + Math.random() * 89999999)}`,
      status: 'SUSPENDED',
    });
    try {
      const linkable = await drivers.listLinkable(DEMO_ORG_ID);
      expect(linkable.some((d) => d.id === driver.id)).toBe(true);
      expect(linkable.some((d) => d.id === disabled.id)).toBe(false);

      const row = linkable.find((d) => d.id === driver.id) as any;
      expect(row.status).toBe('ACTIVE');
      expect(row.profile).toBeDefined();
      expect(row.profile.complete).toBe(false);
      expect(row.hasMobileAccount).toBe(false);
      expect(row.currentVehicle).toBeNull();
      expect(row.activeMission).toBeNull();
      expect(row.passwordHash).toBeUndefined();
    } finally {
      await prisma.driver.delete({ where: { id: driver.id } }).catch(() => undefined);
      await prisma.driver.delete({ where: { id: disabled.id } }).catch(() => undefined);
    }
  });

  it('findAll expose le contexte d’affectation (véhicule actuel + mission active)', async () => {
    const phone = `+2436${Math.floor(10000000 + Math.random() * 89999999)}`;
    const driver = await drivers.create(DEMO_ORG_ID, { firstName: 'Ctx', lastName: 'Test', phone });
    const plate = `KIN-${Math.floor(1000 + Math.random() * 8999)}`;
    const vehicle = await vehicles.create(DEMO_ORG_ID, { plateNumber: plate });
    try {
      // Sans affectation : contextes nuls.
      const bare = await drivers.findOne(DEMO_ORG_ID, driver.id);
      expect(bare.currentVehicle).toBeNull();
      expect(bare.activeMission).toBeNull();

      await drivers.assignVehicle(DEMO_ORG_ID, driver.id, vehicle.id);
      const mission = await prisma.mission.create({
        data: { organizationId: DEMO_ORG_ID, driverId: driver.id, vehicleId: vehicle.id, status: 'ASSIGNED' },
      });
      try {
        const all = await drivers.findAll(DEMO_ORG_ID);
        const row = all.find((d: any) => d.id === driver.id);
        expect(row?.currentVehicle?.plateNumber).toBe(plate);
        expect(row?.activeMission?.id).toBe(mission.id);
        expect(row?.activeMission?.status).toBe('ASSIGNED');
      } finally {
        await prisma.mission.delete({ where: { id: mission.id } }).catch(() => undefined);
      }
    } finally {
      await prisma.driver.delete({ where: { id: driver.id } }).catch(() => undefined);
      await prisma.vehicle.delete({ where: { id: vehicle.id } }).catch(() => undefined);
    }
  });
});
