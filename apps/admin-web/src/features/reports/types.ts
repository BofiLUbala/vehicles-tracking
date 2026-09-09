/**
 * Contrat REST du module rapports (`apps/api/src/reports`). Réconcilié avec l'implémentation réelle
 * (`apps/api/src/reports/reports.service.ts`) — les noms de champs ci-dessous correspondent
 * exactement à `missionRows()`/`fuelRows()`, pas à une supposition.
 */

export type ReportFormat = 'csv' | 'xlsx' | 'pdf' | 'json';

export type MissionReportStatus =
  | 'PLANNED'
  | 'ASSIGNED'
  | 'STARTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'LATE'
  | 'SUSPICIOUS'
  | 'NOT_COMPLETED';

export interface MissionReportFilters {
  from?: string;
  to?: string;
  vehicleId?: string;
  driverId?: string;
  status?: MissionReportStatus;
  locationId?: string;
}

export interface FuelReportFilters {
  from?: string;
  to?: string;
  vehicleId?: string;
  driverId?: string;
}

/** Forme brute d'une ligne renvoyée par `GET /reports/missions?format=json`. */
export interface MissionReportRow {
  id: string;
  status: MissionReportStatus;
  driverName: string;
  driverId: string;
  vehiclePlate: string;
  vehicleId: string;
  plannedStart: string | null;
  plannedEnd: string | null;
  actualStart: string | null;
  actualEnd: string | null;
  stepCount: number;
  locations: string;
  createdAt: string;
}

/** Forme brute d'une ligne renvoyée par `GET /reports/fuel?format=json`. */
export interface FuelReportRow {
  id: string;
  vehiclePlate: string;
  vehicleId: string;
  driverName: string;
  driverId: string;
  liters: number;
  totalCost: number;
  odometer: number;
  fuelType: string;
  stationName: string | null;
  createdAt: string;
}

export type ReportType = 'missions' | 'fuel';
