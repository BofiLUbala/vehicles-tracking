import { vi } from 'vitest';

export const Accuracy = { Lowest: 1, Low: 3, Balanced: 2, High: 4, Highest: 6, BestForNavigation: 6 };

export const requestForegroundPermissionsAsync = vi.fn(async () => ({ granted: true }));
export const requestBackgroundPermissionsAsync = vi.fn(async () => ({ granted: true }));
export const getForegroundPermissionsAsync = vi.fn(async () => ({ granted: true }));
export const getBackgroundPermissionsAsync = vi.fn(async () => ({ granted: true }));
export const hasServicesEnabledAsync = vi.fn(async () => true);
export const getCurrentPositionAsync = vi.fn(async () => ({
  coords: { latitude: -4.325, longitude: 15.322, accuracy: 10, altitude: 300, speed: 25, heading: 90 },
  timestamp: Date.now(),
  mocked: false,
}));
export const watchPositionAsync = vi.fn(async () => ({ remove: vi.fn() }));
export const startLocationUpdatesAsync = vi.fn(async () => undefined);
export const stopLocationUpdatesAsync = vi.fn(async () => undefined);
export const hasStartedLocationUpdatesAsync = vi.fn(async () => false);

export default {
  Accuracy,
  requestForegroundPermissionsAsync,
  requestBackgroundPermissionsAsync,
  getForegroundPermissionsAsync,
  getBackgroundPermissionsAsync,
  hasServicesEnabledAsync,
  getCurrentPositionAsync,
  watchPositionAsync,
  startLocationUpdatesAsync,
  stopLocationUpdatesAsync,
  hasStartedLocationUpdatesAsync,
};
