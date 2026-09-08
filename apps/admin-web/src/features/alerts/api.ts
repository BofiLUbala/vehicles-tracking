import { apiClient } from '@/lib/api-client';
import type { AlertDto, AlertFilters, AlertStatus } from '@/features/alerts/types';

function buildParams(filters: AlertFilters): Record<string, string> {
  const params: Record<string, string> = {};
  if (filters.type) params.type = filters.type;
  if (filters.level) params.level = filters.level;
  if (filters.status) params.status = filters.status;
  if (filters.vehicleId) params.vehicleId = filters.vehicleId;
  if (filters.driverId) params.driverId = filters.driverId;
  if (filters.missionId) params.missionId = filters.missionId;
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  return params;
}

export async function fetchAlerts(filters: AlertFilters = {}): Promise<AlertDto[]> {
  const res = await apiClient.get<AlertDto[]>('/alerts', { params: buildParams(filters) });
  return res.data;
}

export async function fetchVehicleFuelAnomalies(vehicleId: string): Promise<AlertDto[]> {
  const res = await apiClient.get<AlertDto[]>(`/vehicles/${vehicleId}/fuel-anomalies`);
  return res.data;
}

export async function updateAlertStatus(alertId: string, status: AlertStatus): Promise<AlertDto> {
  const res = await apiClient.patch<AlertDto>(`/alerts/${alertId}`, { status });
  return res.data;
}
