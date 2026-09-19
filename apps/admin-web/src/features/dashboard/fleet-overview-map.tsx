'use client';

import { useEffect, useRef } from 'react';
import maplibregl, { Map as MapLibreMap, Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { statusToColor } from '@/features/tracking/status';
import { MAP_STYLE_URL } from '@/features/geo/map-style';
import type { LiveVehicle } from '@/features/tracking/types';

const DEFAULT_CENTER: [number, number] = [23.66, -2.88];

/** Mini-carte temps réel (aperçu du tableau de bord) avec marqueurs de véhicules colorés. */
export function FleetOverviewMap({ vehicles }: { vehicles: LiveVehicle[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const fittedOnceRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE_URL,
      center: DEFAULT_CENTER,
      zoom: 3.4,
      attributionControl: false,
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const positioned = vehicles.filter((v): v is typeof v & { position: NonNullable<typeof v.position> } => !!v.position);
    const seen = new Set<string>();

    for (const vehicle of positioned) {
      seen.add(vehicle.id);
      let marker = markersRef.current.get(vehicle.id);
      if (!marker) {
        const el = document.createElement('div');
        el.className = 'rounded-full border-2 border-white shadow-md';
        el.style.width = '14px';
        el.style.height = '14px';
        el.style.cursor = 'pointer';
        marker = new maplibregl.Marker({ element: el }).setLngLat([vehicle.position.lng, vehicle.position.lat]).addTo(map);
        markersRef.current.set(vehicle.id, marker);
      } else {
        marker.setLngLat([vehicle.position.lng, vehicle.position.lat]);
      }
      (marker.getElement() as HTMLElement).style.backgroundColor = statusToColor(vehicle.status);
    }

    for (const [id, marker] of markersRef.current) {
      if (!seen.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    }

    if (!fittedOnceRef.current && positioned.length > 0) {
      fittedOnceRef.current = true;
      const bounds = new maplibregl.LngLatBounds();
      positioned.forEach((v) => bounds.extend([v.position.lng, v.position.lat]));
      map.fitBounds(bounds, { padding: 60, maxZoom: 13, duration: 0 });
    }
  }, [vehicles]);

  return <div ref={containerRef} className="h-full w-full" data-testid="fleet-overview-map" />;
}