import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { FuelModule } from './fuel.module';
import { FuelService } from './fuel.service';
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

function fakeFile(content: string, fieldname = 'file'): Express.Multer.File {
  // Suffixe aléatoire : le hash SHA-256 du contenu sert de clé de déduplication GLOBALE (table
  // `File`, tous véhicules/tests confondus) — deux appels `fakeFile('r1', ...)` dans des tests
  // DIFFÉRENTS produiraient sinon le même hash et déclencheraient à tort l'anomalie "reçu réutilisé".
  const buffer = Buffer.from(`${content}-${randomSuffix(12)}`);
  return {
    fieldname,
    originalname: `${fieldname}.jpg`,
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

describe('FuelService (intégration DB + MinIO réels)', () => {
  let fuel: FuelService;
  let drivers: DriversService;
  let vehicles: VehiclesService;
  let prisma: PrismaService;

  const driverIds: string[] = [];
  const vehicleIds: string[] = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, DriversModule, VehiclesModule, FuelModule],
    }).compile();
    await moduleRef.init();

    fuel = moduleRef.get(FuelService);
    drivers = moduleRef.get(DriversService);
    vehicles = moduleRef.get(VehiclesService);
    prisma = moduleRef.get(PrismaService);
  }, 30_000);

  afterAll(async () => {
    await prisma.alert.deleteMany({ where: { vehicleId: { in: vehicleIds } } }).catch(() => undefined);
    await prisma.fuelRecord.deleteMany({ where: { vehicleId: { in: vehicleIds } } }).catch(() => undefined);
    await prisma.driverVehicleAssignment.deleteMany({ where: { driverId: { in: driverIds } } }).catch(() => undefined);
    await prisma.driver.deleteMany({ where: { id: { in: driverIds } } }).catch(() => undefined);
    await prisma.vehicle.deleteMany({ where: { id: { in: vehicleIds } } }).catch(() => undefined);
    await prisma.$disconnect();
  });

  async function setupDriverAndVehicle(tankCapacity?: number) {
    const phone = `+2439${Math.floor(10000000 + Math.random() * 89999999)}`;
    const driver = await drivers.create(DEMO_ORG_ID, { firstName: 'Chauffeur', lastName: randomSuffix(4), phone });
    driverIds.push(driver.id);

    const plate = `FU-${randomSuffix(6).toUpperCase()}`;
    const vehicle = await vehicles.create(DEMO_ORG_ID, { plateNumber: plate, tankCapacity });
    vehicleIds.push(vehicle.id);

    await drivers.assignVehicle(DEMO_ORG_ID, driver.id, vehicle.id);
    return { driver, vehicle };
  }

  function metadata(vehicleId: string, overrides: Record<string, unknown> = {}) {
    return {
      vehicleId,
      liters: 40,
      totalCost: 60000,
      odometer: 1000,
      fuelType: 'DIESEL',
      ...overrides,
    } as any;
  }

  it('crée une déclaration et calcule la consommation (L/100km) par rapport au plein précédent', async () => {
    const { driver, vehicle } = await setupDriverAndVehicle();

    const first = await fuel.create(driver.id, DEMO_ORG_ID, metadata(vehicle.id, { odometer: 1000 }), fakeFile('r1', 'receipt'), fakeFile('o1', 'odometerPhoto'));
    expect(first.record.id).toBeDefined();
    expect(first.distanceKm).toBeNull(); // pas de plein précédent
    expect(first.consumptionL100km).toBeNull();
    expect(first.anomalies).toHaveLength(0);

    // 500km plus tard, 40L => 8 L/100km, plausible.
    const second = await fuel.create(
      driver.id,
      DEMO_ORG_ID,
      metadata(vehicle.id, { odometer: 1500, liters: 40 }),
      fakeFile('r2', 'receipt'),
      fakeFile('o2', 'odometerPhoto'),
    );
    expect(second.distanceKm).toBe(500);
    expect(second.consumptionL100km).toBeCloseTo(8, 5);
    // Les deux pleins sont créés dos-à-dos dans ce test (quelques ms d'écart) : la seule anomalie
    // plausible ici est "trop rapproché" (MIN_HOURS_BETWEEN_FUEL_RECORDS) — pas la consommation,
    // ni l'odomètre, qui sont tous les deux plausibles.
    expect(second.anomalies.every((a) => a.message.includes('moins de'))).toBe(true);

    const stored = await prisma.fuelRecord.count({ where: { vehicleId: vehicle.id } });
    expect(stored).toBe(2);
  });

  it('odomètre inférieur au précédent plein : crée une alerte FUEL_ANOMALY HIGH mais stocke quand même la déclaration', async () => {
    const { driver, vehicle } = await setupDriverAndVehicle();

    await fuel.create(driver.id, DEMO_ORG_ID, metadata(vehicle.id, { odometer: 2000 }), fakeFile('r1', 'receipt'), fakeFile('o1', 'odometerPhoto'));

    const result = await fuel.create(driver.id, DEMO_ORG_ID, metadata(vehicle.id, { odometer: 1900 }), fakeFile('r2', 'receipt'), fakeFile('o2', 'odometerPhoto'));

    expect(result.record.id).toBeDefined();
    expect(result.anomalies.some((a) => a.level === 'HIGH')).toBe(true);

    const alert = await prisma.alert.findFirst({ where: { vehicleId: vehicle.id, type: 'FUEL_ANOMALY', level: 'HIGH' } });
    expect(alert).not.toBeNull();
    expect(alert!.score).toBeGreaterThan(0);
    expect(alert!.scoreBreakdown).not.toBeNull();

    const stored = await prisma.fuelRecord.count({ where: { vehicleId: vehicle.id } });
    expect(stored).toBe(2);
  });

  it('consommation excessive : crée une alerte FUEL_ANOMALY MEDIUM', async () => {
    const { driver, vehicle } = await setupDriverAndVehicle();

    await fuel.create(driver.id, DEMO_ORG_ID, metadata(vehicle.id, { odometer: 3000 }), fakeFile('r1', 'receipt'), fakeFile('o1', 'odometerPhoto'));

    // 10km plus tard, 40L => 400 L/100km, très au-dessus du seuil par défaut (40).
    const result = await fuel.create(
      driver.id,
      DEMO_ORG_ID,
      metadata(vehicle.id, { odometer: 3010, liters: 40 }),
      fakeFile('r2', 'receipt'),
      fakeFile('o2', 'odometerPhoto'),
    );

    expect(result.consumptionL100km).toBeCloseTo(400, 0);
    const alert = await prisma.alert.findFirst({ where: { vehicleId: vehicle.id, type: 'FUEL_ANOMALY', message: { contains: 'implausible' } } });
    expect(alert).not.toBeNull();
    expect(alert!.level).toBe('MEDIUM');
  });

  it('litres > capacité du réservoir : crée une alerte FUEL_ANOMALY', async () => {
    const { driver, vehicle } = await setupDriverAndVehicle(50); // réservoir 50L

    const result = await fuel.create(
      driver.id,
      DEMO_ORG_ID,
      metadata(vehicle.id, { odometer: 4000, liters: 80 }),
      fakeFile('r1', 'receipt'),
      fakeFile('o1', 'odometerPhoto'),
    );

    expect(result.anomalies.some((a) => a.message.includes('capacité'))).toBe(true);
    const alert = await prisma.alert.findFirst({ where: { vehicleId: vehicle.id, type: 'FUEL_ANOMALY', message: { contains: 'capacité' } } });
    expect(alert).not.toBeNull();
  });

  it('deux déclarations trop rapprochées dans le temps : crée une alerte FUEL_ANOMALY', async () => {
    const { driver, vehicle } = await setupDriverAndVehicle();

    await fuel.create(driver.id, DEMO_ORG_ID, metadata(vehicle.id, { odometer: 5000 }), fakeFile('r1', 'receipt'), fakeFile('o1', 'odometerPhoto'));
    // Immédiatement après (bien en-dessous de MIN_HOURS_BETWEEN_FUEL_RECORDS=2h par défaut).
    const result = await fuel.create(driver.id, DEMO_ORG_ID, metadata(vehicle.id, { odometer: 5100 }), fakeFile('r2', 'receipt'), fakeFile('o2', 'odometerPhoto'));

    expect(result.anomalies.some((a) => a.message.includes('moins de'))).toBe(true);
  });

  it('reçu (hash) réutilisé sur une autre déclaration : crée une alerte FUEL_ANOMALY HIGH', async () => {
    const { driver, vehicle } = await setupDriverAndVehicle();
    // Même buffer EXACT (pas de suffixe aléatoire ajouté ici) réutilisé pour les deux appels, afin
    // que le hash SHA-256 collide bien — c'est précisément ce que ce test vérifie.
    const identicalBuffer = Buffer.from(`receipt-identique-${randomSuffix(12)}`);
    const sameReceipt = (): Express.Multer.File =>
      ({
        fieldname: 'receipt',
        originalname: 'receipt.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: identicalBuffer.length,
        buffer: identicalBuffer,
        stream: undefined as any,
        destination: '',
        filename: '',
        path: '',
      }) as Express.Multer.File;

    await fuel.create(driver.id, DEMO_ORG_ID, metadata(vehicle.id, { odometer: 6000 }), sameReceipt(), fakeFile('o1', 'odometerPhoto'));

    const result = await fuel.create(driver.id, DEMO_ORG_ID, metadata(vehicle.id, { odometer: 6500 }), sameReceipt(), fakeFile('o2', 'odometerPhoto'));

    const reuseAlert = result.anomalies.find((a) => a.message.includes('déjà utilisée'));
    expect(reuseAlert).toBeDefined();
    expect(reuseAlert!.level).toBe('HIGH');
  });

  it('refuse la création par un chauffeur non affecté au véhicule (403)', async () => {
    const { vehicle } = await setupDriverAndVehicle();
    const { driver: otherDriver } = await setupDriverAndVehicle();

    await expect(
      fuel.create(otherDriver.id, DEMO_ORG_ID, metadata(vehicle.id, { odometer: 7000 }), fakeFile('r', 'receipt'), fakeFile('o', 'odometerPhoto')),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('GET fuel-summary agrège litres/coût et calcule la consommation moyenne sur la période', async () => {
    const { driver, vehicle } = await setupDriverAndVehicle();

    await fuel.create(driver.id, DEMO_ORG_ID, metadata(vehicle.id, { odometer: 8000, liters: 40, totalCost: 60000 }), fakeFile('r1', 'receipt'), fakeFile('o1', 'odometerPhoto'));
    await fuel.create(driver.id, DEMO_ORG_ID, metadata(vehicle.id, { odometer: 8500, liters: 45, totalCost: 67500 }), fakeFile('r2', 'receipt'), fakeFile('o2', 'odometerPhoto'));

    const summary = await fuel.fuelSummary(DEMO_ORG_ID, vehicle.id, {});
    expect(summary.recordCount).toBe(2);
    expect(summary.totalLiters).toBeCloseTo(85, 5);
    expect(summary.totalCost).toBeCloseTo(127500, 5);
    expect(summary.totalDistanceKm).toBe(500);
    expect(summary.averageConsumptionL100km).toBeCloseTo((45 / 500) * 100, 5);
  });

  it('GET fuel-anomalies renvoie les alertes FUEL_ANOMALY de ce véhicule', async () => {
    const { driver, vehicle } = await setupDriverAndVehicle();

    await fuel.create(driver.id, DEMO_ORG_ID, metadata(vehicle.id, { odometer: 9000 }), fakeFile('r1', 'receipt'), fakeFile('o1', 'odometerPhoto'));
    await fuel.create(driver.id, DEMO_ORG_ID, metadata(vehicle.id, { odometer: 8900 }), fakeFile('r2', 'receipt'), fakeFile('o2', 'odometerPhoto'));

    const anomalies = await fuel.fuelAnomalies(DEMO_ORG_ID, vehicle.id);
    expect(anomalies.length).toBeGreaterThan(0);
    expect(anomalies.every((a) => a.type === 'FUEL_ANOMALY')).toBe(true);
  });
});
