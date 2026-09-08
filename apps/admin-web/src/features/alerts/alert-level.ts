import type { AlertLevel, AlertStatus, AlertType } from '@/features/alerts/types';
import type { BadgeProps } from '@/components/ui/badge';

/**
 * Couleur de badge par niveau de sévérité (section 15 du cahier des charges) : info=gris,
 * warning=orange, critical=rouge. `MEDIUM` n'a pas d'équivalent shadcn "warning" par défaut —
 * on le rend via `outline` teinté orange par classe utilitaire dans le composant appelant.
 */
export const ALERT_LEVEL_VARIANTS: Record<AlertLevel, NonNullable<BadgeProps['variant']>> = {
  LOW: 'secondary',
  MEDIUM: 'outline',
  HIGH: 'destructive',
  CRITICAL: 'destructive',
};

export const ALERT_LEVEL_CLASSES: Record<AlertLevel, string> = {
  LOW: 'border-transparent bg-muted text-muted-foreground',
  MEDIUM: 'border-transparent bg-orange-100 text-orange-700',
  HIGH: 'border-transparent bg-red-100 text-red-700',
  CRITICAL: 'border-transparent bg-red-600 text-white',
};

export const ALERT_LEVEL_LABELS: Record<AlertLevel, string> = {
  LOW: 'Info',
  MEDIUM: 'Avertissement',
  HIGH: 'Élevé',
  CRITICAL: 'Critique',
};

const DEFAULT_LEVEL_CLASS = 'border-transparent bg-muted text-muted-foreground';
const DEFAULT_LEVEL_LABEL = 'Inconnu';

/** Fonction pure et exhaustive : classes CSS du badge pour un niveau d'alerte donné. */
export function alertLevelToClass(level: AlertLevel): string {
  return ALERT_LEVEL_CLASSES[level] ?? DEFAULT_LEVEL_CLASS;
}

export function alertLevelToLabel(level: AlertLevel): string {
  return ALERT_LEVEL_LABELS[level] ?? DEFAULT_LEVEL_LABEL;
}

export const ALERT_STATUS_LABELS: Record<AlertStatus, string> = {
  NEW: 'Nouvelle',
  ACKNOWLEDGED: 'Prise en compte',
  RESOLVED: 'Résolue',
  DISMISSED: 'Écartée',
};

export function alertStatusToLabel(status: AlertStatus): string {
  return ALERT_STATUS_LABELS[status] ?? 'Inconnu';
}

export const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  SPEEDING: 'Excès de vitesse',
  ROUTE_DEVIATION: 'Déviation d’itinéraire',
  UNAUTHORIZED_STOP: 'Arrêt non autorisé',
  MOCK_GPS: 'Position GPS simulée',
  MISSED_STEP: 'Étape manquée',
  LATE_ARRIVAL: 'Retard',
  FUEL_ANOMALY: 'Anomalie carburant',
  DEVICE_OFFLINE: 'Appareil hors ligne',
  OTHER: 'Autre',
};

export function alertTypeToLabel(type: AlertType): string {
  return ALERT_TYPE_LABELS[type] ?? 'Autre';
}
