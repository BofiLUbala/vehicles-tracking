'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import maplibregl, { Map as MapLibreMap, Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { statusToColor, statusToLabel } from '@/features/tracking/status';
import { TrackingLegend } from '@/features/tracking/legend';
import { VehiclePanel } from '@/features/tracking/vehicle-panel';
import { ConnectionStatus } from '@/components/connection-status';
import { EmptyState } from '@/components/empty-state';
import type { LiveVehicle, MissionTraceResponse } from '@/features/tracking/types';
import { RegionSelector } from '@/features/geo/region-selector';
import { EMPTY_SELECTION, resolveTarget, selectionPath, type RegionSelection } from '@/features/geo/selection';
import { presetFor, type MapViewMode } from '@/features/geo/view-mode';
import { isStyleUsable, syncCamera } from '@/features/geo/map-camera';
import { MAP_STYLE_URL } from '@/features/geo/map-style';
import { cn } from '@/lib/utils';

const TRACE_SOURCE_ID = 'mission-trace';
const TRACE_LAYER_ID = 'mission-trace-line';
const STEP_SOURCE_ID = 'mission-steps';
const STEP_LAYER_ID = 'mission-steps-layer';
const DEFAULT_CENTER: [number, number] = [23.66, -2.88];
const TRACE_COLOR = '#1479FF';

interface TrackingMapProps {
  vehicles: LiveVehicle[];
  connected: boolean;
  socket: import('socket.io-client').Socket | null;
  onConnectionState?: (state: 'live' | 'connecting' | 'offline') => void;
}

