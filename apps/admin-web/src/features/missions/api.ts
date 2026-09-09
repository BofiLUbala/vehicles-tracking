import { apiClient } from '@/lib/api-client';
import type {
  AssignMissionInput,
  CancelMissionInput,
  CreateMissionInput,
  DriverRef,
  MissionDto,
  MissionFilters,
  UpdateMissionInput,
  VehicleRef,
} from '@/features/missions/types';

function buildParams(filters: MissionFilters): Record<string, string> {
  const params: Record<string, string> = {};
  if (filters.status) params.status = filters.status;
  if (filters.driverId) params.driverId = filters.driverId;
  if (filters.vehicleId) params.vehicleId = filters.vehicleId;
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  return params;
}

export async function fetchMissions(filters: MissionFilters = {}): Promise<MissionDto[]> {
  const res = await apiClient.get<MissionDto[]>('/missions', { params: buildParams(filters) });
  return res.data;
}

export async function fetchMission(id: string): Promise<MissionDto> {
  const res = await apiClient.get<MissionDto>(`/missions/${id}`);
  return res.data;
}

export async function createMission(input: CreateMissionInput): Promise<MissionDto> {
  const res = await apiClient.post<MissionDto>('/missions', input);
  return res.data;
}

export async function updateMission(id: string, input: UpdateMissionInput): Promise<MissionDto> {
  const res = await apiClient.patch<MissionDto>(`/missions/${id}`, input);
  return res.data;
}

export async function assignMission(id: string, input: AssignMissionInput): Promise<MissionDto> {
  const res = await apiClient.post<MissionDto>(`/missions/${id}/assign`, input);
  return res.data;
}

export async function cancelMission(id: string, input: CancelMissionInput): Promise<MissionDto> {
  const res = await apiClient.post<MissionDto>(`/missions/${id}/cancel`, input);
  return res.data;
}

export async function completeMission(id: string): Promise<MissionDto> {
  const res = await apiClient.post<MissionDto>(`/missions/${id}/complete`);
  return res.data;
}

/** Référentiels pour les menus déroulants chauffeur/véhicule (formulaire de création + affectation). */
export async function fetchDrivers(): Promise<DriverRef[]> {
  const res = await apiClient.get<DriverRef[]>('/drivers');
  return res.data;
}

export async function fetchVehicles(): Promise<VehicleRef[]> {
  const res = await apiClient.get<VehicleRef[]>('/vehicles');
  return res.data;
}
