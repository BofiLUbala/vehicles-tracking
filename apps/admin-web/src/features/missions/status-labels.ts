/**
 * Libellés français des statuts de mission — source unique, réutilisée par l'écran missions
 * (`features/missions`) et par le tableau de rapports (`features/reports/reports-table.tsx`) pour
 * éviter toute divergence entre les deux écrans.
 */

export const MISSION_STATUSES = [
  'PLANNED',
  'ASSIGNED',
  'STARTED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'LATE',
  'SUSPICIOUS',
  'NOT_COMPLETED',
] as const;
export type MissionStatus = (typeof MISSION_STATUSES)[number];

export const MISSION_STATUS_LABELS: Record<MissionStatus, string> = {
  PLANNED: 'Planifiée',
  ASSIGNED: 'Assignée',
  STARTED: 'Démarrée',
  IN_PROGRESS: 'En cours',
  COMPLETED: 'Terminée',
  CANCELLED: 'Annulée',
  LATE: 'En retard',
  SUSPICIOUS: 'Suspecte',
  NOT_COMPLETED: 'Non terminée',
};

/** Variante de badge cohérente avec le vocabulaire visuel des autres écrans (fuel, alerts). */
export const MISSION_STATUS_BADGE_VARIANT: Record<MissionStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PLANNED: 'outline',
  ASSIGNED: 'secondary',
  STARTED: 'default',
  IN_PROGRESS: 'default',
  COMPLETED: 'secondary',
  CANCELLED: 'destructive',
  LATE: 'destructive',
  SUSPICIOUS: 'destructive',
  NOT_COMPLETED: 'destructive',
};

export const MISSION_STEP_ACTION_TYPES = ['COLLECT', 'DROPOFF', 'WEIGH', 'REFUEL', 'CHECKPOINT'] as const;
export type MissionStepActionType = (typeof MISSION_STEP_ACTION_TYPES)[number];

export const MISSION_STEP_ACTION_LABELS: Record<MissionStepActionType, string> = {
  COLLECT: 'Collecte',
  DROPOFF: 'Dépôt',
  WEIGH: 'Pesée',
  REFUEL: 'Ravitaillement',
  CHECKPOINT: 'Point de contrôle',
};

export const MISSION_STEP_STATUSES = ['PENDING', 'IN_PROGRESS', 'VALIDATED', 'SKIPPED', 'FAILED'] as const;
export type MissionStepStatus = (typeof MISSION_STEP_STATUSES)[number];

export const MISSION_STEP_STATUS_LABELS: Record<MissionStepStatus, string> = {
  PENDING: 'En attente',
  IN_PROGRESS: 'En cours',
  VALIDATED: 'Validée',
  SKIPPED: 'Ignorée',
  FAILED: 'Échouée',
};
