import { describe, expect, it } from 'vitest';
import { allowedNextStatuses, isTerminalStatus } from '@/features/alerts/alert-status';
import type { AlertStatus } from '@/features/alerts/types';

describe('allowedNextStatuses', () => {
  it('allows NEW -> ACKNOWLEDGED or DISMISSED', () => {
    expect(allowedNextStatuses('NEW')).toEqual(['ACKNOWLEDGED', 'DISMISSED']);
  });

  it('allows ACKNOWLEDGED -> RESOLVED or DISMISSED', () => {
    expect(allowedNextStatuses('ACKNOWLEDGED')).toEqual(['RESOLVED', 'DISMISSED']);
  });

  it('has no transitions from terminal statuses', () => {
    expect(allowedNextStatuses('RESOLVED')).toEqual([]);
    expect(allowedNextStatuses('DISMISSED')).toEqual([]);
  });

  it('is exhaustive over all AlertStatus values', () => {
    const all: AlertStatus[] = ['NEW', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED'];
    for (const status of all) {
      expect(Array.isArray(allowedNextStatuses(status))).toBe(true);
    }
  });
});

describe('isTerminalStatus', () => {
  it('flags RESOLVED and DISMISSED as terminal', () => {
    expect(isTerminalStatus('RESOLVED')).toBe(true);
    expect(isTerminalStatus('DISMISSED')).toBe(true);
  });

  it('flags NEW and ACKNOWLEDGED as non-terminal', () => {
    expect(isTerminalStatus('NEW')).toBe(false);
    expect(isTerminalStatus('ACKNOWLEDGED')).toBe(false);
  });
});
