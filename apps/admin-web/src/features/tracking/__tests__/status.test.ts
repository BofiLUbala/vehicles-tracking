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
    expect(statusToColor('MOVING')).toBe('#22c55e');
    expect(statusToColor('ON_MISSION')).toBe('#3b82f6');
    expect(statusToColor('STOPPED')).toBe('#f97316');
    expect(statusToColor('OFFLINE')).toBe('#ef4444');
    expect(statusToColor('SUSPICIOUS')).toBe('#a855f7');
  });

  it('falls back to a default color for an unknown status (defensive)', () => {
    expect(statusToColor('UNKNOWN' as VehicleTrackingStatus)).toBe('#6b7280');
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
