import React, { useRef, useState, useMemo } from 'react';
import { View, StyleSheet, Platform, Text, TouchableOpacity } from 'react-native';
import { Crosshair, Settings2, Plus, Minus, Layers, Box } from 'lucide-react-native';
import { GpsCoordinates } from '../services/tracking.service';
import { AppRadius, AppTheme } from '../theme/colors';
import { MapStatusOverlay } from './MapStatusOverlay';
import { TomTomMapView, TomTomMapHandle } from './TomTomMapView';
import type { LatLng, MapPause, MapSegment, MapState, MobileMapStyle } from '../map/tomtom-map';

export interface MissionStop {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  order: number;
  status: 'PENDING' | 'VALIDATED';
  actionType: string;
}

interface MissionMapProps {
  currentGps: GpsCoordinates | null;
  /** Trace nettoyée ; l'horodatage permet le rejeu et une animation calée sur le GPS. */
  trace: { latitude: number; longitude: number; timestamp?: string; speed?: number | null }[];
  stops: MissionStop[];
  currentStepIndex: number;
  height?: number;
  onSettingsPress?: () => void;
  /** Itinéraire planifié (TomTom Routing via le backend) — affiché à part de la trace réelle. */
  plannedRoute?: { latitude: number; longitude: number }[];
  /** Tronçons colorés par vitesse (sinon trace unie). */
  traceSegments?: MapSegment[];
  /** Trace recalée sur les routes (TomTom Snap to Roads). */
  snappedTrace?: LatLng[];
  /** Arrêts détectés sur la trace. */
  pauses?: MapPause[];
  /** Rejeu : le véhicule est piloté par `mapHandleRef.current.replayTo`. */
  replay?: boolean;
  /** Incrémenter pour recadrer la carte sur toute la trace. */
  fitNonce?: number;
  /** Suivi automatique du véhicule au montage (désactivé pour l'analyse d'un trajet). */
  initialFollow?: boolean;
  mapHandleRef?: React.MutableRefObject<TomTomMapHandle | null>;
  /** Contenu superposé à la carte (légende…). */
  overlay?: React.ReactNode;
}

interface LonLatPoint {
  latitude: number;
  longitude: number;
}

function normalizePoint(p: { latitude?: number; longitude?: number; lat?: number; lng?: number }): LonLatPoint {
  return {
    latitude: p.latitude ?? p.lat ?? 0,
    longitude: p.longitude ?? p.lng ?? 0,
  };
}

// Web-only fallback: renders a styled map placeholder with positioned markers
function WebMapFallback({ currentGps, trace, stops, currentStepIndex, height }: MissionMapProps) {
  const bounds = useMemo(() => {
    const allPoints = [
      ...stops.map((s) => normalizePoint(s)),
      ...(currentGps ? [normalizePoint(currentGps)] : []),
      ...trace.map(normalizePoint),
    ];
    if (allPoints.length === 0) return { minLat: -4.325, maxLat: -4.225, minLng: 15.222, maxLng: 15.422 };
    const lats = allPoints.map((p) => p.latitude);
    const lngs = allPoints.map((p) => p.longitude);
    const pad = 0.005;
    return {
      minLat: Math.min(...lats) - pad,
      maxLat: Math.max(...lats) + pad,
      minLng: Math.min(...lngs) - pad,
      maxLng: Math.max(...lngs) + pad,
    };
  }, [currentGps, trace, stops]);

  const toXY = (lat: number, lng: number) => {
    const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100;
    const y = ((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat)) * 100;
    return { x: Math.max(5, Math.min(95, x)), y: Math.max(5, Math.min(95, y)) };
  };

  const isTrackingLive = !!currentGps;

  return (
    <View style={[styles.container, height ? styles.immersive : null, height ? { height } : null]}>
      <View style={styles.webMap}>
        {/* Grid lines */}
        <View style={[styles.gridLine, { left: '33%', top: 0, bottom: 0, width: 1 }]} />
        <View style={[styles.gridLine, { left: '66%', top: 0, bottom: 0, width: 1 }]} />
        <View style={[styles.gridLine, { top: '33%', left: 0, right: 0, height: 1 }]} />
        <View style={[styles.gridLine, { top: '66%', left: 0, right: 0, height: 1 }]} />

        {/* Trace line (simplified: just show dots) */}
        {trace.length > 1 && trace.slice(0, 50).map((p, i) => {
          const pos = toXY(p.latitude, p.longitude);
          return (
            <View
              key={i}
              style={[styles.traceDot, { left: `${pos.x}%`, top: `${pos.y}%` }]}
            />
          );
        })}

        {/* Stop markers */}
        {stops.map((stop, index) => {
          const pos = toXY(stop.latitude, stop.longitude);
          const isCompleted = stop.status === 'VALIDATED';
          const isCurrent = index === currentStepIndex;
          const color = isCompleted ? AppTheme.success : isCurrent ? AppTheme.tracking : AppTheme.textMuted;
          return (
            <View
              key={stop.id}
              style={[styles.webMarker, { left: `${pos.x}%`, top: `${pos.y}%`, backgroundColor: color }]}
            >
              <Text style={styles.webMarkerText}>{stop.order}</Text>
            </View>
          );
        })}

        {/* Current position */}
        {currentGps && (() => {
          const pos = toXY(currentGps.latitude, currentGps.longitude);
          return (
            <View style={[styles.webVehicle, { left: `${pos.x}%`, top: `${pos.y}%` }]}>
              <View style={styles.webVehicleInner} />
            </View>
          );
        })()}
      </View>

      {!height && <MapStatusOverlay
        active={isTrackingLive}
        label="Suivi GPS en direct"
        meta={trace.length > 0 ? `Trajet réellement parcouru · ${trace.length} points` : undefined}
      />}
    </View>
  );
}

