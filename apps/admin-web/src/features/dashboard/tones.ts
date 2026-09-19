import type { AlertLevel } from '@/features/alerts/types';
import type { MissionStatus } from '@/features/missions/status-labels';
import type { StatusTone } from '@/components/status-badge';

/** Correspondance statut mission → teinte de pillule (succès/en cours/annulée…). */
export function missionTone(status: MissionStatus): StatusTone {
  switch (status) {
    case 'COMPLETED':
      return 'success';
    case 'STARTED':
    case 'IN_PROGRESS':
      return 'info';
    case 'PLANNED':
      return 'neutral';
    case 'ASSIGNED':
      return 'navy';
    case 'CANCELLED':
    case 'NOT_COMPLETED':
      return 'danger';
    case 'LATE':
      return 'warning';
    case 'SUSPICIOUS':
      return 'danger';
  }
}

/** Correspondance niveau d'alerte → teinte de pillule. */
export function alertTone(level: AlertLevel): StatusTone {
  switch (level) {
    case 'CRITICAL':
    case 'HIGH':
      return 'danger';
    case 'MEDIUM':
      return 'warning';
    case 'LOW':
      return 'neutral';
  }
}