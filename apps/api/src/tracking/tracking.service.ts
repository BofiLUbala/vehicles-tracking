import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlertLevel, AlertType, MissionStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeEventsService } from './realtime-events.service';
import { CreatePositionDto } from './dto/create-position.dto';
import { QueryTraceDto } from './dto/query-trace.dto';
import { haversineDistanceMeters } from '../common/geo.util';
import { wrongDriverPositionError } from './tracking.errors';

const DEFAULT_MAX_PLAUSIBLE_SPEED_KMH = 150;
const DEFAULT_OFFLINE_THRESHOLD_MINUTES = 5;
/** Vitesse (km/h) en-dessous de laquelle un véhicule "vu récemment" est considéré STOPPED plutôt que MOVING. */
const MOVING_SPEED_THRESHOLD_KMH = 3;
/** Fenêtre (minutes) pendant laquelle une alerte IMPOSSIBLE_SPEED/MOCK_GPS récente rend un véhicule SUSPICIOUS sur /live. */
const SUSPICIOUS_ALERT_WINDOW_MINUTES = 30;

export type PositionIngestResultStatus = 'created' | 'duplicate' | 'rejected';

export interface PositionIngestResult {
  clientEventId: string;
  status: PositionIngestResultStatus;
  reason?: string;
}

/**
 * Ingestion des positions GPS + projections dérivées (spec section 11/12).
 *
 * Géofencing (déviation d'itinéraire, zones interdites) explicitement HORS PÉRIMÈTRE : aucune
 * table de polygones de zones n'existe encore — voir TODO Phase 4 dans docs/PHASE3_NOTES.md.
 */
