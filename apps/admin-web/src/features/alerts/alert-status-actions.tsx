'use client';

import { Button } from '@/components/ui/button';
import { allowedNextStatuses } from '@/features/alerts/alert-status';
import { alertStatusToLabel } from '@/features/alerts/alert-level';
import type { AlertStatus } from '@/features/alerts/types';

export interface AlertStatusActionsProps {
  alertId: string;
  status: AlertStatus;
  disabled?: boolean;
  onTransition: (alertId: string, status: AlertStatus) => void;
}

/** Boutons de transition de statut (NEW → ACKNOWLEDGED → RESOLVED/DISMISSED). Rien n'est affiché
 * pour un statut terminal (RESOLVED/DISMISSED). */
export function AlertStatusActions({ alertId, status, disabled, onTransition }: AlertStatusActionsProps) {
  const nextStatuses = allowedNextStatuses(status);

  if (nextStatuses.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return (
    <div className="flex gap-1">
      {nextStatuses.map((next) => (
        <Button
          key={next}
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => onTransition(alertId, next)}
        >
          {alertStatusToLabel(next)}
        </Button>
      ))}
    </div>
  );
}
