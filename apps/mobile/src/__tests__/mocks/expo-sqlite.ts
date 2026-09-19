import { vi } from 'vitest';

export const openDatabaseSync = vi.fn(() => ({
  execSync: vi.fn(),
  runSync: vi.fn(),
  getAllSync: vi.fn(() => []),
  getFirstSync: vi.fn(() => ({ count: 0 })),
  closeSync: vi.fn(),
}));

export default {
  openDatabaseSync,
};
