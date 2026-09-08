'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import maplibregl, { Map as MapLibreMap, Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { statusToColor } from '@/features/tracking/status';
import { fetchVehicleTrace } from '@/features/tracking/api';
import { TrackingLegend } from '@/features/tracking/legend';
import { TracePanel } from '@/features/tracking/trace-panel';
import type { LiveVehicle } from '@/features/tracking/types';

const MAP_STYLE_URL = process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? 'https://demotiles.maplibre.org/style.json';
const TRACE_SOURCE_ID = 'vehicle-trace';
const TRACE_LAYER_ID = 'vehicle-trace-line';
const DEFAULT_CENTER: [number, number] = [2.3522, 48.8566]; // Paris, à défaut de véhicules

interface TrackingMapProps {
  vehicles: LiveVehicle[];
  connected: boolean;
}

export function TrackingMap({ vehicles, connected }: TrackingMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const [mapReady, setMapReady] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [traceVisible, setTraceVisible] = useState(false);
  const fittedOnceRef = useRef(false);

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId) ?? null;

  const traceQuery = useQuery({
    queryKey: ['tracking', 'vehicles', selectedVehicleId, 'trace'],
    queryFn: () => fetchVehicleTrace(selectedVehicleId as string),
    enabled: traceVisible && !!selectedVehicleId,
  });

  // Init carte une seule fois.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE_URL,
      center: DEFAULT_CENTER,
      zoom: 5,
    });
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.on('load', () => setMapReady(true));
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
  }, []);

  // Synchronise les marqueurs avec la liste de véhicules (ajout/maj/suppression incrémentale).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const seen = new Set<string>();

    for (const vehicle of vehicles) {
      if (!vehicle.position) continue; // pas encore de position rapportée : pas de marqueur
      seen.add(vehicle.id);
      let marker = markersRef.current.get(vehicle.id);

      if (!marker) {
        const el = document.createElement('button');
        el.type = 'button';
        el.setAttribute('aria-label', `Véhicule ${vehicle.plate}`);
        el.style.width = '16px';
        el.style.height = '16px';
        el.style.borderRadius = '50%';
        el.style.border = '2px solid white';
        el.style.boxShadow = '0 0 0 1px rgba(0,0,0,0.2)';
        el.style.cursor = 'pointer';
        el.addEventListener('click', () => setSelectedVehicleId(vehicle.id));

        marker = new maplibregl.Marker({ element: el })
          .setLngLat([vehicle.position.lng, vehicle.position.lat])
          .addTo(map);
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

    const positioned = vehicles.filter((v): v is typeof v & { position: NonNullable<typeof v.position> } => !!v.position);
    if (!fittedOnceRef.current && positioned.length > 0) {
      fittedOnceRef.current = true;
      const bounds = new maplibregl.LngLatBounds();
      positioned.forEach((v) => bounds.extend([v.position.lng, v.position.lat]));
      map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 0 });
    }
  }, [vehicles, mapReady]);

  // Trace GeoJSON en couche togglable.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    function removeTraceLayer() {
      if (map!.getLayer(TRACE_LAYER_ID)) map!.removeLayer(TRACE_LAYER_ID);
      if (map!.getSource(TRACE_SOURCE_ID)) map!.removeSource(TRACE_SOURCE_ID);
    }

    if (!traceVisible || !traceQuery.data) {
      removeTraceLayer();
      return;
    }

    removeTraceLayer();
    map.addSource(TRACE_SOURCE_ID, { type: 'geojson', data: traceQuery.data });
    map.addLayer({
      id: TRACE_LAYER_ID,
      type: 'line',
      source: TRACE_SOURCE_ID,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': '#2563eb', 'line-width': 3 },
    });

    return () => removeTraceLayer();
  }, [traceVisible, traceQuery.data, mapReady]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" data-testid="maplibre-container" />

      <div className="pointer-events-none absolute left-4 top-4 flex flex-col gap-3">
        <TrackingLegend />
        {!connected && (
          <div className="pointer-events-auto rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
            Connexion temps réel interrompue — les positions peuvent ne pas être à jour.
          </div>
        )}
      </div>

      {vehicles.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <p className="pointer-events-auto rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
            Aucun véhicule en suivi actif pour le moment.
          </p>
        </div>
      )}

      {selectedVehicle && (
        <div className="pointer-events-none absolute right-4 top-4">
          <TracePanel
            vehicle={selectedVehicle}
            traceVisible={traceVisible}
            onToggleTrace={() => setTraceVisible((v) => !v)}
            onClose={() => {
              setSelectedVehicleId(null);
              setTraceVisible(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
