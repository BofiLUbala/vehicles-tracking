'use client';

import { Fragment, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { alertLevelToClass, alertLevelToLabel, alertStatusToLabel, alertTypeToLabel } from '@/features/alerts/alert-level';
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

export function AlertsTable({ alerts, onTransition, transitioning }: AlertsTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (alerts.length === 0) {
    return <p className="p-4 text-sm text-muted-foreground">Aucune alerte pour ces filtres.</p>;
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
            <th className="px-3 py-2">Type</th>
            <th className="px-3 py-2">Niveau</th>
            <th className="px-3 py-2">Statut</th>
            <th className="px-3 py-2">Véhicule</th>
            <th className="px-3 py-2">Chauffeur</th>
            <th className="px-3 py-2">Mission</th>
            <th className="px-3 py-2">Score</th>
            <th className="px-3 py-2">Créée le</th>
            <th className="px-3 py-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {alerts.map((alert) => {
            const isExpanded = expandedId === alert.id;
            const hasBreakdown = !!alert.scoreBreakdown?.length;
            return (
              <Fragment key={alert.id}>
                <tr className="border-b border-border">
                  <td className="px-3 py-2">{alertTypeToLabel(alert.type)}</td>
                  <td className="px-3 py-2">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
                        alertLevelToClass(alert.level),
                      )}
                      data-testid={`alert-level-badge-${alert.id}`}
                    >
                      {alertLevelToLabel(alert.level)}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant="outline">{alertStatusToLabel(alert.status)}</Badge>
                  </td>
                  <td className="px-3 py-2">{alert.vehicle?.plateNumber ?? alert.vehicleId ?? '—'}</td>
                  <td className="px-3 py-2">
                    {alert.driver ? `${alert.driver.firstName} ${alert.driver.lastName}` : alert.driverId ?? '—'}
                  </td>
                  <td className="px-3 py-2">{alert.mission?.reference ?? alert.missionId ?? '—'}</td>
                  <td className="px-3 py-2">
                    {hasBreakdown ? (
                      <button
                        type="button"
                        className="underline decoration-dotted"
                        onClick={() => setExpandedId(isExpanded ? null : alert.id)}
                        aria-expanded={isExpanded}
                      >
                        {alert.score}
                      </button>
                    ) : (
                      alert.score
                    )}
                  </td>
                  <td className="px-3 py-2">{formatDate(alert.createdAt)}</td>
                  <td className="px-3 py-2">
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
                    <td colSpan={9} className="bg-muted px-3 py-2 text-xs">
                      <ul className="space-y-0.5">
                        {alert.scoreBreakdown!.map((r, i) => (
                          <li key={i} className="flex justify-between gap-4">
                            <span>{r.reason}</span>
                            <span className="font-medium">+{r.points}</span>
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                )}
                {isExpanded && !hasBreakdown && alert.message && (
                  <tr key={`${alert.id}-message`} className="border-b border-border">
                    <td colSpan={9} className="bg-muted px-3 py-2 text-xs text-muted-foreground">
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
