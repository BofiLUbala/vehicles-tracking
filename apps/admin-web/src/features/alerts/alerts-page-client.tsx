'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ConnectionStatus } from '@/components/connection-status';
import { ErrorState, LoadingSkeleton } from '@/components/empty-state';
import { AlertsFiltersBar } from '@/features/alerts/alerts-filters';
import { AlertsTable } from '@/features/alerts/alerts-table';
import { useAlerts } from '@/features/alerts/use-alerts';
import type { AlertFilters } from '@/features/alerts/types';

export function AlertsPageClient() {
  const [filters, setFilters] = useState<AlertFilters>({});
  const { alerts, isLoading, isError, connected, transition, isTransitioning } = useAlerts(filters);

  return (
    <div className="flex flex-col gap-5 p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Alertes</h1>
          <p className="text-sm text-muted-foreground">
            Surveillance des comportements à risque en temps réel.
          </p>
        </div>
        <ConnectionStatus state={connected ? 'live' : 'offline'} />
      </div>

      <AlertsFiltersBar filters={filters} onChange={setFilters} />

      <Card>
        <CardContent className="p-0">
          {isLoading && <LoadingSkeleton className="h-64" />}
          {isError && <ErrorState message="Impossible de charger les alertes." />}
          {!isLoading && !isError && (
            <AlertsTable alerts={alerts} onTransition={transition} transitioning={isTransitioning} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}