// Native: carte TomTom (MapLibre dans une WebView). Affichage seul : le suivi GPS est indépendant.
function NativeMap({
  currentGps, trace, stops, currentStepIndex, height, onSettingsPress, plannedRoute,
  traceSegments, snappedTrace, pauses, replay, fitNonce, initialFollow = true, mapHandleRef, overlay,
}: MissionMapProps) {
  const ownHandle = useRef<TomTomMapHandle | null>(null);
  const mapHandle = mapHandleRef ?? ownHandle;
  const [follow, setFollow] = useState(initialFollow);
  const [view3d, setView3d] = useState(false);
  const [mapStyle, setMapStyle] = useState<MobileMapStyle>('driving');
  const [recenterNonce, setRecenterNonce] = useState(0);
  const isTrackingLive = !!currentGps;

  const state = useMemo<MapState>(
    () => ({
      gps: currentGps
        ? {
            latitude: currentGps.latitude,
            longitude: currentGps.longitude,
            accuracy: currentGps.accuracy,
            heading: currentGps.heading,
            speed: currentGps.speed,
            timestamp: currentGps.timestamp,
          }
        : null,
      trace: trace.map((p) => ({ ...normalizePoint(p), timestamp: p.timestamp, speed: p.speed })),
      traceSegments,
      snappedTrace,
      pauses,
      plannedRoute: (plannedRoute ?? []).map(normalizePoint),
      stops: stops.map((stop, index) => ({
        id: stop.id,
        name: stop.name,
        order: stop.order,
        latitude: stop.latitude,
        longitude: stop.longitude,
        color: stop.status === 'VALIDATED' ? AppTheme.success : index === currentStepIndex ? AppTheme.tracking : AppTheme.textMuted,
      })),
      follow,
      recenterNonce,
      view3d,
      replay,
      fitNonce,
    }),
    [currentGps, trace, traceSegments, snappedTrace, pauses, plannedRoute, stops, currentStepIndex, follow, recenterNonce, view3d, replay, fitNonce],
  );

  const centerMap = () => {
    setFollow(true);
    setRecenterNonce((n) => n + 1);
  };

  return (
    <View style={[styles.container, height ? styles.immersive : null, height ? { height } : null]}>
      <TomTomMapView state={state} onUserMoved={() => setFollow(false)} handleRef={mapHandle} mapStyle={mapStyle} />
      {!height && !overlay && <MapStatusOverlay active={isTrackingLive} label="Suivi GPS en direct" meta={trace.length > 0 ? `Trajet réellement parcouru · ${trace.length} points` : undefined} />}
      {overlay}
      {height && <>
        <TouchableOpacity
          style={styles.styleControl}
          onPress={() => setMapStyle((m) => (m === 'driving' ? 'satellite' : 'driving'))}
          accessibilityRole="button"
          accessibilityLabel={mapStyle === 'driving' ? 'Vue satellite' : 'Vue standard'}
        >
          <Layers size={18} color={AppTheme.navy} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.view3dControl, view3d && styles.centerControlActive]}
          onPress={() => setView3d((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={view3d ? 'Vue 2D' : 'Vue 3D'}
          accessibilityState={{ selected: view3d }}
        >
          <Box size={18} color={view3d ? '#FFFFFF' : AppTheme.navy} />
        </TouchableOpacity>
        {onSettingsPress && <TouchableOpacity style={styles.settingsControl} onPress={onSettingsPress} accessibilityRole="button" accessibilityLabel="Réglages GPS"><Settings2 size={19} color={AppTheme.navy} /></TouchableOpacity>}
        <View style={styles.zoomControls}>
          <TouchableOpacity style={styles.mapControl} onPress={() => mapHandle.current?.zoomBy(1)} accessibilityRole="button" accessibilityLabel="Zoom avant"><Plus size={20} color={AppTheme.navy} /></TouchableOpacity>
          <TouchableOpacity style={styles.mapControl} onPress={() => mapHandle.current?.zoomBy(-1)} accessibilityRole="button" accessibilityLabel="Zoom arrière"><Minus size={20} color={AppTheme.navy} /></TouchableOpacity>
        </View>
        <TouchableOpacity style={[styles.centerControl, follow && styles.centerControlActive]} onPress={centerMap} accessibilityRole="button" accessibilityLabel="Centrer la carte" accessibilityState={{ selected: follow }}><Crosshair size={18} color={follow ? '#FFFFFF' : AppTheme.navy} /></TouchableOpacity>
      </>}
    </View>
  );
}

export function MissionMap(props: MissionMapProps) {
  if (Platform.OS === 'web') return <WebMapFallback {...props} />;
  return <NativeMap {...props} />;
}

const styles = StyleSheet.create({
  container: { height: 280, borderRadius: AppRadius.xl, overflow: 'hidden', marginBottom: 16, borderWidth: 1, borderColor: AppTheme.border },
  immersive: { borderRadius: 0, marginBottom: 0, borderWidth: 0 },
  settingsControl: { position: 'absolute', top: 12, right: 12, width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', elevation: 4 },
  zoomControls: { position: 'absolute', right: 12, top: 144, borderRadius: 10, overflow: 'hidden', backgroundColor: '#FFFFFF', elevation: 4 },
  mapControl: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: AppTheme.border },
  centerControl: { position: 'absolute', left: 12, bottom: 34, width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', elevation: 4 },
  centerControlActive: { backgroundColor: AppTheme.tracking },
  view3dControl: { position: 'absolute', top: 100, right: 12, width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', elevation: 4 },
  styleControl: { position: 'absolute', top: 56, right: 12, width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', elevation: 4 },
  currentPositionMarker: { width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(20, 121, 255, 0.25)', justifyContent: 'center', alignItems: 'center' },
  currentPositionInner: { width: 11, height: 11, borderRadius: 5.5, backgroundColor: AppTheme.tracking, borderWidth: 2, borderColor: '#FFFFFF' },
  // Web fallback styles
  webMap: { flex: 1, backgroundColor: '#E8F0FE', position: 'relative', overflow: 'hidden' },
  gridLine: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.06)' },
  traceDot: { position: 'absolute', width: 4, height: 4, borderRadius: 2, backgroundColor: AppTheme.tracking, marginLeft: -2, marginTop: -2, opacity: 0.7 },
  webMarker: { position: 'absolute', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginLeft: -12, marginTop: -12, borderWidth: 2, borderColor: '#FFFFFF', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2 },
  webMarkerText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  webVehicle: { position: 'absolute', width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(20, 121, 255, 0.25)', justifyContent: 'center', alignItems: 'center', marginLeft: -14, marginTop: -14 },
  webVehicleInner: { width: 14, height: 14, borderRadius: 7, backgroundColor: AppTheme.tracking, borderWidth: 2, borderColor: '#FFFFFF' },
});
