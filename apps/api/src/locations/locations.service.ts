import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}

  private qrSecret(): string {
    return this.config.get<string>('QR_TOKEN_SECRET') || 'dev-qr-secret-change-me';
  }

  /**
   * Écrit la colonne géométrique PostGIS `geom` en SQL brut (Prisma ne modélise pas les types
   * géométriques). Motif à réutiliser pour toute table portant lat/lng + geom (ex: gps_positions
   * en Phase 3).
   */
  private async setGeom(locationId: string, latitude: number, longitude: number) {
    await this.prisma.$executeRaw`
      UPDATE locations
      SET geom = ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)
      WHERE id = ${locationId}::uuid
    `;
  }

  async create(organizationId: string, dto: CreateLocationDto) {
    const location = await this.prisma.location.create({
      data: {
        organizationId,
        name: dto.name,
        type: dto.type,
        address: dto.address,
        latitude: dto.latitude,
        longitude: dto.longitude,
        allowedRadius: dto.allowedRadius ?? 50,
      },
    });
    await this.setGeom(location.id, dto.latitude, dto.longitude).catch(() => undefined); // PostGIS peut être absent hors Docker
    return location;
  }

  async findAll(organizationId: string) {
    return this.prisma.location.findMany({ where: { organizationId, deletedAt: null } });
  }

  async findOne(organizationId: string, id: string) {
    const location = await this.prisma.location.findFirst({ where: { id, organizationId, deletedAt: null } });
    if (!location) throw new NotFoundException('Lieu introuvable');
    return location;
  }

  async update(organizationId: string, id: string, dto: UpdateLocationDto) {
    await this.findOne(organizationId, id);
    const location = await this.prisma.location.update({ where: { id }, data: dto });
    if (dto.latitude !== undefined || dto.longitude !== undefined) {
      await this.setGeom(location.id, location.latitude, location.longitude).catch(() => undefined);
    }
    return location;
  }

  async remove(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    return this.prisma.location.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  /** Jeton QR opaque et signé (HMAC) — jamais l'ID brut du lieu. Vérifiable sans aller en DB. */
  private signToken(locationId: string, nonce: string): string {
    const payload = `${locationId}.${nonce}`;
    const sig = createHmac('sha256', this.qrSecret()).update(payload).digest('base64url');
    return `${payload}.${sig}`;
  }

  async generateQr(organizationId: string, locationId: string) {
    await this.findOne(organizationId, locationId);
    const nonce = randomBytes(9).toString('base64url');
    const token = this.signToken(locationId, nonce);

    await this.prisma.locationQrCode.create({ data: { locationId, token } });
    return { token };
  }

  /** Vérifie la signature HMAC puis l'existence/validité en base (non révoqué). */
  async verifyQrToken(token: string): Promise<string> {
    const parts = token.split('.');
    if (parts.length !== 3) throw new BadRequestException('Jeton QR invalide');
    const [locationId, nonce, sig] = parts;
    const expected = createHmac('sha256', this.qrSecret()).update(`${locationId}.${nonce}`).digest('base64url');

    const expectedBuf = Buffer.from(expected);
    const sigBuf = Buffer.from(sig);
    if (expectedBuf.length !== sigBuf.length || !timingSafeEqual(expectedBuf, sigBuf)) {
      throw new BadRequestException('Jeton QR invalide');
    }

    const record = await this.prisma.locationQrCode.findUnique({ where: { token } });
    if (!record || record.revokedAt) {
      throw new BadRequestException('Jeton QR invalide ou révoqué');
    }
    return locationId;
  }
}
