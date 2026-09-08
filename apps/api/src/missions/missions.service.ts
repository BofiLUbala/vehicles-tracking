import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MissionStatus, MissionStepStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMissionDto } from './dto/create-mission.dto';
import { UpdateMissionDto } from './dto/update-mission.dto';
import { AssignMissionDto } from './dto/assign-mission.dto';
import { QueryMissionsDto } from './dto/query-missions.dto';
import { RealtimeEventsService } from '../tracking/realtime-events.service';

/** Statuts considérés comme "occupant" un chauffeur/véhicule pour les besoins d'affectation. */
const ACTIVE_MISSION_STATUSES: MissionStatus[] = [MissionStatus.ASSIGNED, MissionStatus.STARTED, MissionStatus.IN_PROGRESS];

/** Statuts au-delà desquels une mission ne peut plus être modifiée (PATCH) ou annulée. */
const EDITABLE_STATUSES: MissionStatus[] = [MissionStatus.PLANNED, MissionStatus.ASSIGNED];
const CANCELLABLE_TERMINAL_STATUSES: MissionStatus[] = [
  MissionStatus.COMPLETED,
  MissionStatus.CANCELLED,
  MissionStatus.NOT_COMPLETED,
];

const STEP_INCLUDE = { steps: { orderBy: { order: 'asc' as const } }, events: { orderBy: { createdAt: 'asc' as const } } };

@Injectable()
export class MissionsService {
  constructor(private readonly prisma: PrismaService, private readonly realtime: RealtimeEventsService) {}

  async create(organizationId: string, dto: CreateMissionDto) {
    const driver = await this.prisma.driver.findFirst({ where: { id: dto.driverId, organizationId, deletedAt: null } });
    if (!driver) throw new NotFoundException('Chauffeur introuvable');
    const vehicle = await this.prisma.vehicle.findFirst({ where: { id: dto.vehicleId, organizationId, deletedAt: null } });
    if (!vehicle) throw new NotFoundException('Véhicule introuvable');

    const orders = dto.steps.map((s) => s.order);
    if (new Set(orders).size !== orders.length) {
      throw new BadRequestException("Les valeurs 'order' des étapes doivent être uniques");
    }

    for (const step of dto.steps) {
      const location = await this.prisma.location.findFirst({ where: { id: step.locationId, organizationId, deletedAt: null } });
      if (!location) throw new NotFoundException(`Lieu introuvable pour l'étape order=${step.order}`);
    }

    return this.prisma.$transaction(async (tx) => {
      const mission = await tx.mission.create({
        data: {
          organizationId,
          driverId: dto.driverId,
          vehicleId: dto.vehicleId,
          plannedStart: dto.plannedStart ? new Date(dto.plannedStart) : undefined,
          plannedEnd: dto.plannedEnd ? new Date(dto.plannedEnd) : undefined,
        },
      });

      await tx.missionStep.createMany({
        data: dto.steps.map((s) => ({
          missionId: mission.id,
          locationId: s.locationId,
          order: s.order,
          actionType: s.actionType,
          plannedAt: s.plannedAt ? new Date(s.plannedAt) : undefined,
          toleranceMin: s.toleranceMin ?? 15,
        })),
      });

      await tx.missionEvent.create({
        data: { missionId: mission.id, type: 'mission.created', payload: { driverId: dto.driverId, vehicleId: dto.vehicleId } },
      });

      return tx.mission.findUniqueOrThrow({ where: { id: mission.id }, include: STEP_INCLUDE });
    });
  }

  async findAll(organizationId: string, query: QueryMissionsDto) {
    const where: Prisma.MissionWhereInput = { organizationId };
    if (query.status) where.status = query.status;
    if (query.driverId) where.driverId = query.driverId;
    if (query.vehicleId) where.vehicleId = query.vehicleId;
    if (query.from || query.to) {
      where.plannedStart = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }
    return this.prisma.mission.findMany({ where, orderBy: { plannedStart: 'desc' }, include: STEP_INCLUDE });
  }

