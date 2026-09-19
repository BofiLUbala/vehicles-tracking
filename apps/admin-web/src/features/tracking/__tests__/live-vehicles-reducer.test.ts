import { describe, expect, it } from 'vitest';
import { applyOfflineUpdate, applyPositionUpdate, applyStatusUpdate } from '@/features/tracking/live-vehicles-reducer';
import type {
  LiveVehicle,
  VehicleStatusUpdatedEvent,
  VehicleTrackingStatus,
  VehiclePositionUpdatedEvent,
} from '@/features/tracking/types';

function makeVehicle(overrides: Partial<LiveVehicle> = {}): LiveVehicle {
  return {
    id: 'v1',
    plate: 'AB-123-CD',
    status: 'STOPPED',
    activeMissionId: null,
    speedKmh: 0,
    heading: 0,
    accuracy: null,
    lastUpdateAt: '2026-09-08T10:00:00.000Z',
    position: { lat: 48.85, lng: 2.35 },
    ...overrides,
  };
}

function makeEvent(overrides: Partial<VehiclePositionUpdatedEvent> = {}): VehiclePositionUpdatedEvent {
  return {
    vehicleId: 'v1',
    missionId: null,
    latitude: 48.9,
    longitude: 2.4,
    accuracy: 8.5,
    speed: 42,
    heading: 90,
    recordedAt: '2026-09-08T10:05:00.000Z',
    ...overrides,
  };
}

function makeStatusEvent(overrides: Partial<VehicleStatusUpdatedEvent> = {}): VehicleStatusUpdatedEvent {
  return { vehicleId: 'v1', status: 'MOVING', ...overrides };
}

describe('applyPositionUpdate', () => {
  it('updates position, accuracy, speed, heading and lastUpdateAt for the matching vehicle, leaving status untouched', () => {
    const vehicles = [makeVehicle()];
    const event = makeEvent();

    const next = applyPositionUpdate(vehicles, event);

    expect(next).not.toBe(vehicles); // nouvelle référence de tableau
    expect(next[0]).toEqual({
      ...vehicles[0],
      position: { lat: 48.9, lng: 2.4 },
      accuracy: 8.5,
      speedKmh: 42,
      heading: 90,
      lastUpdateAt: '2026-09-08T10:05:00.000Z',
      status: 'STOPPED', // inchangé : pas dans le payload de l'événement
      activeMissionId: null, // inchangé : pas de missionId dans l'événement
    });
  });

  it('leaves other vehicles untouched (same reference, no re-render)', () => {
    const untouched = makeVehicle({ id: 'v2', plate: 'ZZ-999-ZZ' });
    const vehicles = [makeVehicle(), untouched];

    const next = applyPositionUpdate(vehicles, makeEvent());

    expect(next[1]).toBe(untouched);
  });

  it('ignores an event for an unknown vehicle id and returns the same array reference', () => {
    const vehicles = [makeVehicle()];

    const next = applyPositionUpdate(vehicles, makeEvent({ vehicleId: 'does-not-exist' }));

    expect(next).toBe(vehicles);
  });

  it('is exhaustive across all tracking statuses (status is preserved for each)', () => {
    const statuses: VehicleTrackingStatus[] = ['MOVING', 'ON_MISSION', 'STOPPED', 'OFFLINE', 'SUSPICIOUS'];
    for (const status of statuses) {
      const vehicles = [makeVehicle({ status })];
      const next = applyPositionUpdate(vehicles, makeEvent());
      expect(next[0].status).toBe(status);
    }
  });
});

describe('applyStatusUpdate', () => {
  it('applies the derived status to the matching vehicle', () => {
    const vehicles = [makeVehicle({ status: 'STOPPED' })];
    const next = applyStatusUpdate(vehicles, makeStatusEvent({ status: 'MOVING' }));
    expect(next[0].status).toBe('MOVING');
  });

  it('returns the same array reference when the status is already up to date', () => {
    const vehicles = [makeVehicle({ status: 'MOVING' })];
    const next = applyStatusUpdate(vehicles, makeStatusEvent({ status: 'MOVING' }));
    expect(next).toBe(vehicles);
  });

  it('ignores an event for an unknown vehicle id', () => {
    const vehicles = [makeVehicle()];
    const next = applyStatusUpdate(vehicles, makeStatusEvent({ vehicleId: 'nope' }));
    expect(next).toBe(vehicles);
  });
});

describe('applyOfflineUpdate', () => {
  it('forces the status to OFFLINE, preserving the last known position', () => {
    const vehicles = [makeVehicle({ status: 'MOVING' })];
    const next = applyOfflineUpdate(vehicles, 'v1');
    expect(next[0].status).toBe('OFFLINE');
    expect(next[0].position).toEqual(vehicles[0].position);
  });

  it('is idempotent and ignores unknown vehicles', () => {
    const alreadyOffline = [makeVehicle({ status: 'OFFLINE' })];
    expect(applyOfflineUpdate(alreadyOffline, 'v1')).toBe(alreadyOffline);
    const other = [makeVehicle()];
    expect(applyOfflineUpdate(other, 'nope')).toBe(other);
  });
});
