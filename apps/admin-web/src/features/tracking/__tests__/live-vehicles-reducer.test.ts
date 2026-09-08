import { describe, expect, it } from 'vitest';
import { applyPositionUpdate } from '@/features/tracking/live-vehicles-reducer';
import type { LiveVehicle, VehicleTrackingStatus, VehiclePositionUpdatedEvent } from '@/features/tracking/types';

function makeVehicle(overrides: Partial<LiveVehicle> = {}): LiveVehicle {
  return {
    id: 'v1',
    plate: 'AB-123-CD',
    status: 'STOPPED',
    speedKmh: 0,
    heading: 0,
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
    speed: 42,
    heading: 90,
    recordedAt: '2026-09-08T10:05:00.000Z',
    ...overrides,
  };
}

describe('applyPositionUpdate', () => {
  it('updates position, speed, heading and lastUpdateAt for the matching vehicle, leaving status untouched', () => {
    const vehicles = [makeVehicle()];
    const event = makeEvent();

    const next = applyPositionUpdate(vehicles, event);

    expect(next).not.toBe(vehicles); // nouvelle référence de tableau
    expect(next[0]).toEqual({
      ...vehicles[0],
      position: { lat: 48.9, lng: 2.4 },
      speedKmh: 42,
      heading: 90,
      lastUpdateAt: '2026-09-08T10:05:00.000Z',
      status: 'STOPPED', // inchangé : pas dans le payload de l'événement
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
