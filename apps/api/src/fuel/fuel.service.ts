import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlertLevel, AlertType, LocationType, Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { FilesService } from '../files/files.service';
import { RealtimeEventsService } from '../tracking/realtime-events.service';
import { haversineDistanceMeters } from '../common/geo.util';
import { ALERT_SCORE_POINTS, buildAlertScore, ScoreBreakdownEntry } from '../common/alert-score.util';
import { CreateFuelRecordMetadataDto } from './dto/create-fuel-record-metadata.dto';
import { QueryFuelRecordsDto } from './dto/query-fuel-records.dto';
import { FuelSummaryQueryDto } from './dto/fuel-summary-query.dto';

const DEFAULT_MAX_PLAUSIBLE_FUEL_CONSUMPTION_L_PER_100KM = 40;
const DEFAULT_MIN_HOURS_BETWEEN_FUEL_RECORDS = 2;
/** Distance (mètres) au-delà de laquelle un plein est jugé "loin" de toute station autorisée connue — valeur fixe du cahier des charges (section 14), pas un env var. */
const AUTHORIZED_GAS_STATION_MAX_DISTANCE_METERS = 5000;

export const FUEL_RECEIPT_RELATED_TO = 'FuelRecordReceipt';
export const FUEL_ODOMETER_PHOTO_RELATED_TO = 'FuelRecordOdometerPhoto';

interface DetectedAnomaly {
  alertId: string;
  type: AlertType;
  level: AlertLevel;
  message: string;
  score: number;
  scoreBreakdown: ScoreBreakdownEntry[];
}

/**
 * Déclarations de carburant (spec section 14). Règle d'or : une déclaration n'est JAMAIS rejetée
 * pour cause d'anomalie — les anomalies détectées créent des `Alert` (type FUEL_ANOMALY) mais la
 * ligne `FuelRecord` et les deux photos (reçu + odomètre) sont toujours acceptées et stockées
 * (on ne perd jamais de preuve). Seule une affectation chauffeur/véhicule invalide, ou l'absence
 * d'une des deux photos, est rejetée (400/403) — voir docs/PHASE4_NOTES.md.
 */
