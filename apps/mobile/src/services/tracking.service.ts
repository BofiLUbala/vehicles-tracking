import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import { BACKGROUND_LOCATION_TASK, ACTIVE_TRACKING_KEY } from './background-location.task';
import { GpsQueueRepository } from '../database/gps-queue.repository';

export interface GpsCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number | null;
  speed?: number | null;
  heading?: number | null;
  isMocked: boolean;
  timestamp: string;
}

class TrackingServiceClass {
  private foregroundSubscription: Location.LocationSubscription | null = null;
  private fallbackTimer: ReturnType<typeof setInterval> | null = null;
  private activeVehicleId: string | null = null;
  private activeMissionId: string | null = null;

  async requestPermissions(): Promise<{
    foregroundGranted: boolean;
    backgroundGranted: boolean;
  }> {
    const foreground = await Location.requestForegroundPermissionsAsync();
    if (!foreground.granted) {
      return { foregroundGranted: false, backgroundGranted: false };
    }

    const background = await Location.requestBackgroundPermissionsAsync();
    return {
      foregroundGranted: true,
      backgroundGranted: background.granted,
    };
  }

  async checkPermissions(): Promise<{
    foregroundGranted: boolean;
    backgroundGranted: boolean;
  }> {
    const foreground = await Location.getForegroundPermissionsAsync();
    const background = await Location.getBackgroundPermissionsAsync();
    return {
      foregroundGranted: foreground.granted,
      backgroundGranted: background.granted,
    };
  }

  async isLocationServicesEnabled(): Promise<boolean> {
    return await Location.hasServicesEnabledAsync();
  }

  async getCurrentPosition(): Promise<GpsCoordinates | null> {
    try {
      const isEnabled = await Location.hasServicesEnabledAsync();
      if (!isEnabled) return null;

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      return {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy: loc.coords.accuracy ?? 0,
        altitude: loc.coords.altitude,
        speed: loc.coords.speed,
        heading: loc.coords.heading,
        isMocked: loc.mocked ?? false,
        timestamp: new Date(loc.timestamp).toISOString(),
      };
    } catch {
      return null;
    }
  }

  async startTracking(vehicleId: string, missionId?: string | null): Promise<boolean> {
    this.activeVehicleId = vehicleId;
    this.activeMissionId = missionId || null;

    // Save tracking state for background task
    await SecureStore.setItemAsync(
      ACTIVE_TRACKING_KEY,
      JSON.stringify({ vehicleId, missionId: missionId || null })
    );

    const permissions = await this.checkPermissions();
    if (!permissions.foregroundGranted) {
      const requested = await this.requestPermissions();
      if (!requested.foregroundGranted) return false;
    }

    // Stop existing listeners if any
    await this.stopTrackingOnly();

    // Start foreground position watcher
    try {
      this.foregroundSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 15, // meters
          timeInterval: 10000, // ms
        },
        (loc) => {
          this.handleNewLocation(loc);
        }
      );
    } catch {
      // Ignore watchPosition errors
    }

    // Start background tracking service
    try {
      const isRegistered = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      if (!isRegistered) {
        await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
          accuracy: Location.Accuracy.High,
          distanceInterval: 15,
          timeInterval: 15000,
          deferredUpdatesInterval: 15000,
          showsBackgroundLocationIndicator: true,
          foregroundService: {
            notificationTitle: 'Mission en cours',
            notificationBody: 'Le suivi du véhicule est actif pendant votre mission.',
            notificationColor: '#0284C7',
          },
        });
      }
    } catch {
      // On some platforms or Expo Go, background tracking may not be available without dev-client
    }

    // Fallback periodic capture every 15s
    this.fallbackTimer = setInterval(async () => {
      if (this.activeVehicleId) {
        const pos = await this.getCurrentPosition();
        if (pos) {
          GpsQueueRepository.enqueue({
            vehicleId: this.activeVehicleId,
            missionId: this.activeMissionId,
            latitude: pos.latitude,
            longitude: pos.longitude,
            accuracy: pos.accuracy,
            altitude: pos.altitude,
            speed: pos.speed,
            heading: pos.heading,
            isMocked: pos.isMocked,
            recordedAt: pos.timestamp,
          });
        }
      }
    }, 15000);

    return true;
  }

  private handleNewLocation(loc: Location.LocationObject) {
    if (!this.activeVehicleId) return;

    GpsQueueRepository.enqueue({
      vehicleId: this.activeVehicleId,
      missionId: this.activeMissionId,
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

  private async stopTrackingOnly() {
    if (this.foregroundSubscription) {
      this.foregroundSubscription.remove();
      this.foregroundSubscription = null;
    }

    if (this.fallbackTimer) {
      clearInterval(this.fallbackTimer);
      this.fallbackTimer = null;
    }

    try {
      const isRegistered = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      if (isRegistered) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      }
    } catch {
      // Ignore unregistration errors
    }
  }

  async stopTracking(): Promise<void> {
    await this.stopTrackingOnly();
    this.activeVehicleId = null;
    this.activeMissionId = null;
    await SecureStore.deleteItemAsync(ACTIVE_TRACKING_KEY);
  }

  async restoreTrackingState(): Promise<{
    isTracking: boolean;
    vehicleId: string | null;
    missionId: string | null;
  }> {
    try {
      const activeTrackingJson = await SecureStore.getItemAsync(ACTIVE_TRACKING_KEY);
      if (activeTrackingJson) {
        const parsed = JSON.parse(activeTrackingJson);
        if (parsed?.vehicleId) {
          this.activeVehicleId = parsed.vehicleId;
          this.activeMissionId = parsed.missionId || null;

          const permissions = await this.checkPermissions();
          if (permissions.foregroundGranted) {
            await this.startTracking(parsed.vehicleId, parsed.missionId);
          }

          return {
            isTracking: true,
            vehicleId: parsed.vehicleId,
            missionId: parsed.missionId || null,
          };
        }
      }
    } catch {
      // Ignore recovery errors
    }

    return {
      isTracking: false,
      vehicleId: null,
      missionId: null,
    };
  }

  isTrackingActive(): boolean {
    return this.activeVehicleId !== null;
  }

  getActiveVehicleId(): string | null {
    return this.activeVehicleId;
  }

  getActiveMissionId(): string | null {
    return this.activeMissionId;
  }
}

export const TrackingService = new TrackingServiceClass();
