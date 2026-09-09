import { apiClient } from '@/lib/api-client';
import type {
  CreateVehicleInput,
  UpdateVehicleInput,
  VehicleAssignmentHistoryItem,
  VehicleDto,
} from '@/features/vehicles/types';

export async function fetchVehicles(): Promise<VehicleDto[]> {
  const res = await apiClient.get<VehicleDto[]>('/vehicles');
  return res.data;
}

export async function fetchVehicle(id: string): Promise<VehicleDto> {
  const res = await apiClient.get<VehicleDto>(`/vehicles/${id}`);
  return res.data;
}

export async function fetchVehicleHistory(id: string): Promise<VehicleAssignmentHistoryItem[]> {
  const res = await apiClient.get<VehicleAssignmentHistoryItem[]>(`/vehicles/${id}/history`);
  return res.data;
}

export async function createVehicle(input: CreateVehicleInput): Promise<VehicleDto> {
  const res = await apiClient.post<VehicleDto>('/vehicles', input);
  return res.data;
}

export async function updateVehicle(id: string, input: UpdateVehicleInput): Promise<VehicleDto> {
  const res = await apiClient.patch<VehicleDto>(`/vehicles/${id}`, input);
  return res.data;
}

export async function removeVehicle(id: string): Promise<void> {
  await apiClient.delete(`/vehicles/${id}`);
}

export async function assignDriverToVehicle(vehicleId: string, driverId: string): Promise<VehicleDto> {
  const res = await apiClient.post<VehicleDto>(`/vehicles/${vehicleId}/assign-driver`, { driverId });
  return res.data;
}
