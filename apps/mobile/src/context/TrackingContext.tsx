import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { GpsCoordinates, TrackingService } from '../services/tracking.service';

export interface TracePoint {
  latitude: number;
  longitude: number;
  timestamp: string;
}

interface TrackingContextType {
  isTracking: boolean;
  activeVehicleId: string | null;
  activeMissionId: string | null;
  currentGps: GpsCoordinates | null;
  trace: TracePoint[];
  startTracking: (vehicleId: string, missionId?: string | null) => Promise<boolean>;
  stopTracking: () => Promise<void>;
  refreshCurrentPosition: () => Promise<GpsCoordinates | null>;
  appendTracePoint: (point: TracePoint) => void;
  setTraceFromServer: (points: { latitude: number; longitude: number; recordedAt: string }[]) => void;
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

  const refreshCurrentPosition = useCallback(async () => {
    const pos = await TrackingService.getCurrentPosition();
    if (pos) {
      setCurrentGps(pos);
    }
    return pos;
  }, []);

  const appendTracePoint = useCallback((point: TracePoint) => {
    traceRef.current = [...traceRef.current, point];
    if (traceRef.current.length > MAX_TRACE_POINTS) {
      traceRef.current = traceRef.current.slice(-MAX_TRACE_POINTS);
    }
    setTrace([...traceRef.current]);
  }, []);

  const setTraceFromServer = useCallback((points: { latitude: number; longitude: number; recordedAt: string }[]) => {
    const serverTrace: TracePoint[] = points.map((p) => ({
      latitude: p.latitude,
      longitude: p.longitude,
      timestamp: p.recordedAt,
    }));
    traceRef.current = serverTrace;
    setTrace([...traceRef.current]);
  }, []);

  const startTracking = async (vehicleId: string, missionId?: string | null): Promise<boolean> => {
    const success = await TrackingService.startTracking(vehicleId, missionId);
    if (success) {
      setIsTracking(true);
      setActiveVehicleId(vehicleId);
      setActiveMissionId(missionId || null);
      traceRef.current = [];
      setTrace([]);
      refreshCurrentPosition();
    }
    return success;
  };

  const stopTracking = async () => {
    await TrackingService.stopTracking();
    setIsTracking(false);
    setActiveVehicleId(null);
    setActiveMissionId(null);
    traceRef.current = [];
    setTrace([]);
  };

  const restoreTracking = useCallback(async () => {
    const state = await TrackingService.restoreTrackingState();
    if (state.isTracking) {
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
