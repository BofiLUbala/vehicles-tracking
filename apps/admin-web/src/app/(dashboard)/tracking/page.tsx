import { TrackingMapClient } from '@/features/tracking/tracking-map-client';

export const metadata = {
  title: 'Carte temps réel — Tracking Vehicles',
};

export default function TrackingPage() {
  return (
    <div className="h-full w-full">
      <TrackingMapClient />
    </div>
  );
}
