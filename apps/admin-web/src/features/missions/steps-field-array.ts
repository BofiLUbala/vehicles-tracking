import type { MissionStepActionType } from '@/features/missions/status-labels';

/** Étape en cours d'édition dans le formulaire de création de mission (avant envoi à l'API — pas
 * encore de `order` figé, il est dérivé de la position dans le tableau au moment de la
 * soumission). Logique pure, testable sans monter de composant React ni `useFieldArray`. */
export interface MissionStepDraft {
  key: string;
  locationId: string;
  actionType: MissionStepActionType;
  plannedAt: string;
  toleranceMin: number;
}

let counter = 0;
export function makeStepKey(): string {
  counter += 1;
  return `step-${Date.now()}-${counter}`;
}

export function emptyStep(): MissionStepDraft {
  return {
    key: makeStepKey(),
    locationId: '',
    actionType: 'COLLECT',
    plannedAt: '',
    toleranceMin: 15,
  };
}

export function addStep(steps: MissionStepDraft[], step: MissionStepDraft = emptyStep()): MissionStepDraft[] {
  return [...steps, step];
}

export function removeStep(steps: MissionStepDraft[], index: number): MissionStepDraft[] {
  if (index < 0 || index >= steps.length) return steps;
  return steps.filter((_, i) => i !== index);
}

export function moveStep(steps: MissionStepDraft[], index: number, direction: 'up' | 'down'): MissionStepDraft[] {
  const target = direction === 'up' ? index - 1 : index + 1;
  if (index < 0 || index >= steps.length || target < 0 || target >= steps.length) return steps;
  const next = [...steps];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function updateStep(
  steps: MissionStepDraft[],
  index: number,
  patch: Partial<Omit<MissionStepDraft, 'key'>>,
): MissionStepDraft[] {
  if (index < 0 || index >= steps.length) return steps;
  return steps.map((step, i) => (i === index ? { ...step, ...patch } : step));
}

/** Convertit les brouillons en `MissionStepInputDto[]` avec `order` 1-based dérivé de la position. */
export function toMissionStepInputs(steps: MissionStepDraft[]) {
  return steps.map((step, index) => ({
    locationId: step.locationId,
    order: index + 1,
    actionType: step.actionType,
    ...(step.plannedAt ? { plannedAt: new Date(step.plannedAt).toISOString() } : {}),
    toleranceMin: step.toleranceMin,
  }));
}
