'use client';

import dynamic from 'next/dynamic';
import { useLiveVehicles } from '@/features/tracking/use-live-vehicles';

// maplibre-gl accède à `window` au chargement du module : rendu client uniquement.
const TrackingMap = dynamic(() => import('@/features/tracking/tracking-map').then((m) => m.TrackingMap), {
  ssr: false,
});

export function TrackingMapClient() {
  const { vehicles, isLoading, isError, connected, socket } = useLiveVehicles();

  if (isLoading) {
    return (
      <div className="flex h-full w-full animate-pulse items-center justify-center rounded-2xl border border-border bg-card text-sm text-muted-foreground shadow-card">
        Chargement des véhicules en direct…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-2xl border border-danger/30 bg-danger/5 text-sm text-danger">
        Impossible de charger les véhicules en direct.
      </div>
    );
  }

  return <TrackingMap vehicles={vehicles} connected={connected} socket={socket} />;
}