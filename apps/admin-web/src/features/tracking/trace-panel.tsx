'use client';

import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { fetchVehicleTrace } from '@/features/tracking/api';
import { statusToLabel } from '@/features/tracking/status';
import type { LiveVehicle } from '@/features/tracking/types';

interface TracePanelProps {
  vehicle: LiveVehicle;
  traceVisible: boolean;
  onToggleTrace: () => void;
  onClose: () => void;
}

export function TracePanel({ vehicle, traceVisible, onToggleTrace, onClose }: TracePanelProps) {
  const traceQuery = useQuery({
    queryKey: ['tracking', 'vehicles', vehicle.id, 'trace'],
    queryFn: () => fetchVehicleTrace(vehicle.id),
    enabled: traceVisible,
  });

  return (
    <div className="pointer-events-auto w-72 rounded-lg border border-border bg-card p-4 shadow-md">
      <div className="mb-2 flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold">{vehicle.plate}</p>
        </div>
        <button
          type="button"
          aria-label="Fermer"
          className="text-muted-foreground hover:text-foreground"
          onClick={onClose}
        >
          ×
        </button>
      </div>
      <div className="mb-3 space-y-1 text-xs">
        <p>
          Statut : <Badge variant="outline">{statusToLabel(vehicle.status)}</Badge>
        </p>
        <p>Vitesse : {vehicle.speedKmh != null ? `${Math.round(vehicle.speedKmh)} km/h` : '—'}</p>
        <p>
          Dernière mise à jour :{' '}
          {vehicle.lastUpdateAt ? new Date(vehicle.lastUpdateAt).toLocaleTimeString('fr-FR') : '—'}
        </p>
      </div>
      <Button size="sm" variant={traceVisible ? 'outline' : 'default'} className="w-full" onClick={onToggleTrace}>
        {traceVisible ? 'Masquer la trace' : 'Voir la trace'}
      </Button>
      {traceVisible && traceQuery.isLoading && (
        <p className="mt-2 text-xs text-muted-foreground">Chargement de la trace…</p>
      )}
      {traceVisible && traceQuery.isError && (
        <p className="mt-2 text-xs text-destructive">Impossible de charger la trace</p>
      )}
    </div>
  );
}
