import { apiClient } from '@/lib/api-client';
import type { CreateDriverInput, DriverDto, UpdateDriverInput } from '@/features/drivers/types';

export async function fetchDrivers(): Promise<DriverDto[]> {
  const res = await apiClient.get<DriverDto[]>('/drivers');
  return res.data;
}

export async function fetchDriver(id: string): Promise<DriverDto> {
  const res = await apiClient.get<DriverDto>(`/drivers/${id}`);
  return res.data;
}

export async function createDriver(input: CreateDriverInput): Promise<DriverDto> {
  const res = await apiClient.post<DriverDto>('/drivers', input);
  return res.data;
}

export async function updateDriver(id: string, input: UpdateDriverInput): Promise<DriverDto> {
  const res = await apiClient.patch<DriverDto>(`/drivers/${id}`, input);
  return res.data;
}

export async function removeDriver(id: string): Promise<void> {
  await apiClient.delete(`/drivers/${id}`);
}

export async function assignVehicleToDriver(driverId: string, vehicleId: string): Promise<DriverDto> {
  const res = await apiClient.post<DriverDto>(`/drivers/${driverId}/assign-vehicle`, { vehicleId });
  return res.data;
}

export async function revokeDriverDevice(driverId: string, deviceId: string): Promise<void> {
  await apiClient.post(`/drivers/${driverId}/revoke-device`, { deviceId });
}
