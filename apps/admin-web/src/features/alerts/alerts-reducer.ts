import type { AlertCreatedEvent, AlertDto } from '@/features/alerts/types';

/**
 * Applique un événement `alert.created` (Socket.IO, namespace `/tracking`) à la liste d'alertes en
 * mémoire : préfixe une nouvelle entrée en tête de liste (ordre anté-chronologique, cohérent avec
 * le tri par défaut de `GET /alerts`). Fonction pure, testée indépendamment du socket — le payload
 * de l'événement est minimal (voir PHASE3_NOTES.md), donc l'entrée insérée n'a pas encore de
 * `message`/`score`/relations enrichies ; un refetch ultérieur (invalidation React Query) les
 * complètera. Idempotent : ignore un `alertId` déjà présent (resouscription socket, double
 * livraison réseau).
 */
export function applyAlertCreated(alerts: AlertDto[], event: AlertCreatedEvent): AlertDto[] {
  if (alerts.some((alert) => alert.id === event.alertId)) {
    return alerts;
  }

  const now = new Date().toISOString();
  const optimisticAlert: AlertDto = {
    id: event.alertId,
    type: event.type,
    level: event.level,
    status: 'NEW',
    score: 0,
    message: null,
    vehicleId: event.vehicleId,
    driverId: event.driverId,
    missionId: event.missionId,
    createdAt: now,
    updatedAt: now,
  };

  return [optimisticAlert, ...alerts];
}
