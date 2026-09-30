/* eslint-disable import/first -- vi.mock() must textually precede imports (Vitest hoists them) */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('expo-updates', () => ({
  isEnabled: false,
  checkForUpdateAsync: vi.fn(),
  fetchUpdateAsync: vi.fn(),
  reloadAsync: vi.fn(),
}));

import {
  checkAndFetchUpdate,
  resetUpdateCheckState,
  UPDATE_CHECK_MIN_INTERVAL_MS,
  UpdatesApi,
} from '../services/app-update.service';

function fakeApi(overrides: Partial<UpdatesApi> = {}): UpdatesApi {
  return {
    isEnabled: true,
    checkForUpdateAsync: vi.fn(async () => ({ isAvailable: true })),
    fetchUpdateAsync: vi.fn(async () => ({ isNew: true })),
    ...overrides,
  };
}

describe('Mises à jour OTA des téléphones chauffeurs', () => {
  beforeEach(() => resetUpdateCheckState());

  it('télécharge une mise à jour disponible et la signale prête', async () => {
    const api = fakeApi();
    expect(await checkAndFetchUpdate(api, 1_000)).toBe(true);
    expect(api.fetchUpdateAsync).toHaveBeenCalledTimes(1);
  });

  it('ne télécharge rien quand aucune mise à jour n’est publiée pour ce runtime', async () => {
    const api = fakeApi({ checkForUpdateAsync: vi.fn(async () => ({ isAvailable: false })) });
    expect(await checkAndFetchUpdate(api, 1_000)).toBe(false);
    expect(api.fetchUpdateAsync).not.toHaveBeenCalled();
  });

  it('ne fait rien dans un build sans expo-updates (client de développement)', async () => {
    const api = fakeApi({ isEnabled: false });
    expect(await checkAndFetchUpdate(api, 1_000)).toBe(false);
    expect(api.checkForUpdateAsync).not.toHaveBeenCalled();
  });

  it('limite les vérifications à une toutes les 10 min', async () => {
    const api = fakeApi({ checkForUpdateAsync: vi.fn(async () => ({ isAvailable: false })) });
    await checkAndFetchUpdate(api, 1_000);
    await checkAndFetchUpdate(api, 1_000 + 60_000);
    expect(api.checkForUpdateAsync).toHaveBeenCalledTimes(1);
    await checkAndFetchUpdate(api, 1_000 + UPDATE_CHECK_MIN_INTERVAL_MS);
    expect(api.checkForUpdateAsync).toHaveBeenCalledTimes(2);
  });

  it('retente au prochain premier plan après un échec réseau', async () => {
    const api = fakeApi({ checkForUpdateAsync: vi.fn(async () => { throw new Error('offline'); }) });
    expect(await checkAndFetchUpdate(api, 1_000)).toBe(false);
    await checkAndFetchUpdate(api, 2_000);
    expect(api.checkForUpdateAsync).toHaveBeenCalledTimes(2);
  });
});
