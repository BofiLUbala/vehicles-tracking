import { apiClient } from '@/lib/api-client';
import type { LiveVehicle, LiveVehicleDto, MissionTraceResponse, TraceGeoJSON } from '@/features/tracking/types';

function toLiveVehicle(dto: LiveVehicleDto): LiveVehicle {
  return {
    id: dto.vehicleId,
    plate: dto.plateNumber,
    status: dto.status,
    activeMissionId: dto.activeMissionId ?? null,
    speedKmh: dto.latestPosition?.speed ?? null,
    heading: dto.latestPosition?.heading ?? null,
    accuracy: dto.latestPosition?.accuracy ?? null,
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

export async function fetchMissionTrace(missionId: string): Promise<MissionTraceResponse> {
  const res = await apiClient.get<MissionTraceResponse>(`/tracking/missions/${missionId}/trace`);
  return res.data;
}
