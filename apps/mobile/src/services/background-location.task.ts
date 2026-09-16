import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import { GpsQueueRepository } from '../database/gps-queue.repository';

export const BACKGROUND_LOCATION_TASK = 'background-location-task';
export const ACTIVE_TRACKING_KEY = 'tv_active_tracking';

// Define background location task
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    return;
  }
  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    if (!locations || locations.length === 0) return;

    try {
      const activeTrackingJson = await SecureStore.getItemAsync(ACTIVE_TRACKING_KEY);
      if (!activeTrackingJson) return;

      const { vehicleId, missionId } = JSON.parse(activeTrackingJson);
      if (!vehicleId) return;

      for (const loc of locations) {
        GpsQueueRepository.enqueue({
          vehicleId,
          missionId,
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          accuracy: loc.coords.accuracy,
          altitude: loc.coords.altitude,
          speed: loc.coords.speed,
          heading: loc.coords.heading,
          isMocked: loc.mocked ?? false,
          recordedAt: new Date(loc.timestamp).toISOString(),
        });
      }
    } catch {
      // Ignore background processing errors
    }
  }
});
