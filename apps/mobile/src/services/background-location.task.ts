// Native-only task registration — this file should NOT be imported on web
import { Platform } from 'react-native';
import * as TaskManager from 'expo-task-manager';
import * as SecureStore from 'expo-secure-store';
import { GpsQueueRepository } from '../database/gps-queue.repository';
import { BACKGROUND_LOCATION_TASK, ACTIVE_TRACKING_KEY } from './background-location-constants';

export { BACKGROUND_LOCATION_TASK, ACTIVE_TRACKING_KEY };

// Only run on native platforms
if (Platform.OS !== 'web') {
  TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }: { data?: any; error?: any }) => {
    if (error) return;
    if (data) {
      const { locations } = data as { locations: any[] };
      if (!locations || locations.length === 0) return;
      try {
        const activeTrackingJson = await SecureStore.getItemAsync(ACTIVE_TRACKING_KEY);
        if (!activeTrackingJson) return;
        const { vehicleId, missionId } = JSON.parse(activeTrackingJson);
        if (!vehicleId) return;
        for (const loc of locations) {
          GpsQueueRepository.enqueue({
            vehicleId, missionId,
            latitude: loc.coords.latitude, longitude: loc.coords.longitude,
            accuracy: loc.coords.accuracy, altitude: loc.coords.altitude,
            speed: loc.coords.speed, heading: loc.coords.heading,
            isMocked: loc.mocked ?? false,
            recordedAt: new Date(loc.timestamp).toISOString(),
          });
        }
      } catch {}
    }
  });
}