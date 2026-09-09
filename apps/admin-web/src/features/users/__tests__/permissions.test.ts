import { describe, expect, it } from 'vitest';
import { canManageUsers } from '@/features/users/permissions';

describe('canManageUsers', () => {
  it('returns true for SUPER_ADMIN', () => {
    expect(canManageUsers('SUPER_ADMIN')).toBe(true);
  });

  it('returns false for ADMIN', () => {
    expect(canManageUsers('ADMIN')).toBe(false);
  });

  it('returns false for DRIVER', () => {
    expect(canManageUsers('DRIVER')).toBe(false);
  });

  it('returns false when the role is unknown (not yet loaded)', () => {
    expect(canManageUsers(null)).toBe(false);
    expect(canManageUsers(undefined)).toBe(false);
  });
});
