import { apiClient } from '@/lib/api-client';
import type { RoleDto } from '@/features/settings/types';

export async function fetchRoles(): Promise<RoleDto[]> {
  const res = await apiClient.get<RoleDto[]>('/roles');
  return res.data;
}
