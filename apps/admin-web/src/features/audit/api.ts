import { apiClient } from '@/lib/api-client';
import type { AuditFilters, AuditListResponse } from '@/features/audit/types';

const PAGE_SIZE = 50;

function buildParams(filters: AuditFilters, page: number): Record<string, string | number> {
  const params: Record<string, string | number> = { limit: PAGE_SIZE, offset: page * PAGE_SIZE };
  if (filters.action) params.action = filters.action;
  if (filters.entity) params.entity = filters.entity;
  if (filters.entityId) params.entityId = filters.entityId;
  if (filters.actorId) params.actorId = filters.actorId;
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  return params;
}

export async function fetchAuditEntries(filters: AuditFilters = {}, page = 0): Promise<AuditListResponse> {
  const res = await apiClient.get<AuditListResponse>('/audit', { params: buildParams(filters, page) });
  return res.data;
}

export const AUDIT_PAGE_SIZE = PAGE_SIZE;