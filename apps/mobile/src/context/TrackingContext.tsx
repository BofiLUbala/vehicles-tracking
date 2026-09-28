import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { GpsCoordinates, TrackingService } from '../services/tracking.service';
import { CleanFix, GpsFilter, GpsFilterStats, RawFix } from '../geo/gps-filter';

/**
 * Point de la trace AFFICHÉE : position nettoyée (rejets + lissage Kalman, voir `geo/gps-filter`).
 * Les positions brutes, elles, partent inchangées vers le serveur via la file SQLite.
 */
export interface TracePoint {
  latitude: number;
  longitude: number;
  timestamp: string;
  speed?: number | null;
  heading?: number | null;
  accuracy?: number | null;
}

/** Position telle que restaurée depuis le serveur ou la file locale (non filtrée). */
export interface RawTracePoint {
  latitude: number;
  longitude: number;
  recordedAt: string;
  accuracy?: number | null;
  speed?: number | null;
  heading?: number | null;
  isMocked?: boolean;
}

const toTracePoint = (f: CleanFix): TracePoint => ({
  latitude: f.latitude,
  longitude: f.longitude,
  timestamp: f.timestamp,
  speed: f.speed,
  heading: f.heading,
  accuracy: f.accuracy,
});

interface TrackingContextType {
  isTracking: boolean;
  activeVehicleId: string | null;
  activeMissionId: string | null;
  currentGps: GpsCoordinates | null;
  trace: TracePoint[];
  /** Points GPS conservés / rejetés pour la trace affichée (qualité du signal). */
  gpsStats: GpsFilterStats;
  startTracking: (vehicleId: string, missionId?: string | null) => Promise<boolean>;
  stopTracking: () => Promise<void>;
  refreshCurrentPosition: () => Promise<GpsCoordinates | null>;
  /** Ajoute une position brute : elle passe par le filtre avant d'entrer dans la trace. */
  appendTracePoint: (point: RawFix) => void;
  setTraceFromServer: (points: RawTracePoint[]) => void;
}

const TrackingContext = createContext<TrackingContextType | undefined>(undefined);

const MAX_TRACE_POINTS = 5000;

export const TrackingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [activeVehicleId, setActiveVehicleId] = useState<string | null>(null);
  const [activeMissionId, setActiveMissionId] = useState<string | null>(null);
  const [currentGps, setCurrentGps] = useState<GpsCoordinates | null>(null);
  const traceRef = useRef<TracePoint[]>([]);
  const [trace, setTrace] = useState<TracePoint[]>([]);
  const activeTrackingRef = useRef<{ vehicleId: string; missionId: string | null } | null>(null);
  const filterRef = useRef(new GpsFilter());
  const [gpsStats, setGpsStats] = useState<GpsFilterStats>(GpsFilter.emptyStats());

  const resetTrace = useCallback(() => {
    filterRef.current.reset();
    traceRef.current = [];
    setTrace([]);
    setGpsStats(GpsFilter.emptyStats());
  }, []);

  const refreshCurrentPosition = useCallback(async () => {
    const pos = await TrackingService.getCurrentPosition();
    if (pos) {
      setCurrentGps(pos);
    }
    return pos;
  }, []);

  const appendTracePoint = useCallback((point: RawFix) => {
    const result = filterRef.current.push(point);
    setGpsStats(filterRef.current.getStats());
    if (!result.accepted) return;
    traceRef.current = [...traceRef.current, toTracePoint(result.fix)];
    if (traceRef.current.length > MAX_TRACE_POINTS) {
      traceRef.current = traceRef.current.slice(-MAX_TRACE_POINTS);
    }
    setTrace(traceRef.current);
  }, []);

  const setTraceFromServer = useCallback((points: RawTracePoint[]) => {
    // Le filtre est rejoué depuis le début : son état (position lissée, variance) reprend ainsi
    // exactement là où la trace restaurée s'arrête, et les points en direct s'enchaînent sans saut.
    const filter = filterRef.current;
    filter.reset();
    const cleaned: TracePoint[] = [];
    for (const p of points) {
      const r = filter.push({ ...p, timestamp: p.recordedAt });
      if (r.accepted) cleaned.push(toTracePoint(r.fix));
    }
    traceRef.current = cleaned.slice(-MAX_TRACE_POINTS);
    setTrace(traceRef.current);
    setGpsStats(filter.getStats());
  }, []);

  // Chaque position GPS reçue au premier plan met à jour le marqueur ET la trace nettoyée.
  useEffect(() => {
    if (!isTracking) return;
    return TrackingService.addPositionListener((position: GpsCoordinates) => {
      setCurrentGps(position);
      appendTracePoint({ ...position });
    });
  }, [isTracking, appendTracePoint]);

  const startTracking = useCallback(async (vehicleId: string, missionId?: string | null): Promise<boolean> => {
    if (activeTrackingRef.current?.vehicleId === vehicleId && activeTrackingRef.current?.missionId === (missionId || null)) {
      return true;
    }
    const success = await TrackingService.startTracking(vehicleId, missionId);
    if (success) {
      activeTrackingRef.current = { vehicleId, missionId: missionId || null };
      setIsTracking(true);
      setActiveVehicleId(vehicleId);
      setActiveMissionId(missionId || null);
      resetTrace();
      void refreshCurrentPosition();
    }
    return success;
  }, [refreshCurrentPosition, resetTrace]);

  const stopTracking = useCallback(async () => {
    await TrackingService.stopTracking();
    activeTrackingRef.current = null;
    setIsTracking(false);
    setActiveVehicleId(null);
    setActiveMissionId(null);
    resetTrace();
  }, [resetTrace]);

  const restoreTracking = useCallback(async () => {
    const state = await TrackingService.restoreTrackingState();
    if (state.isTracking) {
      activeTrackingRef.current = { vehicleId: state.vehicleId!, missionId: state.missionId };
      setIsTracking(true);
      setActiveVehicleId(state.vehicleId);
      setActiveMissionId(state.missionId);
      refreshCurrentPosition();
    }
  }, [refreshCurrentPosition]);

  useEffect(() => {
    restoreTracking();
    refreshCurrentPosition();
  }, [restoreTracking, refreshCurrentPosition]);

  return (
    <TrackingContext.Provider
      value={{
        isTracking,
        activeVehicleId,
        activeMissionId,
        currentGps,
        trace,
        gpsStats,
        startTracking,
        stopTracking,
        refreshCurrentPosition,
        appendTracePoint,
        setTraceFromServer,
      }}
    >
      {children}
    </TrackingContext.Provider>
  );
};

export const useTracking = (): TrackingContextType => {
  const context = useContext(TrackingContext);
  if (!context) {
    throw new Error('useTracking must be used within a TrackingProvider');
  }
  return context;
};