@Injectable()
export class TrackingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly realtime: RealtimeEventsService,
  ) {}

  private maxPlausibleSpeedKmh(): number {
    const configured = Number(this.config.get<string>('MAX_PLAUSIBLE_SPEED_KMH'));
    return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_MAX_PLAUSIBLE_SPEED_KMH;
  }

  private offlineThresholdMinutes(): number {
    const configured = Number(this.config.get<string>('VEHICLE_OFFLINE_THRESHOLD_MINUTES'));
    return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_OFFLINE_THRESHOLD_MINUTES;
  }

  /**
   * Écrit la colonne géométrique PostGIS `geom` en SQL brut — même motif que
   * `LocationsService.setGeom` (Prisma ne modélise pas les types géométriques).
   */
  private async setGeom(positionId: string, latitude: number, longitude: number) {
    await this.prisma.$executeRaw`
      UPDATE gps_positions
      SET geom = ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)
      WHERE id = ${positionId}::uuid
    `;
  }

  /** Le chauffeur doit être actuellement affecté à `vehicleId` (et à `missionId` s'il est fourni). */
  private async assertDriverAssignment(driverId: string, vehicleId: string, missionId?: string) {
    const activeAssignment = await this.prisma.driverVehicleAssignment.findFirst({
      where: { driverId, endedAt: null },
      orderBy: { startedAt: 'desc' },
    });
    if (!activeAssignment || activeAssignment.vehicleId !== vehicleId) {
      throw wrongDriverPositionError("Le véhicule actuellement affecté à ce chauffeur ne correspond pas à celui de la position soumise");
    }

    if (missionId) {
      const mission = await this.prisma.mission.findUnique({ where: { id: missionId } });
      if (!mission || mission.driverId !== driverId || mission.vehicleId !== vehicleId) {
        throw wrongDriverPositionError("Cette mission n'est pas affectée à ce chauffeur/véhicule");
      }
    }
  }

  /**
   * Ingère une position unique. Ne lève JAMAIS pour un jump de vitesse impossible ou un mock GPS —
   * ces cas créent une `Alert` mais la position est toujours stockée (on ne perd jamais de données
   * GPS). Seule l'affectation chauffeur/véhicule invalide (403) empêche le stockage.
   */
  async ingestOne(driverId: string, organizationId: string, dto: CreatePositionDto) {
    const existing = await this.prisma.gpsPosition.findUnique({ where: { clientEventId: dto.clientEventId } });
    if (existing) {
      return { position: existing, duplicate: true };
    }

    await this.assertDriverAssignment(driverId, dto.vehicleId, dto.missionId);

    // Dernière position connue du véhicule (pour le calcul de vitesse implicite) — lue AVANT insertion.
    const previous = await this.prisma.gpsPosition.findFirst({
      where: { vehicleId: dto.vehicleId },
      orderBy: { recordedAt: 'desc' },
    });

    const recordedAt = new Date(dto.recordedAt);

    const position = await this.prisma.gpsPosition.create({
      data: {
        vehicleId: dto.vehicleId,
        missionId: dto.missionId,
        clientEventId: dto.clientEventId,
        latitude: dto.latitude,
        longitude: dto.longitude,
        accuracy: dto.accuracy,
        altitude: dto.altitude,
        speed: dto.speed,
        heading: dto.heading,
        isMocked: dto.isMocked,
        recordedAt,
      },
    });
    await this.setGeom(position.id, dto.latitude, dto.longitude).catch(() => undefined); // PostGIS peut être absent hors Docker

    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: dto.vehicleId } });

    await this.prisma.vehicleLatestPosition.upsert({
      where: { vehicleId: dto.vehicleId },
      create: {
        vehicleId: dto.vehicleId,
        latitude: dto.latitude,
        longitude: dto.longitude,
        speed: dto.speed,
        heading: dto.heading,
        status: vehicle?.status ?? 'AVAILABLE',
      },
      update: {
        latitude: dto.latitude,
        longitude: dto.longitude,
        speed: dto.speed,
        heading: dto.heading,
        status: vehicle?.status ?? 'AVAILABLE',
      },
    });

    this.realtime.emitPositionUpdated({
      organizationId,
      vehicleId: dto.vehicleId,
      missionId: dto.missionId,
      latitude: dto.latitude,
      longitude: dto.longitude,
      speed: dto.speed,
      heading: dto.heading,
      recordedAt: recordedAt.toISOString(),
    });

    // isMocked=true : accepté quand même, Alert basse sévérité (non bloquant).
    if (dto.isMocked) {
      const alert = await this.prisma.alert.create({
        data: {
          type: AlertType.MOCK_GPS,
          level: AlertLevel.LOW,
          message: 'Position GPS potentiellement simulée (mock location) signalée par le device',
          driverId,
          vehicleId: dto.vehicleId,
          missionId: dto.missionId,
        },
      });
      this.realtime.emitAlertCreated({
        organizationId,
        alertId: alert.id,
        type: alert.type,
        level: alert.level,
        vehicleId: dto.vehicleId,
        driverId,
        missionId: dto.missionId,
      });
    }

    // Vitesse implicite entre cette position et la précédente position connue du véhicule.
    if (previous) {
      const distanceMeters = haversineDistanceMeters(previous.latitude, previous.longitude, dto.latitude, dto.longitude);
      const deltaSeconds = (recordedAt.getTime() - previous.recordedAt.getTime()) / 1000;
      if (deltaSeconds > 0) {
        const impliedSpeedKmh = (distanceMeters / 1000) / (deltaSeconds / 3600);
        const maxSpeed = this.maxPlausibleSpeedKmh();
        if (impliedSpeedKmh > maxSpeed) {
          const alert = await this.prisma.alert.create({
            data: {
              type: AlertType.SPEEDING,
              level: AlertLevel.MEDIUM,
              message: `Vitesse implicite impossible : ${impliedSpeedKmh.toFixed(1)} km/h entre deux positions successives (seuil ${maxSpeed} km/h)`,
              driverId,
              vehicleId: dto.vehicleId,
              missionId: dto.missionId,
            },
          });
          this.realtime.emitAlertCreated({
            organizationId,
            alertId: alert.id,
            type: alert.type,
            level: alert.level,
            vehicleId: dto.vehicleId,
            driverId,
            missionId: dto.missionId,
          });
        }
      }
    }

    return { position, duplicate: false };
  }

  /** `POST /tracking/positions` — position unique, lève en cas de rejet (403 chauffeur non affecté). */
  async ingestSingle(driverId: string, organizationId: string, dto: CreatePositionDto) {
    const { position } = await this.ingestOne(driverId, organizationId, dto);
    return position;
  }

  /**
   * `POST /tracking/positions/batch` — traite le tableau DANS L'ORDRE de `recordedAt` (indépendamment
   * de l'ordre de soumission), même validation par item ; ne lève jamais — chaque item obtient son
   * propre statut dans le tableau de résultat.
   */
  async ingestBatch(driverId: string, organizationId: string, positions: CreatePositionDto[]): Promise<PositionIngestResult[]> {
    const ordered = [...positions].sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());

    const results: PositionIngestResult[] = [];
    for (const dto of ordered) {
      try {
        const { duplicate } = await this.ingestOne(driverId, organizationId, dto);
        results.push({ clientEventId: dto.clientEventId, status: duplicate ? 'duplicate' : 'created' });
      } catch (err) {
        const reason = err instanceof Error ? err.message : 'Erreur inconnue';
        results.push({ clientEventId: dto.clientEventId, status: 'rejected', reason });
      }
    }
    return results;
  }

  /** `GET /tracking/vehicles/:id/latest` */
  async latestForVehicle(organizationId: string, vehicleId: string) {
    const vehicle = await this.prisma.vehicle.findFirst({ where: { id: vehicleId, organizationId } });
    if (!vehicle) throw new NotFoundException('Véhicule introuvable');

    const latest = await this.prisma.vehicleLatestPosition.findUnique({ where: { vehicleId } });
    if (!latest) throw new NotFoundException('Aucune position connue pour ce véhicule');
    return latest;
  }

  private async deriveVehicleStatus(vehicleId: string, latest: { latitude: number; speed: number | null; updatedAt: Date } | null) {
    const offlineThresholdMs = this.offlineThresholdMinutes() * 60_000;

    if (!latest || Date.now() - latest.updatedAt.getTime() > offlineThresholdMs) {
      return 'OFFLINE';
    }

    const suspiciousWindowStart = new Date(Date.now() - SUSPICIOUS_ALERT_WINDOW_MINUTES * 60_000);
    const suspiciousAlert = await this.prisma.alert.findFirst({
      where: {
        vehicleId,
        type: { in: [AlertType.SPEEDING, AlertType.MOCK_GPS] },
        createdAt: { gte: suspiciousWindowStart },
      },
    });
    if (suspiciousAlert) return 'SUSPICIOUS';

    const activeMission = await this.prisma.mission.findFirst({
      where: { vehicleId, status: { in: [MissionStatus.STARTED, MissionStatus.IN_PROGRESS] } },
    });
    if (activeMission) return 'ON_MISSION';

    if ((latest.speed ?? 0) > MOVING_SPEED_THRESHOLD_KMH) return 'MOVING';

    return 'STOPPED';
  }

  /**
   * `GET /tracking/vehicles/live` — org-scopé. Statut calculé à la volée (jamais persisté) :
   * MOVING (vert) / ON_MISSION (bleu) / STOPPED (orange) / OFFLINE (rouge) / SUSPICIOUS (violet),
   * conformément au code couleur de la section 12 du cahier des charges.
   *
   * Note : la colonne `VehicleLatestPosition.status` (typée `VehicleStatus` par le schéma Prisma,
   * ex: AVAILABLE/ON_MISSION/BROKEN_DOWN) reflète le statut "métier" du véhicule et NE PEUT PAS
   * porter les valeurs MOVING/STOPPED/SUSPICIOUS (enum différent) — le statut "live" ci-dessous est
   * donc dérivé à la lecture plutôt que stocké.
   */
  async liveVehicles(organizationId: string) {
    const vehicles = await this.prisma.vehicle.findMany({
      where: { organizationId, deletedAt: null },
      include: { latestPosition: true },
    });

    return Promise.all(
      vehicles.map(async (vehicle) => {
        const status = await this.deriveVehicleStatus(vehicle.id, vehicle.latestPosition);
        return {
          vehicleId: vehicle.id,
          plateNumber: vehicle.plateNumber,
          status,
          latestPosition: vehicle.latestPosition
            ? {
                latitude: vehicle.latestPosition.latitude,
                longitude: vehicle.latestPosition.longitude,
                speed: vehicle.latestPosition.speed,
                heading: vehicle.latestPosition.heading,
                updatedAt: vehicle.latestPosition.updatedAt,
              }
            : null,
        };
      }),
    );
  }

  private toGeoJsonTrace(vehicleId: string, missionId: string | null, positions: { latitude: number; longitude: number }[]) {
    return {
      type: 'Feature' as const,
      properties: { vehicleId, missionId },
      geometry: {
        type: 'LineString' as const,
        coordinates: positions.map((p) => [p.longitude, p.latitude]),
      },
    };
  }

  /** `GET /tracking/vehicles/:id/trace?from=&to=` — trace brute, non modifiée, ordre chronologique. */
  async vehicleTrace(organizationId: string, vehicleId: string, query: QueryTraceDto) {
    const vehicle = await this.prisma.vehicle.findFirst({ where: { id: vehicleId, organizationId } });
    if (!vehicle) throw new NotFoundException('Véhicule introuvable');

    const where: Prisma.GpsPositionWhereInput = { vehicleId };
    if (query.from || query.to) {
      where.recordedAt = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }

    const positions = await this.prisma.gpsPosition.findMany({ where, orderBy: { recordedAt: 'asc' } });
    return this.toGeoJsonTrace(vehicleId, null, positions);
  }

  /** `GET /tracking/missions/:id/trace` — trace brute, non modifiée, ordre chronologique. */
  async missionTrace(organizationId: string, missionId: string) {
    const mission = await this.prisma.mission.findFirst({ where: { id: missionId, organizationId } });
    if (!mission) throw new NotFoundException('Mission introuvable');

    const positions = await this.prisma.gpsPosition.findMany({ where: { missionId }, orderBy: { recordedAt: 'asc' } });
    return this.toGeoJsonTrace(mission.vehicleId, missionId, positions);
  }
}