  async findOne(organizationId: string, id: string) {
    const mission = await this.prisma.mission.findFirst({ where: { id, organizationId }, include: STEP_INCLUDE });
    if (!mission) throw new NotFoundException('Mission introuvable');
    return mission;
  }

  async update(organizationId: string, id: string, dto: UpdateMissionDto) {
    const mission = await this.findOne(organizationId, id);
    if (!EDITABLE_STATUSES.includes(mission.status)) {
      throw new ConflictException('La mission ne peut plus être modifiée une fois démarrée');
    }

    if (dto.driverId) {
      const driver = await this.prisma.driver.findFirst({ where: { id: dto.driverId, organizationId, deletedAt: null } });
      if (!driver) throw new NotFoundException('Chauffeur introuvable');
    }
    if (dto.vehicleId) {
      const vehicle = await this.prisma.vehicle.findFirst({ where: { id: dto.vehicleId, organizationId, deletedAt: null } });
      if (!vehicle) throw new NotFoundException('Véhicule introuvable');
    }

    await this.prisma.mission.update({
      where: { id },
      data: {
        plannedStart: dto.plannedStart ? new Date(dto.plannedStart) : undefined,
        plannedEnd: dto.plannedEnd ? new Date(dto.plannedEnd) : undefined,
        driverId: dto.driverId,
        vehicleId: dto.vehicleId,
      },
    });
    return this.findOne(organizationId, id);
  }

  /**
   * Affecte (ou réaffecte) chauffeur+véhicule et passe la mission en ASSIGNED.
   * Vérifie en transaction (check-then-write) qu'aucun des deux n'est déjà engagé sur une autre
   * mission active (ASSIGNED/STARTED/IN_PROGRESS) — évite une double affectation en cas de requêtes
   * concurrentes.
   */
  async assign(organizationId: string, id: string, dto: AssignMissionDto) {
    return this.prisma.$transaction(async (tx) => {
      const mission = await tx.mission.findFirst({ where: { id, organizationId } });
      if (!mission) throw new NotFoundException('Mission introuvable');

      const driver = await tx.driver.findFirst({ where: { id: dto.driverId, organizationId, deletedAt: null } });
      if (!driver) throw new NotFoundException('Chauffeur introuvable');
      const vehicle = await tx.vehicle.findFirst({ where: { id: dto.vehicleId, organizationId, deletedAt: null } });
      if (!vehicle) throw new NotFoundException('Véhicule introuvable');

      const conflict = await tx.mission.findFirst({
        where: {
          id: { not: id },
          status: { in: ACTIVE_MISSION_STATUSES },
          OR: [{ driverId: dto.driverId }, { vehicleId: dto.vehicleId }],
        },
      });
      if (conflict) {
        throw new ConflictException(
          conflict.driverId === dto.driverId
            ? 'Ce chauffeur est déjà affecté à une autre mission active'
            : 'Ce véhicule est déjà affecté à une autre mission active',
        );
      }

      await tx.mission.update({
        where: { id },
        data: { driverId: dto.driverId, vehicleId: dto.vehicleId, status: MissionStatus.ASSIGNED },
      });
      await tx.missionEvent.create({
        data: { missionId: id, type: 'mission.assigned', payload: { driverId: dto.driverId, vehicleId: dto.vehicleId } },
      });

      return tx.mission.findUniqueOrThrow({ where: { id }, include: STEP_INCLUDE });
    });
  }

