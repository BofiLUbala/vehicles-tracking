import { describe, it, expect, beforeEach } from 'vitest';
import { PositionGate } from '../services/position-gate';

const at = (ms: number) => new Date(Date.parse('2026-09-29T14:39:22.000Z') + ms).toISOString();

describe('PositionGate : une seule position retenue quand plusieurs sources GPS se chevauchent', () => {
  beforeEach(() => PositionGate.reset());

  it('écarte une position en double (même horodatage, autre source)', () => {
    expect(PositionGate.accept(at(0))).toBe(true);
    expect(PositionGate.accept(at(0))).toBe(false);
  });

  it('écarte une position quasi simultanée (0,35 s) venant d’une autre source', () => {
    expect(PositionGate.accept(at(0))).toBe(true);
    expect(PositionGate.accept(at(350))).toBe(false);
  });

  it('écarte une position plus ancienne que la dernière retenue', () => {
    expect(PositionGate.accept(at(10_000))).toBe(true);
    expect(PositionGate.accept(at(5_000))).toBe(false);
  });

  it('accepte les positions espacées normalement (≥ 2 s)', () => {
    expect(PositionGate.accept(at(0))).toBe(true);
    expect(PositionGate.accept(at(2_000))).toBe(true);
    expect(PositionGate.accept(at(12_000))).toBe(true);
  });

  it('repart de zéro au démarrage d’un nouveau suivi', () => {
    expect(PositionGate.accept(at(10_000))).toBe(true);
    PositionGate.reset();
    expect(PositionGate.accept(at(0))).toBe(true);
  });
});
