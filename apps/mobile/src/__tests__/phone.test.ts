import { describe, it, expect } from 'vitest';
import {
  normalizePhoneNumber,
  isValidPhoneNumber,
  isValidEmail,
  maskPhoneNumber,
  maskEmail,
} from '../utils/phone';

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
    expect(isValidPhoneNumber('')).toBe(false);
  });
});

describe('Email Validation & Masking', () => {
  it('validates correct email formats', () => {
    expect(isValidEmail('driver@company.cd')).toBe(true);
    expect(isValidEmail('test.user+tag@domain.co.uk')).toBe(true);
    expect(isValidEmail('driver@domain')).toBe(false);
    expect(isValidEmail('invalid-email')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });

  it('masks email addresses accurately', () => {
    expect(maskEmail('driver@example.com')).toBe('d***@example.com');
    expect(maskEmail('ab@test.cd')).toBe('a***@test.cd');
    expect(maskEmail('gaston.mukendi@company.org')).toBe('g***@company.org');
    expect(maskEmail('')).toBe('');
  });

  it('masks phone numbers accurately', () => {
    expect(maskPhoneNumber('+243989805614')).toBe('+243•••••5614');
    expect(maskPhoneNumber('+243812345678')).toBe('+243•••••5678');
    expect(maskPhoneNumber('0812345678')).toBe('+243•••••5678');
    expect(maskPhoneNumber('')).toBe('');
  });
});

