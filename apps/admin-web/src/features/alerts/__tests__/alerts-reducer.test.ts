import { describe, expect, it } from 'vitest';
import { applyAlertCreated } from '@/features/alerts/alerts-reducer';
import type { AlertCreatedEvent, AlertDto } from '@/features/alerts/types';

function makeAlert(overrides: Partial<AlertDto> = {}): AlertDto {
  return {
    id: 'a1',
    type: 'SPEEDING',
    level: 'MEDIUM',
    status: 'NEW',
    score: 10,
    message: null,
    vehicleId: 'v1',
    driverId: 'd1',
    missionId: null,
    createdAt: '2026-09-08T10:00:00.000Z',
    updatedAt: '2026-09-08T10:00:00.000Z',
    ...overrides,
  };
}

function makeEvent(overrides: Partial<AlertCreatedEvent> = {}): AlertCreatedEvent {
  return {
    alertId: 'a2',
    type: 'MOCK_GPS',
    level: 'LOW',
    vehicleId: 'v1',
    driverId: 'd1',
    missionId: null,
    ...overrides,
  };
}

describe('applyAlertCreated', () => {
  it('prepends a new alert built from the event payload', () => {
    const alerts = [makeAlert()];
    const next = applyAlertCreated(alerts, makeEvent());

    expect(next).toHaveLength(2);
    expect(next[0]).toMatchObject({
      id: 'a2',
      type: 'MOCK_GPS',
      level: 'LOW',
      status: 'NEW',
      vehicleId: 'v1',
      driverId: 'd1',
      missionId: null,
    });
    expect(next[1]).toBe(alerts[0]);
  });

  it('is idempotent: ignores an event for an alertId already present', () => {
    const alerts = [makeAlert({ id: 'a2' })];
    const next = applyAlertCreated(alerts, makeEvent({ alertId: 'a2' }));

    expect(next).toBe(alerts);
    expect(next).toHaveLength(1);
  });

  it('works on an empty list', () => {
    const next = applyAlertCreated([], makeEvent());
    expect(next).toHaveLength(1);
    expect(next[0].id).toBe('a2');
  });
});