/** Centre de contrôle temps réel : marqueurs de flotte + tracé mission + panneau véhicule sélectionné. */
export function TrackingMap({ vehicles, connected, socket }: TrackingMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const tracePointsRef = useRef<{ latitude: number; longitude: number }[]>([]);
  const mapReadyRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [traceVisible, setTraceVisible] = useState(false);
  const [missionTrace, setMissionTrace] = useState<MissionTraceResponse | null>(null);
  const [region, setRegion] = useState<RegionSelection>(EMPTY_SELECTION);
  const [viewMode, setViewMode] = useState<MapViewMode>('auto');
  const [regionPanelOpen, setRegionPanelOpen] = useState(true);
  const fittedOnceRef = useRef(false);
  const previousMissionIdRef = useRef<string | null>(null);

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId) ?? null;
  const regionTarget = resolveTarget(region);
  const preset = presetFor(viewMode, regionTarget?.level ?? 'world');
  const regionPath = selectionPath(region);
  const regionKey = regionTarget ? `${regionTarget.center.join(',')}:${regionTarget.zoom}` : '';

  const drawTrace = useCallback((points: { latitude: number; longitude: number }[]) => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current) return;

    if (map.getLayer(TRACE_LAYER_ID)) map.removeLayer(TRACE_LAYER_ID);
    if (map.getSource(TRACE_SOURCE_ID)) map.removeSource(TRACE_SOURCE_ID);

    if (points.length < 2) return;

    const geojson: GeoJSON.Feature = {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: points.map((p) => [p.longitude, p.latitude]),
      },
      properties: {},
    };

    map.addSource(TRACE_SOURCE_ID, { type: 'geojson', data: geojson });
    map.addLayer({
      id: TRACE_LAYER_ID,
      type: 'line',
      source: TRACE_SOURCE_ID,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': TRACE_COLOR, 'line-width': 4, 'line-opacity': 0.9 },
    });
  }, []);

  const drawStepMarkers = useCallback((trace: MissionTraceResponse | null, steps: { order: number; lat: number; lng: number }[] = []) => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current) return;
    if (map.getLayer(STEP_LAYER_ID)) map.removeLayer(STEP_LAYER_ID);
    if (map.getSource(STEP_SOURCE_ID)) map.removeSource(STEP_SOURCE_ID);
    if (steps.length === 0) return;
    map.addSource(STEP_SOURCE_ID, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: steps.map((s) => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
          properties: { order: s.order },
        })),
      },
    });
    map.addLayer({
      id: STEP_LAYER_ID,
      type: 'circle',
      source: STEP_SOURCE_ID,
      paint: {
        'circle-radius': 12,
        'circle-color': '#FFFFFF',
        'circle-stroke-width': 4,
        'circle-stroke-color': '#F59E0B',
      },
    });
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  void drawStepMarkers;

  const handleMissionTraceLoaded = useCallback(
    (trace: MissionTraceResponse) => {
      setMissionTrace(trace);
      tracePointsRef.current = trace.positions;
      if (traceVisible) drawTrace(tracePointsRef.current);
    },
    [traceVisible, drawTrace],
  );

  const handleLivePoint = useCallback(
    (point: { latitude: number; longitude: number }) => {
      tracePointsRef.current = [...tracePointsRef.current, point];
      if (traceVisible) drawTrace(tracePointsRef.current);
    },
    [traceVisible, drawTrace],
  );

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE_URL,
      center: DEFAULT_CENTER,
      zoom: 3.4,
    });
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    const markReady = () => {
      if (isStyleUsable(map)) {
        mapReadyRef.current = true;
        setMapReady(true);
      }
    };
    map.on('styledata', markReady);
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
    if (regionTarget) fittedOnceRef.current = true;
    syncCamera(map, preset, regionTarget);
  }, [mapReady, preset, regionKey]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const seen = new Set<string>();

    for (const vehicle of vehicles) {
      if (!vehicle.position) continue;
      seen.add(vehicle.id);
      let marker = markersRef.current.get(vehicle.id);

      if (!marker) {
        const el = document.createElement('button');
        el.type = 'button';
        el.setAttribute('aria-label', `Véhicule ${vehicle.plate}`);
        el.style.cursor = 'pointer';
        marker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([vehicle.position.lng, vehicle.position.lat])
          .addTo(map);
        markersRef.current.set(vehicle.id, marker);
      } else {
        marker.setLngLat([vehicle.position.lng, vehicle.position.lat]);
      }

      const el = marker.getElement() as HTMLElement;
      const isSelected = selectedVehicleId === vehicle.id;
      el.className = '';
      el.style.width = isSelected ? '20px' : '16px';
      el.style.height = isSelected ? '20px' : '16px';
      el.style.borderRadius = '50%';
      el.style.border = '3px solid #FFFFFF';
      el.style.boxShadow = isSelected
        ? `0 0 0 3px rgba(20,121,255,0.55), 0 0 12px rgba(20,121,255,0.9), 0 1px 3px rgba(0,0,0,0.4)`
        : '0 1px 3px rgba(0,0,0,0.35)';
      el.style.backgroundColor = statusToColor(vehicle.status);
      el.onclick = () => setSelectedVehicleId(vehicle.id);

      if (selectedVehicleId === vehicle.id) {
        let label = el.querySelector('.vehicle-label');
        if (!label) {
          label = document.createElement('span');
          label.className = 'vehicle-label';
          (label as HTMLElement).style.cssText =
            'position:absolute;top:100%;left:50%;transform:translateX(-50%);margin-top:4px;white-space:nowrap;' +
            'background:#0B1F33;color:#fff;font-size:11px;font-weight:600;padding:3px 8px;border-radius:8px;';
          el.appendChild(label);
        }
        (label as HTMLElement).textContent = vehicle.plate;
      } else {
        el.querySelector('.vehicle-label')?.remove();
      }
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
  }, [vehicles, mapReady, selectedVehicleId]);

  // Manage trace drawing on toggle
  useEffect(() => {
    if (traceVisible && tracePointsRef.current.length >= 2) {
      drawTrace(tracePointsRef.current);
    } else {
      const map = mapRef.current;
      if (map) {
        if (map.getLayer(TRACE_LAYER_ID)) map.removeLayer(TRACE_LAYER_ID);
        if (map.getSource(TRACE_SOURCE_ID)) map.removeSource(TRACE_SOURCE_ID);
      }
    }
  }, [traceVisible, drawTrace]);

  // Reset trace state when selecting a different vehicle
  useEffect(() => {
    if (selectedVehicleId) {
      const newMissionId = vehicles.find((v) => v.id === selectedVehicleId)?.activeMissionId ?? null;
      if (newMissionId !== previousMissionIdRef.current) {
        previousMissionIdRef.current = newMissionId;
        tracePointsRef.current = [];
        setMissionTrace(null);
        setTraceVisible(false);
        const map = mapRef.current;
        if (map) {
          if (map.getLayer(TRACE_LAYER_ID)) map.removeLayer(TRACE_LAYER_ID);
          if (map.getSource(TRACE_SOURCE_ID)) map.removeSource(TRACE_SOURCE_ID);
        }
      }
    }
  }, [selectedVehicleId, vehicles]);

  return (
    <div className="flex h-full w-full gap-3 p-3">
      <div className={cn('relative min-w-0 flex-1', selectedVehicle ? 'xl:basis-3/4' : '')}>
        <div ref={containerRef} className="h-full w-full overflow-hidden rounded-2xl border border-border shadow-card" data-testid="maplibre-container" />

        {selectedVehicle && (
          <div className="absolute right-3 top-3 z-10 hidden xl:block">
            <ConnectionStatus state={connected ? 'live' : 'offline'} />
          </div>
        )}

        <div className="pointer-events-none absolute left-4 top-4 z-10 flex max-w-[min(38rem,calc(100%-2rem))] flex-col gap-2.5">
          <div className="pointer-events-auto rounded-xl border border-border bg-card/95 shadow-card backdrop-blur">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-4 px-3.5 py-2.5 text-xs"
              aria-expanded={regionPanelOpen}
              onClick={() => setRegionPanelOpen((open) => !open)}
            >
              <span className="truncate">
                <span className="font-semibold text-foreground">Région</span>
                {regionPath.length > 0 && (
                  <span className="text-muted-foreground"> — {regionPath.join(' > ')}</span>
                )}
              </span>
              <span aria-hidden className="text-muted-foreground">
                {regionPanelOpen ? '−' : '+'}
              </span>
            </button>
            {regionPanelOpen && (
              <div className="border-t border-border px-3.5 pb-3 pt-2.5">
                <RegionSelector
                  dense
                  selection={region}
                  onSelectionChange={setRegion}
                  viewMode={viewMode}
                  onViewModeChange={setViewMode}
                />
              </div>
            )}
          </div>
          <TrackingLegend />
          {!connected && (
            <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-danger/30 bg-card/95 px-3.5 py-2.5 text-xs font-semibold text-danger shadow-card backdrop-blur">
              <ConnectionStatus state="offline" />
              <span>Connexion temps réel interrompue — les positions peuvent être en retard.</span>
            </div>
          )}
        </div>

        {vehicles.length === 0 && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
            <div className="pointer-events-auto rounded-2xl border border-border bg-card p-6 shadow-pop">
              <EmptyState title="Aucun véhicule en suivi actif" description="Les véhicules connectés apparaîtront ici en temps réel." />
            </div>
          </div>
        )}
      </div>

      <div
        className={cn(
          'w-full shrink-0 flex-col gap-3 overflow-visible',
          selectedVehicle ? 'flex xl:w-[25%] xl:min-w-[22rem]' : 'hidden w-0',
        )}
      >
        {selectedVehicle && (
          <VehiclePanel
            vehicle={selectedVehicle}
            traceVisible={traceVisible}
            connected={connected}
            onToggleTrace={() => setTraceVisible((v) => !v)}
            onClose={() => {
              setSelectedVehicleId(null);
              setTraceVisible(false);
              setMissionTrace(null);
              tracePointsRef.current = [];
            }}
            onMissionTraceLoaded={handleMissionTraceLoaded}
            onLivePoint={handleLivePoint}
            socket={socket}
            trace={missionTrace}
          />
        )}
      </div>
    </div>
  );
}