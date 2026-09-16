import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QueryMissionReportDto } from './dto/query-mission-report.dto';
import { QueryFuelReportDto } from './dto/query-fuel-report.dto';
import { QueryGpsReportDto } from './dto/query-gps-report.dto';
import { ReportColumn } from './export/export.types';
import { toCsv } from './export/csv.util';
import { toXlsx } from './export/xlsx.util';
import { toPdf } from './export/pdf.util';

/** Garde-fou volume : un export illimité de `gps_positions` — table à plus haut volume de l'appli —
 * épuiserait la mémoire du process. `limit` est plafonné à cette valeur. */
const REPORT_MAX_ROWS = 5000;

/** Lignes renvoyées par défaut quand l'appelant ne précise pas `limit`. */
const REPORT_DEFAULT_ROWS = 1000;

/**
 * Etat de pagination joint à chaque rapport.
 *
 * `truncated` répond à la question « ce que je regarde est-il complet ? » : auparavant un rapport
 * plafonné renvoyait silencieusement les N lignes les plus récentes, sans aucun moyen pour
 * l'appelant de savoir qu'il en manquait.
 */
export interface ReportMeta {
  limit: number;
  offset: number;
  returned: number;
  /** Des lignes existent au-delà de `offset + returned`. */
  hasMore: boolean;
  /** Synonyme explicite de `hasMore`, du point de vue « ce rapport est incomplet ». */
  truncated: boolean;
  /** Plafond dur du serveur, pour que l'appelant sache jusqu'où `limit` peut monter. */
  maxRows: number;
}

export interface ExportResult {
  contentType: string;
  filename: string;
  body: Buffer | string | Record<string, unknown>[];
  meta: ReportMeta;
}

interface Paging {
  limit: number;
  offset: number;
}

interface PagedRows<T> {
  rows: T[];
  meta: ReportMeta;
}

/** Résout `limit`/`offset` en bornant `limit` au plafond serveur. */
function resolvePaging(query: { limit?: number; offset?: number }): Paging {
  const limit = Math.min(query.limit ?? REPORT_DEFAULT_ROWS, REPORT_MAX_ROWS);
  return { limit, offset: query.offset ?? 0 };
}

/**
 * Une ligne de plus que `limit` est demandée à la base : sa présence prouve qu'il en reste au-delà,
 * sans avoir à exécuter un `count(*)` séparé sur des tables volumineuses.
 */
