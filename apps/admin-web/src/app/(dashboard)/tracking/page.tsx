import { TrackingMapClient } from '@/features/tracking/tracking-map-client';

export const metadata = {
  title: 'Suivi temps réel — Tracking Vehicles',
};

export default function TrackingPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 px-6 pb-3 pt-5">
        <h1 className="text-2xl font-bold tracking-tight">Suivi des véhicules en temps réel</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Visualisez la position de vos véhicules et l’avancement de leurs missions.
        </p>
      </div>
      <div className="min-h-0 flex-1 px-3 pb-3">
        <TrackingMapClient />
      </div>
    </div>
  );
}