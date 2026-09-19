/* eslint-disable import/first -- vi.mock() must textually precede imports (Vitest hoists them) */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(async (): Promise<string | null> => null),
  setItemAsync: vi.fn(async (): Promise<void> => undefined),
  deleteItemAsync: vi.fn(async (): Promise<void> => undefined),
}));

vi.mock('expo-modules-core', () => ({
  requireNativeModule: vi.fn((): Record<string, unknown> => ({})),
  requireOptionalNativeModule: vi.fn((): null => null),
  NativeModulesProxy: {},
}));

vi.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: vi.fn(async () => ({ granted: true })),
  requestBackgroundPermissionsAsync: vi.fn(async () => ({ granted: true })),
  getForegroundPermissionsAsync: vi.fn(async () => ({ granted: true })),
  getBackgroundPermissionsAsync: vi.fn(async () => ({ granted: true })),
  hasServicesEnabledAsync: vi.fn(async () => true),
  getCurrentPositionAsync: vi.fn(async () => ({
    coords: { latitude: -4.325, longitude: 15.322, accuracy: 10 },
    timestamp: Date.now(),
  })),
  watchPositionAsync: vi.fn(async () => ({ remove: vi.fn() })),
  hasStartedLocationUpdatesAsync: vi.fn(async () => false),
  startLocationUpdatesAsync: vi.fn(async () => undefined),
  stopLocationUpdatesAsync: vi.fn(async () => undefined),
  Accuracy: { High: 4 },
}));

vi.mock('expo-sqlite', () => ({
  openDatabaseSync: vi.fn(() => ({
    execSync: vi.fn(),
    runSync: vi.fn(),
    getAllSync: vi.fn(() => []),
    getFirstSync: vi.fn(() => ({ count: 0 })),
  })),
}));

import * as SecureStore from 'expo-secure-store';
import { TrackingService } from '../services/tracking.service';
import { MissionsCacheRepository } from '../database/missions-cache.repository';
import { setDatabaseInstanceForTest } from '../database/db';
import { Mission } from '../types/mission.types';

describe('Active Mission Recovery on App Restart', () => {
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      execSync: vi.fn(),
      runSync: vi.fn(),
      getAllSync: vi.fn(() => []),
      getFirstSync: vi.fn(),
    };
    setDatabaseInstanceForTest(mockDb);
  });

  it('recovers active vehicleId and missionId from SecureStore on startup', async () => {
    const savedState = {
      vehicleId: 'veh-recovery-123',
      missionId: 'mis-recovery-456',
    };

    vi.mocked(SecureStore.getItemAsync).mockResolvedValue(JSON.stringify(savedState));

    const state = await TrackingService.restoreTrackingState();

    expect(state.isTracking).toBe(true);
    expect(state.vehicleId).toBe('veh-recovery-123');
    expect(state.missionId).toBe('mis-recovery-456');
    expect(TrackingService.getActiveVehicleId()).toBe('veh-recovery-123');
    expect(TrackingService.getActiveMissionId()).toBe('mis-recovery-456');
    expect(TrackingService.isTrackingActive()).toBe(true);
  });

  it('returns non-tracking state when no active session is in SecureStore', async () => {
    vi.mocked(SecureStore.getItemAsync).mockResolvedValue(null);

    await TrackingService.stopTracking();
    const state = await TrackingService.restoreTrackingState();

    expect(state.isTracking).toBe(false);
    expect(state.vehicleId).toBeNull();
    expect(state.missionId).toBeNull();
    expect(TrackingService.isTrackingActive()).toBe(false);
  });

  it('saves and retrieves offline missions cache from SQLite', () => {
    const mockMissions: Mission[] = [
      {
        id: 'mis-cached-1',
        organizationId: 'org-1',
        driverId: 'drv-1',
        vehicleId: 'veh-1',
        vehiclePlateNumber: 'KN-999-AA',
        status: 'STARTED',
        steps: [
          {
            id: 'step-1',
            missionId: 'mis-cached-1',
            order: 1,
            actionType: 'COLLECT',
            status: 'PENDING',
            plannedAt: '2026-09-16T10:00:00Z',
            toleranceMin: 30,
            locationId: 'loc-1',
            location: {
              id: 'loc-1',
              name: 'Dépôt Limete',
              type: 'DEPOT',
              address: 'Boulevard Lumumba',
              latitude: -4.35,
              longitude: 15.35,
              allowedRadius: 100,
            },
          },
        ],
      },
    ];

    // Test saving to SQLite
    MissionsCacheRepository.save(mockMissions);
    expect(mockDb.runSync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR REPLACE INTO today_missions_cache'),
      [JSON.stringify(mockMissions), expect.any(String)]
    );

    // Test retrieving from SQLite
    mockDb.getFirstSync.mockReturnValue({
      response_json: JSON.stringify(mockMissions),
    });

    const cached = MissionsCacheRepository.get();
    expect(cached).toHaveLength(1);
    expect(cached![0].id).toBe('mis-cached-1');
    expect(cached![0].steps[0].location.name).toBe('Dépôt Limete');
    expect(cached![0].steps[0].location.allowedRadius).toBe(100);
  });
});
