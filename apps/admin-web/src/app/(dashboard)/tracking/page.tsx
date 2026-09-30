import { TrackingMapClient } from '@/features/tracking/tracking-map-client';

export const metadata = {
  title: 'Suivi temps réel — Tracking Vehicles',
};

export default function TrackingPage() {
  return (
    <div className="flex h-full flex-col">
      {/* En-tête sur une ligne : la hauteur est réservée à la carte. */}
      <div className="flex shrink-0 flex-wrap items-baseline gap-x-3 gap-y-0.5 px-4 pb-2 pt-3">
        <h1 className="text-lg font-bold tracking-tight">Suivi des véhicules en temps réel</h1>
        <p className="text-sm text-muted-foreground">
          Position de vos véhicules et avancement de leurs missions.
        </p>
      </div>
      <div className="min-h-0 flex-1 px-3 pb-3">
        <TrackingMapClient />
      </div>
    </div>
  );
}