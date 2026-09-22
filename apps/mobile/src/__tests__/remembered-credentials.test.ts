import { beforeEach, describe, expect, it, vi } from 'vitest';

const secureItems = new Map<string, string>();

vi.mock('react-native', () => ({ Platform: { OS: 'android' } }));
vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(async (key: string) => secureItems.get(key) ?? null),
  setItemAsync: vi.fn(async (key: string, value: string) => { secureItems.set(key, value); }),
  deleteItemAsync: vi.fn(async (key: string) => { secureItems.delete(key); }),
}));

import { AuthService } from '../services/auth.service';

describe('identifiants chauffeur mémorisés', () => {
  beforeEach(() => secureItems.clear());

  it('restaure uniquement les identifiants explicitement enregistrés', async () => {
    expect(await AuthService.getRememberedCredentials()).toBeNull();
    await AuthService.saveRememberedCredentials({ identifier: 'driver@example.com', password: 'Secret123' });
    expect(await AuthService.getRememberedCredentials()).toEqual({ identifier: 'driver@example.com', password: 'Secret123' });
    await AuthService.clearRememberedCredentials();
    expect(await AuthService.getRememberedCredentials()).toBeNull();
  });

  it('déconnecte la session sans effacer un choix de mémorisation', async () => {
    await AuthService.saveRememberedCredentials({ identifier: '+243989805614', password: 'Secret123' });
    await AuthService.clearTokens();
    expect(await AuthService.getRememberedCredentials()).toEqual({ identifier: '+243989805614', password: 'Secret123' });
  });
});
