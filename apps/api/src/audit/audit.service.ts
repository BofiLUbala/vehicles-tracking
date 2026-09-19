import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueryAuditDto } from './dto/query-audit.dto';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

/**
 * Consultation du journal d'audit (`AuditLog`).
 *
 * Isolation organisationnelle : `AuditLog` ne porte pas d'`organizationId` (colonne absente du
 * schéma) — l'acteur (`actorId`) est soit un utilisateur admin (`User`) soit un chauffeur
 * (`Driver`), les deux étant rattachés à une organisation. On résout donc d'abord l'ensemble des
 * ids d'utilisateurs et de chauffeurs de l'organisation, puis on filtre `actorId IN (...)`.
 *
 * Les métadonnées sensibles sont déjà rédigées à l'écriture (`redactSensitive`) côté services
 * métier ; on expose les métadonnées telles quelles ici, sans jamais rien ajouter.
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string, query: QueryAuditDto) {
    const [userIds, driverIds] = await Promise.all([
      this.prisma.user.findMany({ where: { organizationId, deletedAt: null }, select: { id: true } }),
      this.prisma.driver.findMany({ where: { organizationId, deletedAt: null }, select: { id: true } }),
    ]);
    const orgActorIds = new Set<string>([...userIds.map((u) => u.id), ...driverIds.map((d) => d.id)]);

    const where: Record<string, unknown> = { actorId: { in: [...orgActorIds] } };
    if (query.action) where.action = query.action;
    if (query.entity) where.entity = query.entity;
    if (query.entityId) where.entityId = query.entityId;
    if (query.actorId) where.actorId = query.actorId;
    if (query.from || query.to) {
      where.createdAt = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }

    const limit = Math.min(Math.max(query.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
    const offset = Math.max(query.offset ?? 0, 0);

    const [total, entries] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, take: limit, skip: offset }),
    ]);

    const actorNames = await this.resolveActorNames(
      [...new Set(entries.map((e) => e.actorId).filter((id): id is string => !!id))],
    );

    return {
      total,
      limit,
      offset,
      items: entries.map((entry) => ({
        id: entry.id,
        actorId: entry.actorId,
        actorName: entry.actorId ? actorNames.get(entry.actorId) ?? 'Supprimé' : null,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId,
        metadata: entry.metadata,
        createdAt: entry.createdAt,
      })),
    };
  }

  private async resolveActorNames(actorIds: string[]): Promise<Map<string, string>> {
    const names = new Map<string, string>();
    if (actorIds.length === 0) return names;

    const [users, drivers] = await Promise.all([
      this.prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, firstName: true, lastName: true, email: true } }),
      this.prisma.driver.findMany({ where: { id: { in: actorIds } }, select: { id: true, firstName: true, lastName: true } }),
    ]);
    for (const u of users) names.set(u.id, [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email);
    for (const d of drivers) names.set(d.id, [d.firstName, d.lastName].filter(Boolean).join(' '));
    return names;
  }
}