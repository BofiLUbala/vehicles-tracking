import type { VehicleTrackingStatus } from '@/features/tracking/types';

/** Couleur (hex) associée à chaque statut de suivi en direct — voir légende de la carte. */
export const STATUS_COLORS: Record<VehicleTrackingStatus, string> = {
  MOVING: '#22c55e', // vert — en mouvement
  ON_MISSION: '#3b82f6', // bleu — en mission
  STOPPED: '#f97316', // orange — à l'arrêt
  OFFLINE: '#ef4444', // rouge — hors ligne
  SUSPICIOUS: '#a855f7', // violet — suspect
};

export const STATUS_LABELS: Record<VehicleTrackingStatus, string> = {
  MOVING: 'En mouvement',
  ON_MISSION: 'En mission',
  STOPPED: 'À l’arrêt',
  OFFLINE: 'Hors ligne',
  SUSPICIOUS: 'Suspect',
};

const DEFAULT_COLOR = '#6b7280'; // gris — statut inconnu, ne devrait pas arriver
const DEFAULT_LABEL = 'Inconnu';

/** Fonction pure et exhaustive : couleur de marqueur pour un statut donné. */
export function statusToColor(status: VehicleTrackingStatus): string {
  return STATUS_COLORS[status] ?? DEFAULT_COLOR;
}

export function statusToLabel(status: VehicleTrackingStatus): string {
  return STATUS_LABELS[status] ?? DEFAULT_LABEL;
}
