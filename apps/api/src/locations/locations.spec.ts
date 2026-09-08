import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { LocationsModule } from './locations.module';
import { LocationsService } from './locations.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';

const DEMO_ORG_ID = '00000000-0000-0000-0000-000000000001';

describe('LocationsService (intégration DB réelle)', () => {
  let locations: LocationsService;
  let prisma: PrismaService;
  let locationId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, LocationsModule],
    }).compile();
    locations = moduleRef.get(LocationsService);
    prisma = moduleRef.get(PrismaService);
  });

  afterAll(async () => {
    if (locationId) await prisma.location.delete({ where: { id: locationId } }).catch(() => undefined);
    await prisma.$disconnect();
  });

  it('crée un point (collecte) avec lat/lng', async () => {
    const location = await locations.create(DEMO_ORG_ID, {
      name: 'Dépôt Limete',
      type: 'DROPOFF' as any,
      latitude: -4.325,
      longitude: 15.322,
    });
    locationId = location.id;
    expect(location.id).toBeDefined();
    expect(location.allowedRadius).toBe(50);
  });

  it('génère un jeton QR signé, non devinable, lié au lieu', async () => {
    const { token } = await locations.generateQr(DEMO_ORG_ID, locationId);
    expect(token).toBeDefined();
    expect(token.split('.').length).toBe(3);

    const resolvedLocationId = await locations.verifyQrToken(token);
    expect(resolvedLocationId).toBe(locationId);
  });

  it('rejette un jeton QR falsifié (signature invalide)', async () => {
    const { token } = await locations.generateQr(DEMO_ORG_ID, locationId);
    const tampered = token.slice(0, -1) + (token.endsWith('A') ? 'B' : 'A');
    await expect(locations.verifyQrToken(tampered)).rejects.toThrow(BadRequestException);
  });

  it('rejette un jeton QR révoqué', async () => {
    const { token } = await locations.generateQr(DEMO_ORG_ID, locationId);
    await prisma.locationQrCode.update({ where: { token }, data: { revokedAt: new Date() } });
    await expect(locations.verifyQrToken(token)).rejects.toThrow(BadRequestException);
  });
});
