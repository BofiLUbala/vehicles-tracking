'use client';

import dynamic from 'next/dynamic';
import { useLiveVehicles } from '@/features/tracking/use-live-vehicles';

// maplibre-gl accède à `window` au chargement du module : rendu client uniquement.
const TrackingMap = dynamic(() => import('@/features/tracking/tracking-map').then((m) => m.TrackingMap), {
  ssr: false,
});

export function TrackingMapClient() {
  const { vehicles, isLoading, isError, connected } = useLiveVehicles();

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
        Chargement des véhicules…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-destructive">
        Impossible de charger les véhicules en direct.
      </div>
    );
  }

  return <TrackingMap vehicles={vehicles} connected={connected} />;
}
