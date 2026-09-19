import React, { useRef, useEffect, useMemo } from 'react';
import { View, StyleSheet, Platform, Text } from 'react-native';
import { GpsCoordinates } from '../services/tracking.service';
import { AppRadius, AppTheme } from '../theme/colors';
import { MapStatusOverlay } from './MapStatusOverlay';

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
  trace: { latitude: number; longitude: number }[];
  stops: MissionStop[];
  currentStepIndex: number;
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
function WebMapFallback({ currentGps, trace, stops, currentStepIndex }: MissionMapProps) {
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
    <View style={styles.container}>
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

      <MapStatusOverlay
        active={isTrackingLive}
        label="Suivi GPS en direct"
        meta={trace.length > 0 ? `Trajet réellement parcouru · ${trace.length} points` : undefined}
      />
    </View>
  );
}

// Native: real MapView
function NativeMap({ currentGps, trace, stops, currentStepIndex }: MissionMapProps) {
  // Lazy import to avoid crash on web
  const MapView = useMemo(() => {
    try { return require('react-native-maps').default; } catch { return null; }
  }, []);
  const { Marker, Polyline, PROVIDER_DEFAULT } = useMemo(() => {
    try { return require('react-native-maps'); } catch { return { Marker: null, Polyline: null, PROVIDER_DEFAULT: null }; }
  }, []);

  const mapRef = useRef<any>(null);
  const isTrackingLive = !!currentGps;

  const initialRegion = useMemo(() => {
    if (currentGps) return { latitude: currentGps.latitude, longitude: currentGps.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 };
    if (stops.length > 0) return { latitude: stops[0].latitude, longitude: stops[0].longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 };
    return { latitude: -4.325, longitude: 15.322, latitudeDelta: 0.1, longitudeDelta: 0.1 };
  }, [currentGps, stops]);

  useEffect(() => {
    if (currentGps && mapRef.current) {
      mapRef.current.animateToRegion({ latitude: currentGps.latitude, longitude: currentGps.longitude, latitudeDelta: 0.005, longitudeDelta: 0.005 }, 500);
    }
  }, [currentGps]);

  const traceCoordinates = useMemo(() => trace.map(normalizePoint), [trace]);

  if (!MapView || !Marker) return <WebMapFallback currentGps={currentGps} trace={trace} stops={stops} currentStepIndex={currentStepIndex} />;

  return (
    <View style={styles.container}>
      <MapView ref={mapRef} style={styles.map} provider={PROVIDER_DEFAULT} initialRegion={initialRegion} showsUserLocation={false} showsMyLocationButton={false} toolbarEnabled={false}>
        {stops.map((stop, index) => {
          const isCompleted = stop.status === 'VALIDATED';
          const isCurrent = index === currentStepIndex;
          const pinColor = isCompleted ? AppTheme.success : isCurrent ? AppTheme.tracking : AppTheme.textMuted;
          return <Marker key={stop.id} coordinate={{ latitude: stop.latitude, longitude: stop.longitude }} title={stop.name} description={`${stop.actionType} - Étape ${stop.order}`} pinColor={pinColor} />;
        })}
        {traceCoordinates.length >= 2 && Polyline && <Polyline coordinates={traceCoordinates} strokeColor={AppTheme.tracking} strokeWidth={4} />}
        {currentGps && (
          <Marker coordinate={{ latitude: currentGps.latitude, longitude: currentGps.longitude }} title="Position actuelle" description={`Précision : ${currentGps.accuracy?.toFixed(0) ?? '?'} m`}>
            <View style={styles.currentPositionMarker}><View style={styles.currentPositionInner} /></View>
          </Marker>
        )}
      </MapView>
      <MapStatusOverlay active={isTrackingLive} label="Suivi GPS en direct" meta={trace.length > 0 ? `Trajet réellement parcouru · ${trace.length} points` : undefined} />
    </View>
  );
}

export function MissionMap(props: MissionMapProps) {
  if (Platform.OS === 'web') return <WebMapFallback {...props} />;
  return <NativeMap {...props} />;
}

const styles = StyleSheet.create({
  container: { height: 280, borderRadius: AppRadius.xl, overflow: 'hidden', marginBottom: 16, borderWidth: 1, borderColor: AppTheme.border },
  map: { flex: 1 },
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
