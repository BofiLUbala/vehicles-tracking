import { apiClient } from '@/lib/api-client';
import type { FuelRecordDto, FuelRecordFilters, FuelSummaryDto } from '@/features/fuel/types';

// `fetchVehicleFuelAnomalies` (GET /vehicles/:id/fuel-anomalies) vit dans `@/features/alerts/api`
// (elle renvoie des `AlertDto`) — réutilisée depuis là par le panneau détail véhicule ci-dessous.
export { fetchVehicleFuelAnomalies } from '@/features/alerts/api';

function buildParams(filters: FuelRecordFilters): Record<string, string> {
  const params: Record<string, string> = {};
  if (filters.vehicleId) params.vehicleId = filters.vehicleId;
  if (filters.driverId) params.driverId = filters.driverId;
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  return params;
}

export async function fetchFuelRecords(filters: FuelRecordFilters = {}): Promise<FuelRecordDto[]> {
  const res = await apiClient.get<FuelRecordDto[]>('/fuel-records', { params: buildParams(filters) });
  return res.data;
}

export async function fetchVehicleFuelSummary(vehicleId: string): Promise<FuelSummaryDto> {
  const res = await apiClient.get<FuelSummaryDto>(`/vehicles/${vehicleId}/fuel-summary`);
  return res.data;
}
