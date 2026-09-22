// Native-only task registration — this file should NOT be imported on web
import { Platform } from 'react-native';
import * as TaskManager from 'expo-task-manager';
import * as SecureStore from 'expo-secure-store';
import { GpsQueueRepository } from '../database/gps-queue.repository';
import { ActiveOwner } from '../database/active-owner';
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
        const { vehicleId, missionId, driverId } = JSON.parse(activeTrackingJson);
        if (!vehicleId) return;
        // Le suivi appartient au chauffeur qui l'a démarré : s'il n'est plus celui qui est connecté
        // (déconnexion, autre compte sur l'appareil), on n'enregistre RIEN.
        if (!driverId || driverId !== ActiveOwner.get()) return;
        for (const loc of locations) {
          GpsQueueRepository.enqueue({
            driverId, vehicleId, missionId,
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