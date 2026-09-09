import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import ExcelJS from 'exceljs';
import { ReportsModule } from './reports.module';
import { ReportsService } from './reports.service';
import { DriversModule } from '../drivers/drivers.module';
import { DriversService } from '../drivers/drivers.service';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { VehiclesService } from '../vehicles/vehicles.service';
import { LocationsModule } from '../locations/locations.module';
import { LocationsService } from '../locations/locations.service';
import { MissionsModule } from '../missions/missions.module';
import { MissionsService } from '../missions/missions.service';
import { FuelModule } from '../fuel/fuel.module';
import { FuelService } from '../fuel/fuel.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';

const DEMO_ORG_ID = '00000000-0000-0000-0000-000000000001';

function randomSuffix(len = 8) {
  return Math.random().toString(36).slice(2, 2 + len);
}

function fakeFile(content: string, fieldname: string): Express.Multer.File {
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

describe('ReportsService (intégration DB + MinIO réels)', () => {
  let reports: ReportsService;
  let drivers: DriversService;
  let vehicles: VehiclesService;
  let locations: LocationsService;
  let missions: MissionsService;
  let fuel: FuelService;
  let prisma: PrismaService;

  const driverIds: string[] = [];
  const vehicleIds: string[] = [];
  const locationIds: string[] = [];
  const missionIds: string[] = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        DriversModule,
        VehiclesModule,
        LocationsModule,
        MissionsModule,
        FuelModule,
        ReportsModule,
      ],
    }).compile();
    await moduleRef.init();

    reports = moduleRef.get(ReportsService);
    drivers = moduleRef.get(DriversService);
    vehicles = moduleRef.get(VehiclesService);
    locations = moduleRef.get(LocationsService);
    missions = moduleRef.get(MissionsService);
    fuel = moduleRef.get(FuelService);
    prisma = moduleRef.get(PrismaService);
  }, 30_000);

  afterAll(async () => {
    await prisma.alert.deleteMany({ where: { vehicleId: { in: vehicleIds } } }).catch(() => undefined);
    await prisma.fuelRecord.deleteMany({ where: { vehicleId: { in: vehicleIds } } }).catch(() => undefined);
    await prisma.missionStep.deleteMany({ where: { missionId: { in: missionIds } } }).catch(() => undefined);
    await prisma.missionEvent.deleteMany({ where: { missionId: { in: missionIds } } }).catch(() => undefined);
    await prisma.mission.deleteMany({ where: { id: { in: missionIds } } }).catch(() => undefined);
    await prisma.location.deleteMany({ where: { id: { in: locationIds } } }).catch(() => undefined);
    await prisma.driverVehicleAssignment.deleteMany({ where: { driverId: { in: driverIds } } }).catch(() => undefined);
    await prisma.driver.deleteMany({ where: { id: { in: driverIds } } }).catch(() => undefined);
    await prisma.vehicle.deleteMany({ where: { id: { in: vehicleIds } } }).catch(() => undefined);
    await prisma.$disconnect();
  });

  async function setupFixture() {
    const phone = `+2439${Math.floor(10000000 + Math.random() * 89999999)}`;
    const driver = await drivers.create(DEMO_ORG_ID, { firstName: 'Rapport', lastName: randomSuffix(4), phone });
    driverIds.push(driver.id);

    const vehicle = await vehicles.create(DEMO_ORG_ID, { plateNumber: `RP-${randomSuffix(6).toUpperCase()}` });
    vehicleIds.push(vehicle.id);

    await drivers.assignVehicle(DEMO_ORG_ID, driver.id, vehicle.id);

    const location = await locations.create(DEMO_ORG_ID, {
      name: `Point ${randomSuffix(4)}`,
      type: 'COLLECTION' as any,
      latitude: 4.05,
      longitude: 9.7,
    } as any);
    locationIds.push(location.id);

    const mission = await missions.create(DEMO_ORG_ID, {
      driverId: driver.id,
      vehicleId: vehicle.id,
      plannedStart: new Date().toISOString(),
      steps: [{ locationId: location.id, order: 1, actionType: 'COLLECT' as any }],
    } as any);
    missionIds.push(mission.id);

    await fuel.create(driver.id, DEMO_ORG_ID, {
      vehicleId: vehicle.id,
      liters: 30,
      totalCost: 45000,
      odometer: 100,
      fuelType: 'DIESEL' as any,
    } as any, fakeFile('r', 'receipt'), fakeFile('o', 'odometerPhoto'));

    return { driver, vehicle, location, mission };
  }

  it('rapport missions (json) : liste et filtre par véhicule/statut/point de collecte', async () => {
    const { vehicle, location, mission } = await setupFixture();

    const all = await reports.missionsReport(DEMO_ORG_ID, {} as any);
    expect(Array.isArray(all.body)).toBe(true);
    expect((all.body as any[]).some((r) => r.id === mission.id)).toBe(true);

    const byVehicle = await reports.missionsReport(DEMO_ORG_ID, { vehicleId: vehicle.id } as any);
    expect((byVehicle.body as any[]).every((r) => r.vehicleId === vehicle.id)).toBe(true);

    const byLocation = await reports.missionsReport(DEMO_ORG_ID, { locationId: location.id } as any);
    expect((byLocation.body as any[]).some((r) => r.id === mission.id)).toBe(true);

    const byStatus = await reports.missionsReport(DEMO_ORG_ID, { status: 'PLANNED' } as any);
    expect((byStatus.body as any[]).every((r) => r.status === 'PLANNED')).toBe(true);
  });

  it('rapport carburant (json) : filtre par véhicule/chauffeur/période', async () => {
    const { driver, vehicle } = await setupFixture();

    const all = await reports.fuelReport(DEMO_ORG_ID, { vehicleId: vehicle.id } as any);
    expect((all.body as any[]).length).toBeGreaterThan(0);
    expect((all.body as any[]).every((r) => r.vehicleId === vehicle.id)).toBe(true);

    const byDriver = await reports.fuelReport(DEMO_ORG_ID, { driverId: driver.id } as any);
    expect((byDriver.body as any[]).every((r) => r.driverId === driver.id)).toBe(true);

    const future = await reports.fuelReport(DEMO_ORG_ID, { vehicleId: vehicle.id, from: new Date(Date.now() + 3_600_000).toISOString() } as any);
    expect((future.body as any[]).length).toBe(0);
  });

  it('export CSV : nombre de lignes/colonnes correct et parseable', async () => {
    const { vehicle } = await setupFixture();

    const result = await reports.fuelReport(DEMO_ORG_ID, { vehicleId: vehicle.id, format: 'csv' } as any);
    expect(result.contentType).toContain('text/csv');
    expect(typeof result.body).toBe('string');

    const csv = result.body as string;
    const lines = csv.trim().split('\r\n');
    // 1 en-tête + 1 ligne de données (une seule déclaration créée par setupFixture pour ce véhicule).
    expect(lines.length).toBe(2);
    const header = lines[0].split(',');
    const dataRow = lines[1].split(',');
    expect(header.length).toBe(dataRow.length);
    expect(header).toContain('Véhicule');
  });

  it('export XLSX : fichier valide, relisible par exceljs, mêmes données que le JSON', async () => {
    const { vehicle } = await setupFixture();

    const jsonResult = await reports.fuelReport(DEMO_ORG_ID, { vehicleId: vehicle.id } as any);
    const xlsxResult = await reports.fuelReport(DEMO_ORG_ID, { vehicleId: vehicle.id, format: 'xlsx' } as any);

    expect(xlsxResult.contentType).toContain('spreadsheetml');
    expect(Buffer.isBuffer(xlsxResult.body)).toBe(true);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(xlsxResult.body as any);
    const sheet = workbook.worksheets[0];
    expect(sheet).toBeDefined();
    // +1 pour la ligne d'en-tête.
    expect(sheet.rowCount).toBe((jsonResult.body as any[]).length + 1);
    const headerRow = sheet.getRow(1).values as unknown[];
    expect(headerRow).toContain('Véhicule');
  });

  it('export PDF : commence par la signature %PDF et contient des octets', async () => {
    const { vehicle } = await setupFixture();

    const result = await reports.fuelReport(DEMO_ORG_ID, { vehicleId: vehicle.id, format: 'pdf' } as any);
    expect(result.contentType).toBe('application/pdf');
    expect(Buffer.isBuffer(result.body)).toBe(true);
    const buffer = result.body as Buffer;
    expect(buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    expect(buffer.length).toBeGreaterThan(100);
  });

  it('rapport positions GPS (json) : structure de base, org-scopé par véhicule', async () => {
    const { vehicle } = await setupFixture();
    const result = await reports.gpsPositionsReport(DEMO_ORG_ID, { vehicleId: vehicle.id } as any);
    expect(Array.isArray(result.body)).toBe(true);
    expect((result.body as any[]).every((r) => r.vehicleId === vehicle.id)).toBe(true);
  });
});
