import { apiClient } from '@/lib/api-client';
import type { LiveVehicle, LiveVehicleDto, TraceGeoJSON } from '@/features/tracking/types';

function toLiveVehicle(dto: LiveVehicleDto): LiveVehicle {
  return {
    id: dto.vehicleId,
    plate: dto.plateNumber,
    status: dto.status,
    speedKmh: dto.latestPosition?.speed ?? null,
    heading: dto.latestPosition?.heading ?? null,
    lastUpdateAt: dto.latestPosition?.updatedAt ?? null,
    position: dto.latestPosition
      ? { lat: dto.latestPosition.latitude, lng: dto.latestPosition.longitude }
      : null,
  };
}

export async function fetchLiveVehicles(): Promise<LiveVehicle[]> {
  const res = await apiClient.get<LiveVehicleDto[]>('/tracking/vehicles/live');
  return res.data.map(toLiveVehicle);
}

export async function fetchVehicleTrace(vehicleId: string): Promise<TraceGeoJSON> {
  const res = await apiClient.get<TraceGeoJSON>(`/tracking/vehicles/${vehicleId}/trace`);
  return res.data;
}
