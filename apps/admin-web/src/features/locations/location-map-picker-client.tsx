'use client';

import dynamic from 'next/dynamic';
import type { LocationMapPickerProps } from '@/features/locations/location-map-picker';

// maplibre-gl accède à `window` au chargement du module (voir features/tracking/tracking-map-client.tsx) :
// rendu client uniquement, jamais lors du SSR.
export const LocationMapPickerClient = dynamic<LocationMapPickerProps>(
  () => import('@/features/locations/location-map-picker').then((m) => m.LocationMapPicker),
  { ssr: false },
);
