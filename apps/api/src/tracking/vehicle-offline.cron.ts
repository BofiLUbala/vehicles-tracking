import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeEventsService } from './realtime-events.service';

const DEFAULT_OFFLINE_THRESHOLD_MINUTES = 5;

/**
 * Balayage périodique (Phase 3 follow-up, voir docs/PHASE3_NOTES.md) : détecte les véhicules dont
 * la dernière position connue dépasse `VEHICLE_OFFLINE_THRESHOLD_MINUTES` et émet `vehicle.offline`
 * — sans jamais ré-émettre en boucle tant que le véhicule reste offline (suivi en mémoire du
 * dernier `updatedAt` déjà notifié par véhicule ; un nouveau `updatedAt` plus récent — le véhicule
 * a réémis une position depuis — réarme la notification pour la prochaine fois qu'il repassera offline).
 *
 * Volontairement en mémoire (pas de table dédiée) : une seule instance API tourne en Phase 4 (voir
 * docker-compose.yml) et perdre ce cache au redémarrage ne fait que renvoyer une notification déjà
 * connue, jamais en perdre une — acceptable pour un signal de supervision, pas critique métier.
 */
@Injectable()
export class VehicleOfflineCron {
  private readonly logger = new Logger(VehicleOfflineCron.name);
  /** vehicleId -> updatedAt (ISO) de VehicleLatestPosition au moment de la dernière notification "offline" envoyée. */
  private readonly lastNotifiedOfflineAt = new Map<string, string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly realtime: RealtimeEventsService,
  ) {}

  private offlineThresholdMinutes(): number {
    const configured = Number(this.config.get<string>('VEHICLE_OFFLINE_THRESHOLD_MINUTES'));
    return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_OFFLINE_THRESHOLD_MINUTES;
  }

  @Cron('0 */2 * * * *') // toutes les 2 minutes
  async handleCron() {
    await this.sweep();
  }

  /** Logique extraite de `handleCron` pour être testable directement, sans attendre un vrai tick cron. */
  async sweep() {
    const thresholdMs = this.offlineThresholdMinutes() * 60_000;
    const cutoff = new Date(Date.now() - thresholdMs);

    const staleLatestPositions = await this.prisma.vehicleLatestPosition.findMany({
      where: { updatedAt: { lt: cutoff } },
      include: { vehicle: { select: { id: true, organizationId: true, deletedAt: true } } },
    });

    let notifiedCount = 0;
    for (const latest of staleLatestPositions) {
      if (!latest.vehicle || latest.vehicle.deletedAt) continue;

      const updatedAtIso = latest.updatedAt.toISOString();
      if (this.lastNotifiedOfflineAt.get(latest.vehicleId) === updatedAtIso) {
        continue; // déjà notifié pour ce même `updatedAt` — ne pas re-notifier en boucle.
      }

      this.realtime.emitVehicleOffline({
        organizationId: latest.vehicle.organizationId,
        vehicleId: latest.vehicleId,
        lastSeenAt: updatedAtIso,
      });
      this.lastNotifiedOfflineAt.set(latest.vehicleId, updatedAtIso);
      notifiedCount++;
    }

    // Véhicules jamais vus du tout (aucune VehicleLatestPosition) : hors périmètre de ce balayage —
    // ils sont déjà signalés OFFLINE par TrackingService.liveVehicles() à la lecture, sans historique
    // de "dernière position" à comparer ici.

    if (notifiedCount > 0) {
      this.logger.debug(`Balayage véhicules hors-ligne : ${notifiedCount} notification(s) envoyée(s)`);
    }
    return notifiedCount;
  }
}
