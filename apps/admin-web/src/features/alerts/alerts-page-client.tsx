'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertsFiltersBar } from '@/features/alerts/alerts-filters';
import { AlertsTable } from '@/features/alerts/alerts-table';
import { useAlerts } from '@/features/alerts/use-alerts';
import type { AlertFilters } from '@/features/alerts/types';

export function AlertsPageClient() {
  const [filters, setFilters] = useState<AlertFilters>({});
  const { alerts, isLoading, isError, connected, transition, isTransitioning } = useAlerts(filters);

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Alertes</h1>
        <span className={`text-xs ${connected ? 'text-green-600' : 'text-muted-foreground'}`}>
          {connected ? '● Temps réel connecté' : '○ Temps réel déconnecté'}
        </span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <AlertsFiltersBar filters={filters} onChange={setFilters} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading && <p className="p-4 text-sm text-muted-foreground">Chargement des alertes…</p>}
          {isError && <p className="p-4 text-sm text-destructive">Impossible de charger les alertes.</p>}
          {!isLoading && !isError && (
            <AlertsTable alerts={alerts} onTransition={transition} transitioning={isTransitioning} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
