import { vi } from 'vitest';

// Mock expo-sqlite
vi.mock('expo-sqlite', () => ({
  openDatabaseSync: vi.fn(() => ({
    execSync: vi.fn(),
    runSync: vi.fn(),
    getAllSync: vi.fn(() => []),
    getFirstSync: vi.fn(() => ({ count: 0 })),
  })),
}));

// Mock expo-secure-store
vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn().mockResolvedValue(null),
  setItemAsync: vi.fn().mockResolvedValue(undefined),
  deleteItemAsync: vi.fn().mockResolvedValue(undefined),
}));

// Mock expo-location
vi.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: vi.fn().mockResolvedValue({ granted: true }),
  requestBackgroundPermissionsAsync: vi.fn().mockResolvedValue({ granted: true }),
  getForegroundPermissionsAsync: vi.fn().mockResolvedValue({ granted: true }),
  getBackgroundPermissionsAsync: vi.fn().mockResolvedValue({ granted: true }),
  hasServicesEnabledAsync: vi.fn().mockResolvedValue(true),
  getCurrentPositionAsync: vi.fn().mockResolvedValue({
    coords: {
      latitude: -4.325,
      longitude: 15.322,
      accuracy: 10,
      altitude: 300,
      speed: 25,
      heading: 90,
    },
    timestamp: Date.now(),
    mocked: false,
  }),
  watchPositionAsync: vi.fn().mockResolvedValue({
    remove: vi.fn(),
  }),
  startLocationUpdatesAsync: vi.fn().mockResolvedValue(undefined),
  stopLocationUpdatesAsync: vi.fn().mockResolvedValue(undefined),
  hasStartedLocationUpdatesAsync: vi.fn().mockResolvedValue(false),
  Accuracy: { High: 4 },
}));

// Mock expo-task-manager
vi.mock('expo-task-manager', () => ({
  defineTask: vi.fn(),
}));

// Mock @react-native-community/netinfo
vi.mock('@react-native-community/netinfo', () => ({
  default: {
    addEventListener: vi.fn(() => vi.fn()),
    fetch: vi.fn().mockResolvedValue({ isConnected: true, isInternetReachable: true }),
  },
}));

// Mock react-native
vi.mock('react-native', () => ({
  Platform: { OS: 'android', select: vi.fn((obj: any) => obj.android || obj.default) },
  AppState: {
    addEventListener: vi.fn(() => ({ remove: vi.fn() })),
    currentState: 'active',
  },
  StyleSheet: {
    create: (styles: any) => styles,
    absoluteFillObject: {},
  },
}));

// Mock expo-constants
vi.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {
        apiUrl: 'http://10.0.2.2:3001/api/v1',
      },
    },
  },
}));

