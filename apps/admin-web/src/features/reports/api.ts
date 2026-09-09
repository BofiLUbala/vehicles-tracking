import { apiClient } from '@/lib/api-client';
import type {
  FuelReportFilters,
  FuelReportRow,
  MissionReportFilters,
  MissionReportRow,
  ReportFormat,
  ReportType,
} from '@/features/reports/types';

function buildMissionParams(filters: MissionReportFilters): Record<string, string> {
  const params: Record<string, string> = {};
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  if (filters.vehicleId) params.vehicleId = filters.vehicleId;
  if (filters.driverId) params.driverId = filters.driverId;
  if (filters.status) params.status = filters.status;
  if (filters.locationId) params.locationId = filters.locationId;
  return params;
}

function buildFuelParams(filters: FuelReportFilters): Record<string, string> {
  const params: Record<string, string> = {};
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  if (filters.vehicleId) params.vehicleId = filters.vehicleId;
  if (filters.driverId) params.driverId = filters.driverId;
  return params;
}

/** Aperçu JSON (`format=json`) — appelé directement au backend via `apiClient`, comme les autres
 * écrans (Bearer attaché côté client, pas besoin de passer par le proxy Next.js). */
export async function fetchMissionsReport(filters: MissionReportFilters = {}): Promise<MissionReportRow[]> {
  const res = await apiClient.get<MissionReportRow[]>('/reports/missions', {
    params: { ...buildMissionParams(filters), format: 'json' },
  });
  return res.data;
}

export async function fetchFuelReport(filters: FuelReportFilters = {}): Promise<FuelReportRow[]> {
  const res = await apiClient.get<FuelReportRow[]>('/reports/fuel', {
    params: { ...buildFuelParams(filters), format: 'json' },
  });
  return res.data;
}

/**
 * Construit l'URL de téléchargement (csv/xlsx/pdf) pour un type de rapport donné, avec les
 * filtres actifs en query params. Pointe vers le proxy Next.js `/api/reports/:type` (et non
 * directement le backend) car le téléchargement se fait via une navigation `<a href>` simple —
 * le navigateur ne peut pas y attacher l'en-tête `Authorization: Bearer …` requis par l'API ;
 * le proxy le fait côté serveur à partir du cookie de session (voir `src/app/api/reports/*`,
 * même logique que `src/app/api/auth/token/route.ts`).
 */
export function buildReportDownloadUrl(
  type: ReportType,
  filters: MissionReportFilters | FuelReportFilters,
  format: Exclude<ReportFormat, 'json'>,
): string {
  const params = type === 'missions' ? buildMissionParams(filters) : buildFuelParams(filters);
  const search = new URLSearchParams({ ...params, format });
  return `/api/reports/${type}?${search.toString()}`;
}
