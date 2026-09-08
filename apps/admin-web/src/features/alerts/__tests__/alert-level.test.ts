import { describe, expect, it } from 'vitest';
import { alertLevelToClass, alertLevelToLabel, ALERT_LEVEL_CLASSES } from '@/features/alerts/alert-level';
import type { AlertLevel } from '@/features/alerts/types';

const ALL_LEVELS: AlertLevel[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

describe('alertLevelToClass', () => {
  it('maps every known level to a distinct set of classes', () => {
    const classes = ALL_LEVELS.map(alertLevelToClass);
    expect(new Set(classes).size).toBe(ALL_LEVELS.length);
  });

  it('maps LOW/MEDIUM to non-red (info/warning) tones and HIGH/CRITICAL to red (critical) tones', () => {
    expect(alertLevelToClass('LOW')).not.toMatch(/red/);
    expect(alertLevelToClass('MEDIUM')).toMatch(/orange/);
    expect(alertLevelToClass('HIGH')).toMatch(/red/);
    expect(alertLevelToClass('CRITICAL')).toMatch(/red/);
  });

  it('falls back to a default class for an unknown level (defensive)', () => {
    expect(alertLevelToClass('UNKNOWN' as AlertLevel)).toBe('border-transparent bg-muted text-muted-foreground');
  });

  it('is exhaustive over ALERT_LEVEL_CLASSES keys', () => {
    expect(Object.keys(ALERT_LEVEL_CLASSES).sort()).toEqual([...ALL_LEVELS].sort());
  });
});

describe('alertLevelToLabel', () => {
  it('returns a French label for every known level', () => {
    for (const level of ALL_LEVELS) {
      expect(alertLevelToLabel(level)).toBeTruthy();
    }
  });

  it('falls back for an unknown level', () => {
    expect(alertLevelToLabel('UNKNOWN' as AlertLevel)).toBe('Inconnu');
  });
});
