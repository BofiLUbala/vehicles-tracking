import { apiClient } from '@/lib/api-client';
import type { CreateDriverInput, DriverDto, LinkDriverInput, UpdateDriverInput, InviteDriverInput, LinkableDriverDto } from '@/features/drivers/types';

export async function fetchDrivers(): Promise<DriverDto[]> {
  const res = await apiClient.get<DriverDto[]>('/drivers');
  return res.data;
}

export async function fetchDriver(id: string): Promise<DriverDto> {
  const res = await apiClient.get<DriverDto>(`/drivers/${id}`);
  return res.data;
}

export async function fetchLinkableDrivers(): Promise<LinkableDriverDto[]> {
  const res = await apiClient.get<LinkableDriverDto[]>('/drivers/linkable');
  return res.data;
}

export async function createDriver(input: CreateDriverInput): Promise<DriverDto> {
  const res = await apiClient.post<DriverDto>('/drivers', input);
  return res.data;
}

export async function inviteDriver(input: InviteDriverInput): Promise<DriverDto> {
  // Same endpoint as createDriver, but semantically for invitation
  const res = await apiClient.post<DriverDto>('/drivers', input);
  return res.data;
}

export async function resendDriverInvitation(id: string): Promise<void> {
  await apiClient.post(`/drivers/${id}/invite`);
}

export async function updateDriver(id: string, input: UpdateDriverInput): Promise<DriverDto> {
  const res = await apiClient.patch<DriverDto>(`/drivers/${id}`, input);
  return res.data;
}

export async function linkDriver(input: LinkDriverInput): Promise<DriverDto> {
  const { driverId, ...patch } = input;
  const res = await apiClient.patch<DriverDto>(`/drivers/${driverId}`, patch);
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
