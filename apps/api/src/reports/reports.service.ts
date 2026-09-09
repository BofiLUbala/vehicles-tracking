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

/** Garde-fou volume (section 20 ne fixe pas de limite, mais un export illimité de `gps_positions`
 * — table à plus haut volume de l'appli, voir TODO partitionnement — pourrait épuiser la mémoire
 * du process ; voir docs/PHASE5_NOTES.md pour la justification et la piste de pagination future). */
const REPORT_MAX_ROWS = 5000;

export interface ExportResult {
  contentType: string;
  filename: string;
  body: Buffer | string | Record<string, unknown>[];
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------
  // Rapport missions
  // ---------------------------------------------------------------------

  private async missionRows(organizationId: string, query: QueryMissionReportDto) {
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
      take: REPORT_MAX_ROWS,
    });

    return missions.map((m) => ({
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
  }

  private missionColumns(): ReportColumn<Awaited<ReturnType<ReportsService['missionRows']>>[number]>[] {
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
    const rows = await this.missionRows(organizationId, query);
    return this.export(rows, this.missionColumns(), query.format, 'rapport-missions');
  }

  // ---------------------------------------------------------------------
  // Rapport carburant
  // ---------------------------------------------------------------------

  private async fuelRows(organizationId: string, query: QueryFuelReportDto) {
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
      take: REPORT_MAX_ROWS,
    });

    return records.map((r) => ({
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
  }

  private fuelColumns(): ReportColumn<Awaited<ReturnType<ReportsService['fuelRows']>>[number]>[] {
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
    const rows = await this.fuelRows(organizationId, query);
    return this.export(rows, this.fuelColumns(), query.format, 'rapport-carburant');
  }

  // ---------------------------------------------------------------------
  // Rapport positions GPS (optionnel — priorité moindre, voir consigne Phase 5)
  // ---------------------------------------------------------------------

  private async gpsRows(organizationId: string, query: QueryGpsReportDto) {
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
      take: REPORT_MAX_ROWS,
    });

    return positions.map((p) => ({
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
  }

  private gpsColumns(): ReportColumn<Awaited<ReturnType<ReportsService['gpsRows']>>[number]>[] {
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
    const rows = await this.gpsRows(organizationId, query);
    return this.export(rows, this.gpsColumns(), query.format, 'rapport-positions-gps');
  }

  // ---------------------------------------------------------------------
  // Dispatch d'export commun aux trois rapports
  // ---------------------------------------------------------------------

  private async export<T>(
    rows: T[],
    columns: ReportColumn<T>[],
    format: string | undefined,
    baseFilename: string,
  ): Promise<ExportResult> {
    const fmt = format ?? 'json';
    switch (fmt) {
      case 'csv':
        return { contentType: 'text/csv; charset=utf-8', filename: `${baseFilename}.csv`, body: toCsv(rows, columns) };
      case 'xlsx':
        return {
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          filename: `${baseFilename}.xlsx`,
          body: await toXlsx(rows, columns, baseFilename),
        };
      case 'pdf':
        return { contentType: 'application/pdf', filename: `${baseFilename}.pdf`, body: await toPdf(rows, columns, baseFilename) };
      case 'json':
      default:
        return { contentType: 'application/json; charset=utf-8', filename: `${baseFilename}.json`, body: rows as unknown as Record<string, unknown>[] };
    }
  }
}
