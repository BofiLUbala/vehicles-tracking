import type { AlertStatus } from '@/features/alerts/types';

/**
 * Transitions de statut autorisées depuis chaque statut (workflow NEW → ACKNOWLEDGED →
 * RESOLVED/DISMISSED, aligné sur `enum AlertStatus` du schéma Prisma). `RESOLVED` et `DISMISSED`
 * sont terminaux (pas de transition affichée depuis ces statuts).
 */
const ALLOWED_TRANSITIONS: Record<AlertStatus, AlertStatus[]> = {
  NEW: ['ACKNOWLEDGED', 'DISMISSED'],
  ACKNOWLEDGED: ['RESOLVED', 'DISMISSED'],
  RESOLVED: [],
  DISMISSED: [],
};

/** Fonction pure et exhaustive : statuts cibles valides depuis un statut donné. */
export function allowedNextStatuses(current: AlertStatus): AlertStatus[] {
  return ALLOWED_TRANSITIONS[current] ?? [];
}

export function isTerminalStatus(status: AlertStatus): boolean {
  return allowedNextStatuses(status).length === 0;
}
