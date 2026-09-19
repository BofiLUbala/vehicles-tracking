import { describe, expect, it } from 'vitest';
import { statusToColor, statusToLabel, STATUS_COLORS } from '@/features/tracking/status';
import type { VehicleTrackingStatus } from '@/features/tracking/types';

const ALL_STATUSES: VehicleTrackingStatus[] = ['MOVING', 'ON_MISSION', 'STOPPED', 'OFFLINE', 'SUSPICIOUS'];

describe('statusToColor', () => {
  it('maps every known status to a distinct color', () => {
    const colors = ALL_STATUSES.map(statusToColor);
    expect(new Set(colors).size).toBe(ALL_STATUSES.length);
  });

  it('matches the documented legend colors', () => {
    expect(statusToColor('MOVING')).toBe('#18A957');
    expect(statusToColor('ON_MISSION')).toBe('#1479FF');
    expect(statusToColor('STOPPED')).toBe('#F59E0B');
    expect(statusToColor('OFFLINE')).toBe('#98A2B3');
    expect(statusToColor('SUSPICIOUS')).toBe('#E53E3E');
  });

  it('falls back to a default color for an unknown status (defensive)', () => {
    expect(statusToColor('UNKNOWN' as VehicleTrackingStatus)).toBe('#667085');
  });

  it('is exhaustive over STATUS_COLORS keys', () => {
    expect(Object.keys(STATUS_COLORS).sort()).toEqual([...ALL_STATUSES].sort());
  });
});

describe('statusToLabel', () => {
  it('returns a French label for every known status', () => {
    for (const status of ALL_STATUSES) {
      expect(statusToLabel(status)).toBeTruthy();
    }
  });
});
