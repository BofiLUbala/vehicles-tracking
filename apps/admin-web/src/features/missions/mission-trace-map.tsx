'use client';

import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import maplibregl, { Map as MapLibreMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { fetchVehicleTrace } from '@/features/tracking/api';
import type { LocationDto } from '@/features/locations/types';
import type { MissionStepDto } from '@/features/missions/types';

const MAP_STYLE_URL = process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? 'https://demotiles.maplibre.org/style.json';
const DEFAULT_CENTER: [number, number] = [2.3522, 48.8566];
const TRACE_SOURCE_ID = 'mission-vehicle-trace';
const TRACE_LAYER_ID = 'mission-vehicle-trace-line';

export interface MissionTraceMapProps {
  vehicleId: string;
  steps: MissionStepDto[];
  locationsById: Record<string, LocationDto>;
}

/** Carte de détail mission : marqueurs numérotés pour chaque étape (via `Location.latitude/longitude`)
 * + trace GPS du véhicule affecté, réutilisant `fetchVehicleTrace` de `features/tracking/api.ts`
 * (même endpoint et même rendu de couche GeoJSON que `features/tracking/tracking-map.tsx`). */
export function MissionTraceMap({ vehicleId, steps, locationsById }: MissionTraceMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);

  const traceQuery = useQuery({
    queryKey: ['tracking', 'vehicles', vehicleId, 'trace'],
    queryFn: () => fetchVehicleTrace(vehicleId),
  });

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE_URL,
      center: DEFAULT_CENTER,
      zoom: 5,
    });
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    function render(map: MapLibreMap) {
      const bounds = new maplibregl.LngLatBounds();
      let hasPoints = false;

      for (const step of [...steps].sort((a, b) => a.order - b.order)) {
        const location = locationsById[step.locationId];
        if (!location) continue;
        hasPoints = true;
        const el = document.createElement('div');
        el.textContent = String(step.order);
        el.style.cssText =
          'width:24px;height:24px;border-radius:50%;background:#2563eb;color:white;font-size:12px;' +
          'display:flex;align-items:center;justify-content:center;font-weight:600;border:2px solid white;';
        new maplibregl.Marker({ element: el }).setLngLat([location.longitude, location.latitude]).addTo(map);
        bounds.extend([location.longitude, location.latitude]);
      }

      if (map.getLayer(TRACE_LAYER_ID)) map.removeLayer(TRACE_LAYER_ID);
      if (map.getSource(TRACE_SOURCE_ID)) map.removeSource(TRACE_SOURCE_ID);
      if (traceQuery.data) {
        map.addSource(TRACE_SOURCE_ID, { type: 'geojson', data: traceQuery.data });
        map.addLayer({
          id: TRACE_LAYER_ID,
          type: 'line',
          source: TRACE_SOURCE_ID,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#16a34a', 'line-width': 3 },
        });
      }

      if (hasPoints) map.fitBounds(bounds, { padding: 60, maxZoom: 15, duration: 0 });
    }

    if (map.loaded()) render(map);
    else map.once('load', () => render(map));
  }, [steps, locationsById, traceQuery.data]);

  return <div ref={containerRef} data-testid="mission-trace-map" className="h-80 w-full rounded-md border border-border" />;
}
