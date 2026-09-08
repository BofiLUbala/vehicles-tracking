import { Injectable, Logger } from '@nestjs/common';
import type { Server } from 'socket.io';

/**
 * Point d'injection unique pour diffuser des événements WebSocket depuis n'importe quel service
 * métier (tracking, missions, mission-steps) sans dépendre directement de Socket.IO ou créer un
 * cycle de dépendances avec `TrackingGateway` (qui, lui, dépend de ce service pour recevoir
 * l'instance `Server` une fois le gateway initialisé — voir `TrackingGateway.afterInit`).
 *
 * Rooms : `organization:{organizationId}`, `vehicle:{vehicleId}`, `mission:{missionId}`.
 * Approche volontairement minimale (pas de bus d'événements/CQRS) — chaque service métier appelle
 * directement la méthode `emit*` correspondante juste après avoir écrit l'état en base.
 */
@Injectable()
export class RealtimeEventsService {
  private readonly logger = new Logger('RealtimeEvents');
  private server?: Server;

  setServer(server: Server) {
    this.server = server;
  }

  private emitToRooms(rooms: (string | undefined | null)[], event: string, payload: unknown) {
    if (!this.server) {
      // Le gateway n'est pas encore initialisé (ex: script hors HTTP) — ne jamais bloquer l'appelant.
      this.logger.debug(`Server WebSocket non initialisé, événement ${event} ignoré`);
      return;
    }
    for (const room of rooms) {
      if (room) this.server.to(room).emit(event, payload);
    }
  }

  emitPositionUpdated(params: {
    organizationId: string;
    vehicleId: string;
    missionId?: string | null;
    latitude: number;
    longitude: number;
    speed?: number | null;
    heading?: number | null;
    recordedAt: string;
  }) {
    const payload = {
      vehicleId: params.vehicleId,
      missionId: params.missionId ?? null,
      latitude: params.latitude,
      longitude: params.longitude,
      speed: params.speed ?? null,
      heading: params.heading ?? null,
      recordedAt: params.recordedAt,
    };
    this.emitToRooms(
      [`organization:${params.organizationId}`, `vehicle:${params.vehicleId}`, params.missionId ? `mission:${params.missionId}` : null],
      'vehicle.position.updated',
      payload,
    );
  }

  emitVehicleStatusUpdated(params: { organizationId: string; vehicleId: string; status: string }) {
    this.emitToRooms(
      [`organization:${params.organizationId}`, `vehicle:${params.vehicleId}`],
      'vehicle.status.updated',
      { vehicleId: params.vehicleId, status: params.status },
    );
  }

  emitVehicleOffline(params: { organizationId: string; vehicleId: string; lastSeenAt: string | null }) {
    this.emitToRooms([`organization:${params.organizationId}`, `vehicle:${params.vehicleId}`], 'vehicle.offline', {
      vehicleId: params.vehicleId,
      lastSeenAt: params.lastSeenAt,
    });
  }

  emitMissionStarted(params: { organizationId: string; missionId: string; driverId: string; vehicleId: string }) {
    this.emitToRooms([`organization:${params.organizationId}`, `mission:${params.missionId}`], 'mission.started', {
      missionId: params.missionId,
      driverId: params.driverId,
      vehicleId: params.vehicleId,
    });
  }

  emitMissionCompleted(params: { organizationId: string; missionId: string; status: string }) {
    this.emitToRooms([`organization:${params.organizationId}`, `mission:${params.missionId}`], 'mission.completed', {
      missionId: params.missionId,
      status: params.status,
    });
  }

  emitMissionStepValidated(params: { organizationId: string; missionId: string; stepId: string; order: number }) {
    this.emitToRooms([`organization:${params.organizationId}`, `mission:${params.missionId}`], 'mission.step.validated', {
      missionId: params.missionId,
      stepId: params.stepId,
      order: params.order,
    });
  }

  emitAlertCreated(params: {
    organizationId: string;
    alertId: string;
    type: string;
    level: string;
    vehicleId?: string | null;
    driverId?: string | null;
    missionId?: string | null;
  }) {
    this.emitToRooms(
      [
        `organization:${params.organizationId}`,
        params.vehicleId ? `vehicle:${params.vehicleId}` : null,
        params.missionId ? `mission:${params.missionId}` : null,
      ],
      'alert.created',
      {
        alertId: params.alertId,
        type: params.type,
        level: params.level,
        vehicleId: params.vehicleId ?? null,
        driverId: params.driverId ?? null,
        missionId: params.missionId ?? null,
      },
    );
  }
}
