import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Zone, ZoneKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';

/** Résultat du contrôle d'une position contre les zones d'une organisation. */
export interface ZoneCheck {
  /** L'organisation a-t-elle au moins une zone autorisée active ? Sinon aucun contrôle n'est possible. */
  hasAllowedZones: boolean;
  /** La position est hors de TOUTES les zones autorisées (seulement si `hasAllowedZones`). */
  outsideAllowed: boolean;
  /** Zone interdite contenant la position, le cas échéant. */
  forbiddenZone: { id: string; name: string } | null;
  /** Une règle de géofencing est-elle violée ? */
  get violated(): boolean;
}

@Injectable()
export class ZonesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Normalise l'anneau extérieur : coordonnées valides, anneau fermé (PostGIS refuse un polygone
   * ouvert). L'appelant peut donc envoyer les sommets bruts cliqués sur une carte.
   */
  private normalizeRing(coordinates: number[][]): number[][] {
    const ring = coordinates.map((point, index) => {
      if (!Array.isArray(point) || point.length < 2) {
        throw new BadRequestException(`Sommet ${index + 1} invalide : attendu [longitude, latitude]`);
      }
      const [lng, lat] = point;
      if (typeof lng !== 'number' || typeof lat !== 'number' || Number.isNaN(lng) || Number.isNaN(lat)) {
        throw new BadRequestException(`Sommet ${index + 1} invalide : coordonnées non numériques`);
      }
      if (lat < -90 || lat > 90) throw new BadRequestException(`Sommet ${index + 1} : latitude hors de [-90, 90]`);
      if (lng < -180 || lng > 180) throw new BadRequestException(`Sommet ${index + 1} : longitude hors de [-180, 180]`);
      return [lng, lat];
    });

    const first = ring[0];
    const last = ring[ring.length - 1];
    const closed = first[0] === last[0] && first[1] === last[1] ? ring : [...ring, [first[0], first[1]]];

    // Un polygone valide a au moins 3 sommets distincts, donc 4 points une fois l'anneau fermé.
    if (closed.length < 4) {
      throw new BadRequestException('Un polygone valide demande au moins 3 sommets distincts');
    }
    return closed;
  }

  /**
   * Écrit la colonne PostGIS `geom` à partir du GeoJSON stocké (même motif que
   * `LocationsService.setGeom` : Prisma ne modélise pas les types géométriques).
   *
   * `ST_MakeValid` corrige les auto-intersections d'un polygone dessiné à la main, qui feraient
   * échouer tout `ST_Contains` ultérieur.
   */
  private async setGeom(zoneId: string, ring: number[][]) {
    const geojson = JSON.stringify({ type: 'Polygon', coordinates: [ring] });
    await this.prisma.$executeRaw`
      UPDATE zones
      SET geom = ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON(${geojson}), 4326))
      WHERE id = ${zoneId}::uuid
    `;
  }

  async create(organizationId: string, dto: CreateZoneDto): Promise<Zone> {
    const ring = this.normalizeRing(dto.coordinates);
    const zone = await this.prisma.zone.create({
      data: {
        organizationId,
        name: dto.name,
        kind: dto.kind ?? ZoneKind.ALLOWED,
        coordinates: ring as unknown as Prisma.InputJsonValue,
        isActive: dto.isActive ?? true,
      },
    });
    await this.setGeom(zone.id, ring);
    return zone;
  }

  async findAll(organizationId: string): Promise<Zone[]> {
    return this.prisma.zone.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(organizationId: string, id: string): Promise<Zone> {
    const zone = await this.prisma.zone.findFirst({ where: { id, organizationId, deletedAt: null } });
    if (!zone) throw new NotFoundException('Zone introuvable');
    return zone;
  }

  async update(organizationId: string, id: string, dto: UpdateZoneDto): Promise<Zone> {
    await this.findOne(organizationId, id);
    const ring = dto.coordinates ? this.normalizeRing(dto.coordinates) : undefined;

    const zone = await this.prisma.zone.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.kind !== undefined ? { kind: dto.kind } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(ring ? { coordinates: ring as unknown as Prisma.InputJsonValue } : {}),
      },
    });
    if (ring) await this.setGeom(zone.id, ring);
    return zone;
  }

  async remove(organizationId: string, id: string): Promise<{ id: string }> {
    await this.findOne(organizationId, id);
    await this.prisma.zone.update({ where: { id }, data: { deletedAt: new Date() } });
    return { id };
  }

  /**
   * Contrôle une position contre les zones actives de l'organisation, en une seule requête
   * spatiale (index GiST `zones_geom_gist_idx`).
   *
   * Règles :
   * - une organisation sans zone autorisée n'impose aucun périmètre — aucune alerte, sinon activer
   *   le géofencing déclencherait une avalanche d'alertes pour tout le monde ;
   * - hors de toutes les zones autorisées ⇒ violation ;
   * - dans une zone interdite ⇒ violation, même si la position est par ailleurs dans une zone
   *   autorisée (l'interdiction prime).
   */
  async checkPoint(organizationId: string, latitude: number, longitude: number): Promise<ZoneCheck> {
    const rows = await this.prisma.$queryRaw<
      { kind: ZoneKind; id: string; name: string; contains: boolean }[]
    >`
      SELECT z.kind::text AS kind,
             z.id::text AS id,
             z.name AS name,
             ST_Contains(z.geom, ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)) AS contains
      FROM zones z
      WHERE z."organizationId" = ${organizationId}
        AND z."isActive" = true
        AND z."deletedAt" IS NULL
        AND z.geom IS NOT NULL
    `;

    const allowed = rows.filter((r) => r.kind === ZoneKind.ALLOWED);
    const forbiddenHit = rows.find((r) => r.kind === ZoneKind.FORBIDDEN && r.contains) ?? null;

    const hasAllowedZones = allowed.length > 0;
    const outsideAllowed = hasAllowedZones && !allowed.some((r) => r.contains);

    return {
      hasAllowedZones,
      outsideAllowed,
      forbiddenZone: forbiddenHit ? { id: forbiddenHit.id, name: forbiddenHit.name } : null,
      violated: outsideAllowed || forbiddenHit !== null,
    };
  }

  /** Identifiants des positions GPS situées dans une zone — utilisé par le filtre « zone » des rapports. */
  async gpsPositionIdsInZone(organizationId: string, zoneId: string, limit: number): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT p.id::text AS id
      FROM gps_positions p
      JOIN vehicles v ON v.id = p."vehicleId"
      JOIN zones z ON z.id = ${zoneId}::uuid
      WHERE v."organizationId" = ${organizationId}
        AND z."organizationId" = ${organizationId}
        AND z."deletedAt" IS NULL
        AND z.geom IS NOT NULL
        AND ST_Contains(z.geom, ST_SetSRID(ST_MakePoint(p.longitude, p.latitude), 4326))
      ORDER BY p."recordedAt" DESC
      LIMIT ${limit}
    `;
    return rows.map((r) => r.id);
  }
}
