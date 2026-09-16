import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { GpsCoordinates, TrackingService } from '../services/tracking.service';

interface TrackingContextType {
  isTracking: boolean;
  activeVehicleId: string | null;
  activeMissionId: string | null;
  currentGps: GpsCoordinates | null;
  startTracking: (vehicleId: string, missionId?: string | null) => Promise<boolean>;
  stopTracking: () => Promise<void>;
  refreshCurrentPosition: () => Promise<GpsCoordinates | null>;
}

const TrackingContext = createContext<TrackingContextType | undefined>(undefined);

export const TrackingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [activeVehicleId, setActiveVehicleId] = useState<string | null>(null);
  const [activeMissionId, setActiveMissionId] = useState<string | null>(null);
  const [currentGps, setCurrentGps] = useState<GpsCoordinates | null>(null);

  const refreshCurrentPosition = useCallback(async () => {
    const pos = await TrackingService.getCurrentPosition();
    if (pos) {
      setCurrentGps(pos);
    }
    return pos;
  }, []);

  const startTracking = async (vehicleId: string, missionId?: string | null): Promise<boolean> => {
    const success = await TrackingService.startTracking(vehicleId, missionId);
    if (success) {
      setIsTracking(true);
      setActiveVehicleId(vehicleId);
      setActiveMissionId(missionId || null);
      refreshCurrentPosition();
    }
    return success;
  };

  const stopTracking = async () => {
    await TrackingService.stopTracking();
    setIsTracking(false);
    setActiveVehicleId(null);
    setActiveMissionId(null);
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
        startTracking,
        stopTracking,
        refreshCurrentPosition,
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
