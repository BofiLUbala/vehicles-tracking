/**
 * Contrat REST du module audit (`apps/api/src/audit`). `GET /audit` renvoie les entrées du journal
 * d'audit de l'organisation de l'utilisateur connecté (isolation par utilisateurs/chauffeurs de
 * l'organisation côté service, `AuditLog` ne portant pas d'`organizationId`).
 */

export interface AuditEntryDto {
  id: string;
  actorId: string | null;
  actorName: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface AuditListResponse {
  total: number;
  limit: number;
  offset: number;
  items: AuditEntryDto[];
}

export interface AuditFilters {
  action?: string;
  entity?: string;
  entityId?: string;
  actorId?: string;
  from?: string;
  to?: string;
}