  async start(driverSub: string, missionId: string) {
    const mission = await this.prisma.mission.findUnique({ where: { id: missionId } });
    if (!mission) throw new NotFoundException('Mission introuvable');
    if (mission.driverId !== driverSub) {
      throw new ForbiddenException("Cette mission n'est pas affectée à ce chauffeur");
    }
    if (mission.status !== MissionStatus.ASSIGNED) {
      throw new ConflictException(`Impossible de démarrer une mission au statut ${mission.status}`);
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.mission.update({
        where: { id: missionId },
        data: { status: MissionStatus.STARTED, actualStart: new Date() },
      });
      await tx.missionEvent.create({ data: { missionId, type: 'mission.started', payload: {} } });
      const updated = await tx.mission.findUniqueOrThrow({ where: { id: missionId }, include: STEP_INCLUDE });
      this.realtime.emitMissionStarted({
        organizationId: updated.organizationId,
        missionId,
        driverId: updated.driverId,
        vehicleId: updated.vehicleId,
      });
      return updated;
    });
  }

  /**
   * Termine une mission. Chauffeur affecté OU admin (override, voir docs/PHASE2_NOTES.md).
   * Règle de complétion : toutes les étapes doivent être VALIDATED pour COMPLETED, sinon
   * NOT_COMPLETED (complétion partielle autorisée mais tracée). SKIPPED n'est pas utilisé en
   * Phase 2 (toutes les étapes sont traitées comme obligatoires).
   */
  async complete(principal: { sub: string; type: 'user' | 'driver' }, missionId: string) {
    const mission = await this.prisma.mission.findUnique({ where: { id: missionId }, include: { steps: true } });
    if (!mission) throw new NotFoundException('Mission introuvable');

    if (principal.type === 'driver' && mission.driverId !== principal.sub) {
      throw new ForbiddenException("Cette mission n'est pas affectée à ce chauffeur");
    }
    if (mission.status !== MissionStatus.STARTED && mission.status !== MissionStatus.IN_PROGRESS) {
      throw new ConflictException(`Impossible de terminer une mission au statut ${mission.status}`);
    }

    const allValidated = mission.steps.every((s) => s.status === MissionStepStatus.VALIDATED);
    const finalStatus = allValidated ? MissionStatus.COMPLETED : MissionStatus.NOT_COMPLETED;
    const eventType = allValidated ? 'mission.completed' : 'mission.not_completed';

    return this.prisma.$transaction(async (tx) => {
      await tx.mission.update({ where: { id: missionId }, data: { status: finalStatus, actualEnd: new Date() } });
      await tx.missionEvent.create({
        data: {
          missionId,
          type: eventType,
          payload: {
            validatedSteps: mission.steps.filter((s) => s.status === MissionStepStatus.VALIDATED).length,
            totalSteps: mission.steps.length,
          },
        },
      });
      const updated = await tx.mission.findUniqueOrThrow({ where: { id: missionId }, include: STEP_INCLUDE });
      this.realtime.emitMissionCompleted({ organizationId: updated.organizationId, missionId, status: finalStatus });
      return updated;
    });
  }

  async cancel(organizationId: string, id: string, reason: string, actorId?: string) {
    const mission = await this.findOne(organizationId, id);
    if (CANCELLABLE_TERMINAL_STATUSES.includes(mission.status)) {
      throw new ConflictException(`Impossible d'annuler une mission au statut ${mission.status}`);
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.mission.update({ where: { id }, data: { status: MissionStatus.CANCELLED } });
      await tx.missionEvent.create({ data: { missionId: id, type: 'mission.cancelled', payload: { reason } } });
      await tx.auditLog.create({
        data: { actorId, action: 'mission.cancel', entity: 'Mission', entityId: id, metadata: { reason } },
      });
      return tx.mission.findUniqueOrThrow({ where: { id }, include: STEP_INCLUDE });
    });
  }

  /** "Aujourd'hui" = [00:00, 24:00) UTC — simplification documentée (voir PHASE2_NOTES.md). */
  async todayForDriver(driverSub: string) {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));

    return this.prisma.mission.findMany({
      where: { driverId: driverSub, plannedStart: { gte: start, lt: end } },
      orderBy: { plannedStart: 'asc' },
      include: STEP_INCLUDE,
    });
  }

  async findOneForDriver(driverSub: string, missionId: string) {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      include: { steps: { orderBy: { order: 'asc' }, include: { validations: true } }, events: { orderBy: { createdAt: 'asc' } } },
    });
    if (!mission) throw new NotFoundException('Mission introuvable');
    if (mission.driverId !== driverSub) {
      throw new ForbiddenException("Cette mission n'est pas affectée à ce chauffeur");
    }
    return mission;
  }
}
