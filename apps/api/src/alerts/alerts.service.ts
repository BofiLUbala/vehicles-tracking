import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AlertStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { redactSensitive } from '../common/audit-log.util';
import { QueryAlertsDto } from './dto/query-alerts.dto';

/**
 * Machine à états `AlertStatus` (spec section 15) : NEW -> ACKNOWLEDGED -> RESOLVED, avec un
 * embranchement DISMISSED accessible depuis NEW ou ACKNOWLEDGED. RESOLVED et DISMISSED sont
 * terminaux (aucune transition sortante) — une alerte close ne "rouvre" jamais telle quelle,
 * il faut en créer une nouvelle si un signal réapparaît sur le même véhicule/chauffeur.
 */
const LEGAL_TRANSITIONS: Record<AlertStatus, AlertStatus[]> = {
  [AlertStatus.NEW]: [AlertStatus.ACKNOWLEDGED, AlertStatus.DISMISSED],
  [AlertStatus.ACKNOWLEDGED]: [AlertStatus.RESOLVED, AlertStatus.DISMISSED],
  [AlertStatus.RESOLVED]: [],
  [AlertStatus.DISMISSED]: [],
};

@Injectable()
export class AlertsService {
  constructor(private readonly prisma: PrismaService) {}

  /** `GET /alerts` — org-scopée via le véhicule OU le chauffeur (une alerte peut n'avoir que l'un des deux). */
  async findAll(organizationId: string, query: QueryAlertsDto) {
    const [orgVehicles, orgDrivers] = await Promise.all([
      this.prisma.vehicle.findMany({ where: { organizationId }, select: { id: true } }),
      this.prisma.driver.findMany({ where: { organizationId }, select: { id: true } }),
    ]);
    const orgVehicleIds = orgVehicles.map((v) => v.id);
    const orgDriverIds = orgDrivers.map((d) => d.id);

    const where: Prisma.AlertWhereInput = {
      OR: [{ vehicleId: { in: orgVehicleIds } }, { driverId: { in: orgDriverIds } }],
    };
    if (query.type) where.type = query.type;
    if (query.level) where.level = query.level;
    if (query.status) where.status = query.status;
    if (query.vehicleId) where.vehicleId = query.vehicleId;
    if (query.driverId) where.driverId = query.driverId;
    if (query.missionId) where.missionId = query.missionId;
    if (query.from || query.to) {
      where.createdAt = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }

    return this.prisma.alert.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  private async assertOrgAccess(organizationId: string, alert: { vehicleId: string | null; driverId: string | null }) {
    if (alert.vehicleId) {
      const vehicle = await this.prisma.vehicle.findFirst({ where: { id: alert.vehicleId, organizationId } });
      if (vehicle) return;
    }
    if (alert.driverId) {
      const driver = await this.prisma.driver.findFirst({ where: { id: alert.driverId, organizationId } });
      if (driver) return;
    }
    throw new ForbiddenException("Cette alerte n'appartient pas à cette organisation");
  }

  /** `GET /alerts/:id` */
  async findOne(organizationId: string, id: string) {
    const alert = await this.prisma.alert.findUnique({ where: { id } });
    if (!alert) throw new NotFoundException('Alerte introuvable');
    await this.assertOrgAccess(organizationId, alert);
    return alert;
  }

  /** `PATCH /alerts/:id` — transition de statut validée contre `LEGAL_TRANSITIONS`, journalisée dans `AuditLog`. */
  async updateStatus(organizationId: string, actorId: string, id: string, nextStatus: AlertStatus) {
    const alert = await this.findOne(organizationId, id);

    const allowed = LEGAL_TRANSITIONS[alert.status] ?? [];
    if (!allowed.includes(nextStatus)) {
      throw new BadRequestException(
        `Transition de statut invalide : ${alert.status} -> ${nextStatus} (autorisées depuis ${alert.status} : [${allowed.join(', ') || 'aucune'}])`,
      );
    }

    const updated = await this.prisma.alert.update({ where: { id }, data: { status: nextStatus } });

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'alert.status.updated',
        entity: 'Alert',
        entityId: id,
        metadata: redactSensitive({ from: alert.status, to: nextStatus }) as Prisma.InputJsonValue,
      },
    });

    return updated;
  }
}
