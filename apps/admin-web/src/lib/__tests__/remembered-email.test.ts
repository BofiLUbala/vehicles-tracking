import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearRememberedEmail, loadRememberedEmail, saveRememberedEmail } from '@/lib/remembered-email';

describe('remembered email', () => {
  beforeEach(() => window.localStorage.clear());

  it('round-trips the email and clears it', () => {
    expect(loadRememberedEmail()).toBe('');
    saveRememberedEmail('  admin@example.com  ');
    expect(loadRememberedEmail()).toBe('admin@example.com');
    clearRememberedEmail();
    expect(loadRememberedEmail()).toBe('');
  });

  it('ignores an empty email', () => {
    saveRememberedEmail('   ');
    expect(loadRememberedEmail()).toBe('');
  });

  // Invariant de sécurité : seule l'adresse est stockée, jamais le mot de passe.
  it('stores only the email key and never a password value', () => {
    saveRememberedEmail('admin@example.com');
    const dump = Object.keys(window.localStorage).map((k) => `${k}=${window.localStorage.getItem(k)}`).join('|');
    expect(Object.keys(window.localStorage)).toEqual(['tv_remembered_email']);
    expect(dump.toLowerCase()).not.toContain('password');
  });

  it('stays usable when storage throws (private browsing / blocked site data)', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(loadRememberedEmail()).toBe('');
    spy.mockRestore();
    const setSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => saveRememberedEmail('a@b.c')).not.toThrow();
    setSpy.mockRestore();
  });
});
