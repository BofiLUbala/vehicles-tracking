import { apiClient } from '@/lib/api-client';
import type { AdminUserDto } from '@/features/users/types';

export async function fetchUsers(): Promise<AdminUserDto[]> {
  const res = await apiClient.get<AdminUserDto[]>('/users');
  return res.data;
}
