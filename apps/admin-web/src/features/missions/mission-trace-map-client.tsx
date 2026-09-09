'use client';

import dynamic from 'next/dynamic';
import type { MissionTraceMapProps } from '@/features/missions/mission-trace-map';

// maplibre-gl accède à `window` au chargement du module : rendu client uniquement (voir
// features/tracking/tracking-map-client.tsx et features/locations/location-map-picker-client.tsx).
export const MissionTraceMapClient = dynamic<MissionTraceMapProps>(
  () => import('@/features/missions/mission-trace-map').then((m) => m.MissionTraceMap),
  { ssr: false },
);