function toPaged<T>(fetched: T[], paging: Paging): PagedRows<T> {
  const hasMore = fetched.length > paging.limit;
  const rows = hasMore ? fetched.slice(0, paging.limit) : fetched;
  return {
    rows,
    meta: {
      limit: paging.limit,
      offset: paging.offset,
      returned: rows.length,
      hasMore,
      truncated: hasMore,
      maxRows: REPORT_MAX_ROWS,
    },
  };
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------
  // Rapport missions
  // ---------------------------------------------------------------------

  private async missionRows(organizationId: string, query: QueryMissionReportDto) {
    const paging = resolvePaging(query);
    const where: Prisma.MissionWhereInput = { organizationId };
    if (query.vehicleId) where.vehicleId = query.vehicleId;
    if (query.driverId) where.driverId = query.driverId;
    if (query.status) where.status = query.status;
    if (query.locationId) where.steps = { some: { locationId: query.locationId } };
    if (query.from || query.to) {
      where.plannedStart = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }

    const missions = await this.prisma.mission.findMany({
      where,
      include: {
        driver: true,
        vehicle: true,
        steps: { include: { location: true }, orderBy: { order: 'asc' } },
      },
      orderBy: { plannedStart: 'desc' },
      skip: paging.offset,
      take: paging.limit + 1,
    });

    const paged = toPaged(missions, paging);
    const rows = paged.rows.map((m) => ({
      id: m.id,
      status: m.status,
      driverName: `${m.driver.firstName} ${m.driver.lastName}`.trim(),
      driverId: m.driverId,
      vehiclePlate: m.vehicle.plateNumber,
      vehicleId: m.vehicleId,
      plannedStart: m.plannedStart,
      plannedEnd: m.plannedEnd,
      actualStart: m.actualStart,
      actualEnd: m.actualEnd,
      stepCount: m.steps.length,
      locations: m.steps.map((s) => s.location.name).join(' | '),
      createdAt: m.createdAt,
    }));
    return { rows, meta: paged.meta };
  }

  private missionColumns(): ReportColumn<Awaited<ReturnType<ReportsService['missionRows']>>['rows'][number]>[] {
    return [
      { key: 'id', header: 'ID mission' },
      { key: 'status', header: 'Statut' },
      { key: 'driverName', header: 'Chauffeur' },
      { key: 'vehiclePlate', header: 'Véhicule' },
      { key: 'plannedStart', header: 'Début planifié' },
      { key: 'plannedEnd', header: 'Fin planifiée' },
      { key: 'actualStart', header: 'Début réel' },
      { key: 'actualEnd', header: 'Fin réelle' },
      { key: 'stepCount', header: "Nombre d'étapes" },
      { key: 'locations', header: 'Points de collecte / dépôt' },
      { key: 'createdAt', header: 'Créée le' },
    ];
  }

  async missionsReport(organizationId: string, query: QueryMissionReportDto): Promise<ExportResult> {
    const { rows, meta } = await this.missionRows(organizationId, query);
    return this.export(rows, meta, this.missionColumns(), query.format, 'rapport-missions');
  }

  // ---------------------------------------------------------------------
  // Rapport carburant
  // ---------------------------------------------------------------------

  private async fuelRows(organizationId: string, query: QueryFuelReportDto) {
    const paging = resolvePaging(query);
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

    const records = await this.prisma.fuelRecord.findMany({
      where,
      include: { vehicle: true, driver: true },
      orderBy: { createdAt: 'desc' },
      skip: paging.offset,
      take: paging.limit + 1,
    });

    const paged = toPaged(records, paging);
    const rows = paged.rows.map((r) => ({
      id: r.id,
      vehiclePlate: r.vehicle.plateNumber,
      vehicleId: r.vehicleId,
      driverName: `${r.driver.firstName} ${r.driver.lastName}`.trim(),
      driverId: r.driverId,
      liters: r.liters,
      totalCost: r.totalCost,
      odometer: r.odometer,
      fuelType: r.fuelType,
      stationName: r.stationName,
      createdAt: r.createdAt,
    }));
    return { rows, meta: paged.meta };
  }

  private fuelColumns(): ReportColumn<Awaited<ReturnType<ReportsService['fuelRows']>>['rows'][number]>[] {
    return [
      { key: 'id', header: 'ID déclaration' },
      { key: 'vehiclePlate', header: 'Véhicule' },
      { key: 'driverName', header: 'Chauffeur' },
      { key: 'liters', header: 'Litres' },
      { key: 'totalCost', header: 'Coût total' },
      { key: 'odometer', header: 'Odomètre (km)' },
      { key: 'fuelType', header: 'Type de carburant' },
      { key: 'stationName', header: 'Station' },
      { key: 'createdAt', header: 'Date' },
    ];
  }

  async fuelReport(organizationId: string, query: QueryFuelReportDto): Promise<ExportResult> {
    const { rows, meta } = await this.fuelRows(organizationId, query);
    return this.export(rows, meta, this.fuelColumns(), query.format, 'rapport-carburant');
  }

  // ---------------------------------------------------------------------
  // Rapport positions GPS (optionnel — priorité moindre, voir consigne Phase 5)
  // ---------------------------------------------------------------------

  private async gpsRows(organizationId: string, query: QueryGpsReportDto) {
    const paging = resolvePaging(query);
    const vehicles = await this.prisma.vehicle.findMany({ where: { organizationId }, select: { id: true } });
    const orgVehicleIds = vehicles.map((v) => v.id);

    const where: Prisma.GpsPositionWhereInput = {
      vehicleId: query.vehicleId ? query.vehicleId : { in: orgVehicleIds },
    };
    if (query.missionId) where.missionId = query.missionId;
    if (query.from || query.to) {
      where.recordedAt = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }

    const positions = await this.prisma.gpsPosition.findMany({
      where,
      include: { vehicle: true },
      orderBy: { recordedAt: 'desc' },
      skip: paging.offset,
      take: paging.limit + 1,
    });

    const paged = toPaged(positions, paging);
    const rows = paged.rows.map((p) => ({
      id: p.id,
      vehiclePlate: p.vehicle.plateNumber,
      vehicleId: p.vehicleId,
      missionId: p.missionId,
      latitude: p.latitude,
      longitude: p.longitude,
      speed: p.speed,
      accuracy: p.accuracy,
      isMocked: p.isMocked,
      recordedAt: p.recordedAt,
    }));
    return { rows, meta: paged.meta };
  }

  private gpsColumns(): ReportColumn<Awaited<ReturnType<ReportsService['gpsRows']>>['rows'][number]>[] {
    return [
      { key: 'id', header: 'ID position' },
      { key: 'vehiclePlate', header: 'Véhicule' },
      { key: 'missionId', header: 'Mission' },
      { key: 'latitude', header: 'Latitude' },
      { key: 'longitude', header: 'Longitude' },
      { key: 'speed', header: 'Vitesse (km/h)' },
      { key: 'accuracy', header: 'Précision (m)' },
      { key: 'isMocked', header: 'Position simulée (mock GPS)' },
      { key: 'recordedAt', header: 'Horodatage' },
    ];
  }

  async gpsPositionsReport(organizationId: string, query: QueryGpsReportDto): Promise<ExportResult> {
    const { rows, meta } = await this.gpsRows(organizationId, query);
    return this.export(rows, meta, this.gpsColumns(), query.format, 'rapport-positions-gps');
  }

  // ---------------------------------------------------------------------
  // Dispatch d'export commun aux trois rapports
  // ---------------------------------------------------------------------

  private async export<T>(
    rows: T[],
    meta: ReportMeta,
    columns: ReportColumn<T>[],
    format: string | undefined,
    baseFilename: string,
  ): Promise<ExportResult> {
    const fmt = format ?? 'json';
    switch (fmt) {
      case 'csv':
        return { contentType: 'text/csv; charset=utf-8', filename: `${baseFilename}.csv`, body: toCsv(rows, columns), meta };
      case 'xlsx':
        return {
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          filename: `${baseFilename}.xlsx`,
          body: await toXlsx(rows, columns, baseFilename),
          meta,
        };
      case 'pdf':
        return { contentType: 'application/pdf', filename: `${baseFilename}.pdf`, body: await toPdf(rows, columns, baseFilename), meta };
      case 'json':
      default:
        return {
          contentType: 'application/json; charset=utf-8',
          filename: `${baseFilename}.json`,
          body: rows as unknown as Record<string, unknown>[],
          meta,
        };
    }
  }
}
