import { apiClient } from '@/lib/api-client';
import type { LocationDto, LocationInput, LocationQrCodeDto } from '@/features/locations/types';

export async function fetchLocations(): Promise<LocationDto[]> {
  const res = await apiClient.get<LocationDto[]>('/locations');
  return res.data;
}

export async function fetchLocation(id: string): Promise<LocationDto> {
  const res = await apiClient.get<LocationDto>(`/locations/${id}`);
  return res.data;
}

export async function createLocation(input: LocationInput): Promise<LocationDto> {
  const res = await apiClient.post<LocationDto>('/locations', input);
  return res.data;
}

export async function updateLocation(id: string, input: Partial<LocationInput>): Promise<LocationDto> {
  const res = await apiClient.patch<LocationDto>(`/locations/${id}`, input);
  return res.data;
}

/** Désactivation (soft-delete) — le backend ne supprime jamais physiquement un point. */
export async function deleteLocation(id: string): Promise<void> {
  await apiClient.delete(`/locations/${id}`);
}

export async function generateLocationQr(id: string): Promise<LocationQrCodeDto> {
  const res = await apiClient.post<LocationQrCodeDto>(`/locations/${id}/generate-qr`);
  return res.data;
}
