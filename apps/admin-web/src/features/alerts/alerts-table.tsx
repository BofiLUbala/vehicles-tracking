'use client';

import { Fragment, useState } from 'react';
import { AlertTriangle, ChevronDown, Fingerprint } from 'lucide-react';
import { StatusBadge } from '@/components/status-badge';
import { EmptyState } from '@/components/empty-state';
import { cn } from '@/lib/utils';
import { alertLevelToLabel, alertStatusToLabel, alertTypeToLabel } from '@/features/alerts/alert-level';
import { AlertStatusActions } from '@/features/alerts/alert-status-actions';
import type { AlertDto, AlertStatus } from '@/features/alerts/types';

export interface AlertsTableProps {
  alerts: AlertDto[];
  onTransition: (alertId: string, status: AlertStatus) => void;
  transitioning?: boolean;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('fr-FR');
  } catch {
    return iso;
  }
}

const LEVEL_TONE: Record<AlertDto['level'], 'neutral' | 'warning' | 'danger'> = {
  LOW: 'neutral',
  MEDIUM: 'warning',
  HIGH: 'danger',
  CRITICAL: 'danger',
};

const STATUS_TONE: Record<AlertStatus, 'danger' | 'warning' | 'success' | 'neutral'> = {
  NEW: 'danger',
  ACKNOWLEDGED: 'warning',
  RESOLVED: 'success',
  DISMISSED: 'neutral',
};

export function AlertsTable({ alerts, onTransition, transitioning }: AlertsTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (alerts.length === 0) {
    return <EmptyState title="Aucune alerte" description="Aucune alerte pour ces filtres." className="py-14" />;
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-2xs uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Niveau</th>
            <th className="px-4 py-3">Statut</th>
            <th className="px-4 py-3">Véhicule</th>
            <th className="px-4 py-3">Chauffeur</th>
            <th className="px-4 py-3">Mission</th>
            <th className="px-4 py-3 text-center">Score</th>
            <th className="px-4 py-3">Créée le</th>
            <th className="px-4 py-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {alerts.map((alert) => {
            const isExpanded = expandedId === alert.id;
            const hasBreakdown = !!alert.scoreBreakdown?.length;
            const isCritical = alert.level === 'HIGH' || alert.level === 'CRITICAL';
            return (
              <Fragment key={alert.id}>
                <tr
                  className={cn(
                    'border-b border-border transition-colors last:border-0 hover:bg-muted/40',
                    isCritical && 'bg-danger/[0.03]',
                  )}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                          isCritical ? 'bg-danger/10 text-danger' : 'bg-muted text-muted-foreground',
                        )}
                      >
                        <AlertTriangle className="h-4 w-4" />
                      </span>
                      <span className="font-medium text-foreground">{alertTypeToLabel(alert.type)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={LEVEL_TONE[alert.level]} dot data-testid={`alert-level-badge-${alert.id}`}>
                      {alertLevelToLabel(alert.level)}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={STATUS_TONE[alert.status]}>{alertStatusToLabel(alert.status)}</StatusBadge>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{alert.vehicle?.plateNumber ?? alert.vehicleId ?? '—'}</td>
                  <td className="px-4 py-3">
                    {alert.driver ? `${alert.driver.firstName} ${alert.driver.lastName}` : alert.driverId ?? '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-2xs">{alert.mission?.reference ?? alert.missionId ?? '—'}</td>
                  <td className="px-4 py-3 text-center">
                    {hasBreakdown ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 font-bold tabular-nums text-foreground underline decoration-dotted underline-offset-2"
                        onClick={() => setExpandedId(isExpanded ? null : alert.id)}
                        aria-expanded={isExpanded}
                      >
                        {alert.score}
                        <ChevronDown className={cn('h-3 w-3 text-muted-foreground transition-transform', isExpanded && 'rotate-180')} />
                      </button>
                    ) : (
                      <span className="font-bold tabular-nums text-foreground">{alert.score}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">{formatDate(alert.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <AlertStatusActions
                      alertId={alert.id}
                      status={alert.status}
                      disabled={transitioning}
                      onTransition={onTransition}
                    />
                  </td>
                </tr>
                {isExpanded && hasBreakdown && (
                  <tr key={`${alert.id}-breakdown`} className="border-b border-border">
                    <td colSpan={9} className="bg-muted/50 px-4 py-3">
                      <ul className="space-y-1 text-xs">
                        <li className="flex items-center gap-1.5 font-semibold text-foreground">
                          <Fingerprint className="h-3.5 w-3.5 text-primary" />
                          Détail du score
                        </li>
                        {alert.scoreBreakdown!.map((r, i) => (
                          <li key={i} className="flex justify-between gap-4 text-muted-foreground">
                            <span>{r.reason}</span>
                            <span className="font-bold tabular-nums text-foreground">+{r.points}</span>
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                )}
                {isExpanded && !hasBreakdown && alert.message && (
                  <tr key={`${alert.id}-message`} className="border-b border-border">
                    <td colSpan={9} className="bg-muted/50 px-4 py-3 text-xs text-muted-foreground">
                      {alert.message}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}