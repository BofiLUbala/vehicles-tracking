import { vi } from 'vitest';

export const getItemAsync = vi.fn(async (_key: string): Promise<string | null> => null);
export const setItemAsync = vi.fn(async (_key: string, _value: string): Promise<void> => undefined);
export const deleteItemAsync = vi.fn(async (_key: string): Promise<void> => undefined);

export default {
  getItemAsync,
  setItemAsync,
  deleteItemAsync,
};
