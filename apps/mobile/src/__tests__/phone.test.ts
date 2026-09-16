import { describe, it, expect } from 'vitest';
import { normalizePhoneNumber, isValidPhoneNumber } from '../utils/phone';

describe('Phone Number Normalization & Validation', () => {
  it('normalizes local 0-prefixed number to +243', () => {
    expect(normalizePhoneNumber('0812345678')).toBe('+243812345678');
  });

  it('preserves existing +243 number', () => {
    expect(normalizePhoneNumber('+243812345678')).toBe('+243812345678');
  });

  it('normalizes 00-prefixed international number', () => {
    expect(normalizePhoneNumber('00243812345678')).toBe('+243812345678');
  });

  it('strips spaces, dashes, dots and parentheses', () => {
    expect(normalizePhoneNumber('081-234.56 78')).toBe('+243812345678');
    expect(normalizePhoneNumber('+243 (81) 234-5678')).toBe('+243812345678');
  });

  it('validates E.164 phone numbers', () => {
    expect(isValidPhoneNumber('0812345678')).toBe(true);
    expect(isValidPhoneNumber('+243812345678')).toBe(true);
    expect(isValidPhoneNumber('123')).toBe(false);
  });
});
