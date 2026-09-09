'use client';

import { useEffect, useRef } from 'react';
import maplibregl, { Map as MapLibreMap, Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const MAP_STYLE_URL = process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? 'https://demotiles.maplibre.org/style.json';
const DEFAULT_CENTER: [number, number] = [2.3522, 48.8566]; // Paris, à défaut de coordonnées connues

export interface LocationMapPickerProps {
  latitude: number | null;
  longitude: number | null;
  onPick: (lat: number, lng: number) => void;
}

/** Mini-carte MapLibre "cliquer pour placer un marqueur" — mêmes bases que
 * `features/tracking/tracking-map.tsx` (fond de carte, cycle de vie de la carte), simplifiée pour
 * un point unique déplaçable au clic. */
export function LocationMapPicker({ latitude, longitude, onPick }: LocationMapPickerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const center: [number, number] =
      latitude != null && longitude != null ? [longitude, latitude] : DEFAULT_CENTER;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE_URL,
      center,
      zoom: latitude != null && longitude != null ? 13 : 5,
    });
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.on('click', (event) => {
      onPickRef.current(event.lngLat.lat, event.lngLat.lng);
    });
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- carte initialisée une seule fois
  }, []);

  // Synchronise le marqueur avec les valeurs latitude/longitude contrôlées par le formulaire.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (latitude == null || longitude == null) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }

    if (!markerRef.current) {
      markerRef.current = new maplibregl.Marker({ color: '#2563eb', draggable: true })
        .setLngLat([longitude, latitude])
        .addTo(map);
      markerRef.current.on('dragend', () => {
        const pos = markerRef.current!.getLngLat();
        onPickRef.current(pos.lat, pos.lng);
      });
    } else {
      markerRef.current.setLngLat([longitude, latitude]);
    }
  }, [latitude, longitude]);

  return (
    <div
      ref={containerRef}
      data-testid="location-map-picker"
      className="h-64 w-full overflow-hidden rounded-md border border-border"
    />
  );
}
