import { describe, expect, it } from 'vitest';
import {
  addStep,
  emptyStep,
  moveStep,
  removeStep,
  toMissionStepInputs,
  updateStep,
  type MissionStepDraft,
} from '@/features/missions/steps-field-array';

function step(overrides: Partial<MissionStepDraft> = {}): MissionStepDraft {
  return { key: overrides.key ?? `k-${Math.random()}`, locationId: 'loc-1', actionType: 'COLLECT', plannedAt: '', toleranceMin: 15, ...overrides };
}

describe('steps-field-array', () => {
  it('emptyStep returns a draft with default action type and tolerance', () => {
    const draft = emptyStep();
    expect(draft.actionType).toBe('COLLECT');
    expect(draft.toleranceMin).toBe(15);
    expect(draft.locationId).toBe('');
  });

  it('addStep appends without mutating the original array', () => {
    const steps = [step({ key: 'a' })];
    const next = addStep(steps, step({ key: 'b' }));

    expect(steps).toHaveLength(1);
    expect(next).toHaveLength(2);
    expect(next[1].key).toBe('b');
  });

  it('removeStep drops the item at the given index', () => {
    const steps = [step({ key: 'a' }), step({ key: 'b' }), step({ key: 'c' })];
    const next = removeStep(steps, 1);

    expect(next.map((s) => s.key)).toEqual(['a', 'c']);
  });

  it('removeStep is a no-op for an out-of-range index', () => {
    const steps = [step({ key: 'a' })];
    expect(removeStep(steps, 5)).toBe(steps);
    expect(removeStep(steps, -1)).toBe(steps);
  });

  it('moveStep swaps a step with its predecessor when moving up', () => {
    const steps = [step({ key: 'a' }), step({ key: 'b' }), step({ key: 'c' })];
    const next = moveStep(steps, 1, 'up');

    expect(next.map((s) => s.key)).toEqual(['b', 'a', 'c']);
  });

  it('moveStep swaps a step with its successor when moving down', () => {
    const steps = [step({ key: 'a' }), step({ key: 'b' }), step({ key: 'c' })];
    const next = moveStep(steps, 1, 'down');

    expect(next.map((s) => s.key)).toEqual(['a', 'c', 'b']);
  });

  it('moveStep is a no-op at the boundaries', () => {
    const steps = [step({ key: 'a' }), step({ key: 'b' })];
    expect(moveStep(steps, 0, 'up')).toBe(steps);
    expect(moveStep(steps, 1, 'down')).toBe(steps);
  });

  it('updateStep patches a single field without touching the others', () => {
    const steps = [step({ key: 'a', locationId: 'loc-1' })];
    const next = updateStep(steps, 0, { locationId: 'loc-2' });

    expect(next[0].locationId).toBe('loc-2');
    expect(next[0].actionType).toBe('COLLECT');
    expect(steps[0].locationId).toBe('loc-1'); // original inchangé
  });

  it('toMissionStepInputs derives a 1-based order from array position and omits empty plannedAt', () => {
    const steps = [
      step({ key: 'a', locationId: 'loc-1', plannedAt: '' }),
      step({ key: 'b', locationId: 'loc-2', plannedAt: '2026-09-10T08:00' }),
    ];

    const inputs = toMissionStepInputs(steps);

    expect(inputs[0]).toEqual({ locationId: 'loc-1', order: 1, actionType: 'COLLECT', toleranceMin: 15 });
    expect(inputs[1].order).toBe(2);
    expect(inputs[1].plannedAt).toBe(new Date('2026-09-10T08:00').toISOString());
  });
});
