'use client';

import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import maplibregl, { Map as MapLibreMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MAP_STYLE_URL } from '@/features/geo/map-style';
import { fetchMissionTrace } from '@/features/tracking/api';
import type { LocationDto } from '@/features/locations/types';
import type { MissionStepDto } from '@/features/missions/types';

// RDC par défaut, à défaut d'étapes ou de trace positionnées.
const DEFAULT_CENTER: [number, number] = [23.66, -2.88];
const TRACE_SOURCE_ID = 'mission-vehicle-trace';
const TRACE_LAYER_ID = 'mission-vehicle-trace-line';

export interface MissionTraceMapProps {
  missionId: string;
  steps: MissionStepDto[];
  locationsById: Record<string, LocationDto>;
}

/** Carte de détail mission : marqueurs numérotés pour chaque étape (via `Location.latitude/longitude`)
 * + trace GPS de CETTE mission (par `missionId`), réutilisant `fetchMissionTrace` de
 * `features/tracking/api.ts` (même endpoint que le panneau de tracking). Contrairement à la trace
 * véhicule brute, la trace par mission ne mélange jamais les trajets d'autres missions. */
export function MissionTraceMap({ missionId, steps, locationsById }: MissionTraceMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);

  const traceQuery = useQuery({
    queryKey: ['tracking', 'missions', missionId, 'trace'],
    queryFn: () => fetchMissionTrace(missionId),
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
          'width:24px;height:24px;border-radius:50%;background:#1479FF;color:white;font-size:12px;' +
          'display:flex;align-items:center;justify-content:center;font-weight:600;border:2px solid white;';
        new maplibregl.Marker({ element: el }).setLngLat([location.longitude, location.latitude]).addTo(map);
        bounds.extend([location.longitude, location.latitude]);
      }

      if (map.getLayer(TRACE_LAYER_ID)) map.removeLayer(TRACE_LAYER_ID);
      if (map.getSource(TRACE_SOURCE_ID)) map.removeSource(TRACE_SOURCE_ID);
      if (traceQuery.data?.geojson) {
        map.addSource(TRACE_SOURCE_ID, { type: 'geojson', data: traceQuery.data.geojson });
        map.addLayer({
          id: TRACE_LAYER_ID,
          type: 'line',
          source: TRACE_SOURCE_ID,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#1479FF', 'line-width': 3 },
        });
      }

      if (hasPoints) map.fitBounds(bounds, { padding: 60, maxZoom: 15, duration: 0 });
    }

    if (map.loaded()) render(map);
    else map.once('load', () => render(map));
  }, [steps, locationsById, traceQuery.data]);

  return <div ref={containerRef} data-testid="mission-trace-map" className="h-80 w-full rounded-2xl border border-border" />;
}
