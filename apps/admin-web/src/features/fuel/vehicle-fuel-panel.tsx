'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { fetchVehicleFuelSummary, fetchVehicleFuelAnomalies } from '@/features/fuel/api';
import { alertLevelToLabel, alertTypeToLabel } from '@/features/alerts/alert-level';

export interface VehicleFuelPanelProps {
  vehicleId: string;
}

const CURRENCY_FORMAT = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

export function VehicleFuelPanel({ vehicleId }: VehicleFuelPanelProps) {
  const summaryQuery = useQuery({
    queryKey: ['fuel', 'summary', vehicleId],
    queryFn: () => fetchVehicleFuelSummary(vehicleId),
  });
  const anomaliesQuery = useQuery({
    queryKey: ['fuel', 'anomalies', vehicleId],
    queryFn: () => fetchVehicleFuelAnomalies(vehicleId),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Détail véhicule — {vehicleId}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {summaryQuery.isLoading && <p className="text-sm text-muted-foreground">Chargement du résumé…</p>}
        {summaryQuery.isError && <p className="text-sm text-destructive">Impossible de charger le résumé carburant.</p>}
        {summaryQuery.data && (
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Total litres</p>
              <p className="text-lg font-semibold">{summaryQuery.data.totalLiters.toFixed(1)} L</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Coût total</p>
              <p className="text-lg font-semibold">{CURRENCY_FORMAT.format(summaryQuery.data.totalCost)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Consommation moyenne</p>
              <p className="text-lg font-semibold">
                {summaryQuery.data.averageConsumption != null
                  ? `${summaryQuery.data.averageConsumption.toFixed(1)} L/100km`
                  : '—'}
              </p>
            </div>
          </div>
        )}

        <div>
          <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">Anomalies détectées</p>
          {anomaliesQuery.isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
          {anomaliesQuery.isError && <p className="text-sm text-destructive">Impossible de charger les anomalies.</p>}
          {anomaliesQuery.data && anomaliesQuery.data.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucune anomalie pour ce véhicule.</p>
          )}
          {anomaliesQuery.data && anomaliesQuery.data.length > 0 && (
            <ul className="flex flex-col gap-2">
              {anomaliesQuery.data.map((alert) => (
                <li key={alert.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                  <span>{alertTypeToLabel(alert.type)}</span>
                  <Badge variant="destructive">{alertLevelToLabel(alert.level)}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
