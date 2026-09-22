import { describe, expect, it, vi } from 'vitest';
import { refreshAdminSession } from '@/lib/refresh-session';

describe('refreshAdminSession', () => {
  it('regroupe les demandes simultanées portant le même cookie', async () => {
    const originalFetch = globalThis.fetch;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ accessToken: 'access-new', refreshToken: 'refresh-new' }),
    });
    globalThis.fetch = fetchMock as typeof fetch;
    try {
      const [first, second] = await Promise.all([
        refreshAdminSession('refresh-old'),
        refreshAdminSession('refresh-old'),
      ]);
      expect(first).toEqual({ accessToken: 'access-new', refreshToken: 'refresh-new' });
      expect(second).toEqual(first);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
