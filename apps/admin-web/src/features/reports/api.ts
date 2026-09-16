import { apiClient } from '@/lib/api-client';
import type {
  FuelReportFilters,
  FuelReportRow,
  MissionReportFilters,
  MissionReportRow,
  ReportFormat,
  ReportMeta,
  ReportPage,
  ReportType,
} from '@/features/reports/types';

/** Nombre de lignes demandees par page d'apercu. */
export const REPORT_PAGE_SIZE = 200;

/** Plafond serveur (`REPORT_MAX_ROWS` cote API) demande explicitement lors d'un telechargement. */
export const REPORT_EXPORT_MAX_ROWS = 5000;

interface ReportEnvelope<T> {
  data: T[];
  meta: ReportMeta;
}

/**
 * L'API renvoie `{ data, meta }` depuis l'ajout de la pagination. Les reponses anciennes (tableau
 * nu) restent acceptees pour ne pas dependre d'un deploiement simultane des deux services.
 */
function toPage<T>(body: ReportEnvelope<T> | T[], limit: number, offset: number): ReportPage<T> {
  if (Array.isArray(body)) {
    return {
      rows: body,
      meta: { limit, offset, returned: body.length, hasMore: false, truncated: false, maxRows: limit },
    };
  }
  return { rows: body.data, meta: body.meta };
}

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
export async function fetchMissionsReport(
  filters: MissionReportFilters = {},
  page: { limit?: number; offset?: number } = {},
): Promise<ReportPage<MissionReportRow>> {
  const limit = page.limit ?? REPORT_PAGE_SIZE;
  const offset = page.offset ?? 0;
  const res = await apiClient.get<ReportEnvelope<MissionReportRow> | MissionReportRow[]>('/reports/missions', {
    params: { ...buildMissionParams(filters), format: 'json', limit, offset },
  });
  return toPage(res.data, limit, offset);
}

export async function fetchFuelReport(
  filters: FuelReportFilters = {},
  page: { limit?: number; offset?: number } = {},
): Promise<ReportPage<FuelReportRow>> {
  const limit = page.limit ?? REPORT_PAGE_SIZE;
  const offset = page.offset ?? 0;
  const res = await apiClient.get<ReportEnvelope<FuelReportRow> | FuelReportRow[]>('/reports/fuel', {
    params: { ...buildFuelParams(filters), format: 'json', limit, offset },
  });
  return toPage(res.data, limit, offset);
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
  // Un export doit ramener le plus de lignes que le serveur autorise, pas la taille d'une page
  // d'apercu : sans ce `limit`, le telechargement serait silencieusement reduit a REPORT_PAGE_SIZE.
  const search = new URLSearchParams({ ...params, format, limit: String(REPORT_EXPORT_MAX_ROWS) });
  return `/api/reports/${type}?${search.toString()}`;
}
