import type { VehicleTrackingStatus } from '@/features/tracking/types';

/** Couleur (hex) associée à chaque statut de suivi en direct — voir légende de la carte.
 *  Palette unifiée « Fleet Control » : vert mouvement / bleu mission / orange arrêt / gris hors-ligne / rouge suspect. */
export const STATUS_COLORS: Record<VehicleTrackingStatus, string> = {
  MOVING: '#18A957', // vert succès — en mouvement
  ON_MISSION: '#1479FF', // bleu tracking — en mission
  STOPPED: '#F59E0B', // orange — à l'arrêt
  OFFLINE: '#98A2B3', // gris — hors ligne
  SUSPICIOUS: '#E53E3E', // rouge — suspect
};

export const STATUS_LABELS: Record<VehicleTrackingStatus, string> = {
  MOVING: 'En mouvement',
  ON_MISSION: 'En mission',
  STOPPED: 'À l’arrêt',
  OFFLINE: 'Hors ligne',
  SUSPICIOUS: 'Suspect',
};

const DEFAULT_COLOR = '#667085'; // gris acier — statut inconnu, ne devrait pas arriver
const DEFAULT_LABEL = 'Inconnu';

/** Fonction pure et exhaustive : couleur de marqueur pour un statut donné. */
export function statusToColor(status: VehicleTrackingStatus): string {
  return STATUS_COLORS[status] ?? DEFAULT_COLOR;
}

export function statusToLabel(status: VehicleTrackingStatus): string {
  return STATUS_LABELS[status] ?? DEFAULT_LABEL;
}

/** Couleurs de marqueur pour les étapes de mission (fait/encours/à venir). */
export const STEP_MARKER_COLORS = {
  VALIDATED: '#18A957',
  CURRENT: '#F59E0B',
  PENDING: '#98A2B3',
  VEHICLE: '#1479FF',
} as const;