@Injectable()
export class FuelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly files: FilesService,
    private readonly config: ConfigService,
    private readonly realtime: RealtimeEventsService,
  ) {}

  private maxPlausibleConsumption(): number {
    const configured = Number(this.config.get<string>('MAX_PLAUSIBLE_FUEL_CONSUMPTION_L_PER_100KM'));
    return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_MAX_PLAUSIBLE_FUEL_CONSUMPTION_L_PER_100KM;
  }

  private minHoursBetweenRecords(): number {
    const configured = Number(this.config.get<string>('MIN_HOURS_BETWEEN_FUEL_RECORDS'));
    return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_MIN_HOURS_BETWEEN_FUEL_RECORDS;
  }

  private async assertDriverAssignedToVehicle(driverId: string, vehicleId: string) {
    const activeAssignment = await this.prisma.driverVehicleAssignment.findFirst({
      where: { driverId, endedAt: null },
      orderBy: { startedAt: 'desc' },
    });
    if (!activeAssignment || activeAssignment.vehicleId !== vehicleId) {
      throw new ForbiddenException("Le véhicule actuellement affecté à ce chauffeur ne correspond pas à celui de la déclaration");
    }
  }

  private async createAnomalyAlert(params: {
    organizationId: string;
    vehicleId: string;
    driverId: string;
    fuelRecordId: string;
    level: AlertLevel;
    message: string;
    entries: ScoreBreakdownEntry[];
  }): Promise<DetectedAnomaly> {
    const { score, breakdown } = buildAlertScore(params.entries);
    const alert = await this.prisma.alert.create({
      data: {
        type: AlertType.FUEL_ANOMALY,
        level: params.level,
        score,
        scoreBreakdown: breakdown as unknown as Prisma.InputJsonValue,
        message: params.message,
        driverId: params.driverId,
        vehicleId: params.vehicleId,
      },
    });
    this.realtime.emitAlertCreated({
      organizationId: params.organizationId,
      alertId: alert.id,
      type: alert.type,
      level: alert.level,
      vehicleId: params.vehicleId,
      driverId: params.driverId,
    });
    return { alertId: alert.id, type: alert.type, level: alert.level, message: params.message, score, scoreBreakdown: breakdown };
  }

  /**
   * `POST /fuel-records` — chauffeur uniquement, multipart (metadata + receipt + odometerPhoto).
   *
   * Ordre : 1) affectation chauffeur/véhicule, 2) photos obligatoires, 3) création du FuelRecord
   * (toujours, quoi qu'il arrive ensuite), 4) upload des deux photos, 5) détection d'anomalies
   * (chacune crée une Alert non bloquante).
   */
  async create(
    driverId: string,
    organizationId: string,
    dto: CreateFuelRecordMetadataDto,
    receiptPhoto?: Express.Multer.File,
    odometerPhoto?: Express.Multer.File,
  ) {
    const vehicle = await this.prisma.vehicle.findFirst({ where: { id: dto.vehicleId, organizationId, deletedAt: null } });
    if (!vehicle) throw new NotFoundException('Véhicule introuvable');

    await this.assertDriverAssignedToVehicle(driverId, dto.vehicleId);

    if (!receiptPhoto) throw new BadRequestException('La photo du reçu ("receipt") est obligatoire');
    if (!odometerPhoto) throw new BadRequestException('La photo du compteur kilométrique ("odometerPhoto") est obligatoire');

    // Dernière déclaration connue pour ce véhicule (lue AVANT insertion) — sert de référence pour
    // la distance parcourue et le contrôle "trop rapproché".
    const previous = await this.prisma.fuelRecord.findFirst({
      where: { vehicleId: dto.vehicleId },
      orderBy: { createdAt: 'desc' },
    });

    let distanceKm: number | null = null;
    let consumptionL100km: number | null = null;
    if (previous) {
      distanceKm = dto.odometer - previous.odometer;
      // Consommation calculée uniquement si la distance est positive et exploitable — un odomètre
      // régressif est déjà signalé séparément comme anomalie ci-dessous.
      if (distanceKm > 0) {
        consumptionL100km = (dto.liters / distanceKm) * 100;
      }
    }

    const record = await this.prisma.fuelRecord.create({
      data: {
        vehicleId: dto.vehicleId,
        driverId,
        liters: dto.liters,
        totalCost: dto.totalCost,
        odometer: dto.odometer,
        fuelType: dto.fuelType,
        stationName: dto.stationName,
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
    });

    // Déduplication de reçu par hash SHA-256 — même motif que FilesService, calculé ici pour pouvoir
    // détecter la réutilisation AVANT que ce nouvel upload ne devienne lui-même "le" fichier trouvé.
    const receiptHash = createHash('sha256').update(receiptPhoto.buffer).digest('hex');
    const reusedReceipt = await this.prisma.file.findFirst({
      where: { hash: receiptHash, relatedTo: FUEL_RECEIPT_RELATED_TO },
    });

    const receiptFile = await this.files.uploadFile({
      buffer: receiptPhoto.buffer,
      mimeType: receiptPhoto.mimetype,
      relatedTo: FUEL_RECEIPT_RELATED_TO,
      relatedId: record.id,
      uploadedById: driverId,
    });
    await this.files.uploadFile({
      buffer: odometerPhoto.buffer,
      mimeType: odometerPhoto.mimetype,
      relatedTo: FUEL_ODOMETER_PHOTO_RELATED_TO,
      relatedId: record.id,
      uploadedById: driverId,
    });
    await this.prisma.fuelRecord.update({ where: { id: record.id }, data: { receiptFileId: receiptFile.id } });

    const anomalies: DetectedAnomaly[] = [];

    // 1. Odomètre inférieur au précédent plein — physiquement impossible.
    if (previous && distanceKm !== null && distanceKm < 0) {
      anomalies.push(
        await this.createAnomalyAlert({
          organizationId,
          vehicleId: dto.vehicleId,
          driverId,
          fuelRecordId: record.id,
          level: AlertLevel.HIGH,
          message: `Odomètre (${dto.odometer} km) inférieur au précédent plein (${previous.odometer} km) — impossible`,
          entries: [
            {
              reason: `Odomètre régressif : ${dto.odometer} km < ${previous.odometer} km (plein précédent)`,
              points: ALERT_SCORE_POINTS.FUEL_ODOMETER_REGRESSION,
            },
          ],
        }),
      );
    }

    // 2. Consommation implausible.
    const maxConsumption = this.maxPlausibleConsumption();
    if (consumptionL100km !== null && consumptionL100km > maxConsumption) {
      anomalies.push(
        await this.createAnomalyAlert({
          organizationId,
          vehicleId: dto.vehicleId,
          driverId,
          fuelRecordId: record.id,
          level: AlertLevel.MEDIUM,
          message: `Consommation implausible : ${consumptionL100km.toFixed(1)} L/100km (seuil ${maxConsumption} L/100km)`,
          entries: [
            {
              reason: `Consommation ${consumptionL100km.toFixed(1)} L/100km > seuil ${maxConsumption} L/100km`,
              points: ALERT_SCORE_POINTS.FUEL_EXCESSIVE_CONSUMPTION,
            },
          ],
        }),
      );
    }

    // 3. Litres > capacité du réservoir du véhicule (si connue).
    if (vehicle.tankCapacity != null && dto.liters > vehicle.tankCapacity) {
      anomalies.push(
        await this.createAnomalyAlert({
          organizationId,
          vehicleId: dto.vehicleId,
          driverId,
          fuelRecordId: record.id,
          level: AlertLevel.MEDIUM,
          message: `Litres déclarés (${dto.liters} L) supérieurs à la capacité du réservoir (${vehicle.tankCapacity} L)`,
          entries: [
            {
              reason: `${dto.liters} L déclarés > capacité réservoir ${vehicle.tankCapacity} L`,
              points: ALERT_SCORE_POINTS.FUEL_OVER_TANK_CAPACITY,
            },
          ],
        }),
      );
    }

    // 4. Deux déclarations trop rapprochées dans le temps pour le même véhicule.
    if (previous) {
      const hoursSincePrevious = (record.createdAt.getTime() - previous.createdAt.getTime()) / 3_600_000;
      const minHours = this.minHoursBetweenRecords();
      if (hoursSincePrevious < minHours) {
        anomalies.push(
          await this.createAnomalyAlert({
            organizationId,
            vehicleId: dto.vehicleId,
            driverId,
            fuelRecordId: record.id,
            level: AlertLevel.MEDIUM,
            message: `Deux déclarations de carburant en moins de ${minHours}h pour ce véhicule (${hoursSincePrevious.toFixed(2)}h d'écart)`,
            entries: [
              {
                reason: `${hoursSincePrevious.toFixed(2)}h depuis la précédente déclaration (seuil ${minHours}h)`,
                points: ALERT_SCORE_POINTS.FUEL_TOO_SOON,
              },
            ],
          }),
        );
      }
    }

    // 5. Reçu (hash) déjà utilisé pour une autre déclaration.
    if (reusedReceipt && reusedReceipt.relatedId !== record.id) {
      anomalies.push(
        await this.createAnomalyAlert({
          organizationId,
          vehicleId: dto.vehicleId,
          driverId,
          fuelRecordId: record.id,
          level: AlertLevel.HIGH,
          message: 'Photo de reçu identique (même contenu) déjà utilisée pour une autre déclaration de carburant',
          entries: [{ reason: 'Hash SHA-256 du reçu déjà vu sur une autre déclaration', points: ALERT_SCORE_POINTS.FUEL_RECEIPT_REUSED }],
        }),
      );
    }

    // 6. Position loin de toute station-service autorisée connue — contrôle "souple" : ignoré si
    // aucune station AUTHORIZED_GAS_STATION n'existe encore pour l'organisation (rien à comparer).
    if (dto.latitude != null && dto.longitude != null) {
      const stations = await this.prisma.location.findMany({
        where: { organizationId, type: LocationType.AUTHORIZED_GAS_STATION, deletedAt: null },
      });
      if (stations.length > 0) {
        const distances = stations.map((s) => haversineDistanceMeters(dto.latitude!, dto.longitude!, s.latitude, s.longitude));
        const nearestMeters = Math.min(...distances);
        if (nearestMeters > AUTHORIZED_GAS_STATION_MAX_DISTANCE_METERS) {
          anomalies.push(
            await this.createAnomalyAlert({
              organizationId,
              vehicleId: dto.vehicleId,
              driverId,
              fuelRecordId: record.id,
              level: AlertLevel.LOW,
              message: `Plein effectué à ${(nearestMeters / 1000).toFixed(1)} km de la station autorisée la plus proche (seuil ${AUTHORIZED_GAS_STATION_MAX_DISTANCE_METERS / 1000} km)`,
              entries: [
                {
                  reason: `${(nearestMeters / 1000).toFixed(1)} km de la station autorisée la plus proche`,
                  points: ALERT_SCORE_POINTS.FUEL_FAR_FROM_STATION,
                },
              ],
            }),
          );
        }
      }
    }

    return {
      record: await this.prisma.fuelRecord.findUniqueOrThrow({ where: { id: record.id } }),
      distanceKm,
      consumptionL100km,
      anomalies,
    };
  }

  /** `GET /fuel-records` — org-scopé (via le véhicule), filtrable vehicle/driver/date. */
  async findAll(organizationId: string, query: QueryFuelRecordsDto) {
    const vehicles = await this.prisma.vehicle.findMany({ where: { organizationId }, select: { id: true } });
    const orgVehicleIds = vehicles.map((v) => v.id);

    const where: Prisma.FuelRecordWhereInput = {
      vehicleId: query.vehicleId ? query.vehicleId : { in: orgVehicleIds },
    };
    if (query.driverId) where.driverId = query.driverId;
    if (query.from || query.to) {
      where.createdAt = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }

    return this.prisma.fuelRecord.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  /** `GET /fuel-records/:id` — org-scopé. */
  async findOne(organizationId: string, id: string) {
    const record = await this.prisma.fuelRecord.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Déclaration de carburant introuvable');
    const vehicle = await this.prisma.vehicle.findFirst({ where: { id: record.vehicleId, organizationId } });
    if (!vehicle) throw new NotFoundException('Déclaration de carburant introuvable');
    return record;
  }

  /**
   * `GET /vehicles/:id/fuel-summary` — total litres/coût + consommation moyenne (L/100km) sur la
   * période. La consommation moyenne est dérivée des écarts d'odomètre CONSÉCUTIFS à l'intérieur de
   * la période demandée (le premier enregistrement de la période ne contribue qu'aux totaux, faute
   * de référence antérieure DANS la période).
   */
  async fuelSummary(organizationId: string, vehicleId: string, query: FuelSummaryQueryDto) {
    const vehicle = await this.prisma.vehicle.findFirst({ where: { id: vehicleId, organizationId } });
    if (!vehicle) throw new NotFoundException('Véhicule introuvable');

    const where: Prisma.FuelRecordWhereInput = { vehicleId };
    if (query.from || query.to) {
      where.createdAt = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }

    const records = await this.prisma.fuelRecord.findMany({ where, orderBy: { createdAt: 'asc' } });

    const totalLiters = records.reduce((sum, r) => sum + r.liters, 0);
    const totalCost = records.reduce((sum, r) => sum + r.totalCost, 0);

    let totalDistanceKm = 0;
    let litersOverDistance = 0;
    for (let i = 1; i < records.length; i++) {
      const distance = records[i].odometer - records[i - 1].odometer;
      if (distance > 0) {
        totalDistanceKm += distance;
        litersOverDistance += records[i].liters;
      }
    }

    const averageConsumptionL100km = totalDistanceKm > 0 ? (litersOverDistance / totalDistanceKm) * 100 : null;

    return {
      vehicleId,
      recordCount: records.length,
      totalLiters,
      totalCost,
      totalDistanceKm,
      averageConsumptionL100km,
    };
  }

  /** `GET /vehicles/:id/fuel-anomalies` — alertes FUEL_ANOMALY de ce véhicule, org-scopé. */
  async fuelAnomalies(organizationId: string, vehicleId: string) {
    const vehicle = await this.prisma.vehicle.findFirst({ where: { id: vehicleId, organizationId } });
    if (!vehicle) throw new NotFoundException('Véhicule introuvable');

    return this.prisma.alert.findMany({
      where: { vehicleId, type: AlertType.FUEL_ANOMALY },
      orderBy: { createdAt: 'desc' },
    });
  }
}
