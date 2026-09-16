import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient, refreshClient, setForceLogoutHandler } from '../api/client';
import { AuthService } from '../services/auth.service';

describe('Auth Refresh Mutex & Concurrency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles multiple simultaneous 401s by making exactly ONE refresh request and retrying all calls', async () => {
    let accessToken = 'initial-token';
    const newAccessToken = 'refreshed-token-xyz';
    const newRefreshToken = 'refreshed-refresh-token-xyz';

    vi.spyOn(AuthService, 'getAccessToken').mockImplementation(async () => accessToken);
    vi.spyOn(AuthService, 'getRefreshToken').mockImplementation(async () => 'valid-refresh-token');
    vi.spyOn(AuthService, 'saveTokens').mockImplementation(async (acc, _ref) => {
      accessToken = acc;
    });

    let refreshCallCount = 0;
    vi.spyOn(refreshClient, 'post').mockImplementation(async (url) => {
      if (url === '/auth/refresh') {
        refreshCallCount++;
        // Simulate slight network latency during refresh
        await new Promise((resolve) => setTimeout(resolve, 30));
        return {
          data: {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
          },
        } as any;
      }
      throw new Error(`Unexpected url: ${url}`);
    });

    const mockAdapter = vi.fn().mockImplementation(async (config) => {
      const authHeader = config.headers?.Authorization || config.headers?.authorization;

      // If called with initial token, return 401
      if (authHeader === 'Bearer initial-token') {
        const error: any = new Error('Request failed with status code 401');
        error.config = config;
        error.response = {
          status: 401,
          data: { message: 'Unauthorized', statusCode: 401 },
          headers: {},
        };
        error.isAxiosError = true;
        throw error;
      }

      // If called with refreshed token, succeed!
      if (authHeader === `Bearer ${newAccessToken}`) {
        return {
          data: { success: true, url: config.url },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        };
      }

      throw new Error(`Unexpected Authorization header: ${authHeader}`);
    });

    apiClient.defaults.adapter = mockAdapter;

    // Launch 4 simultaneous protected API requests
    const p1 = apiClient.get('/mobile/missions/today');
    const p2 = apiClient.get('/mobile/missions/mission-1');
    const p3 = apiClient.get('/auth/profile');
    const p4 = apiClient.get('/mobile/missions/mission-2');

    const results = await Promise.all([p1, p2, p3, p4]);

    // 1. All 4 requests should succeed with refreshed token
    expect(results).toHaveLength(4);
    results.forEach((res) => {
      expect(res.data.success).toBe(true);
      expect(res.status).toBe(200);
    });

    // 2. Exactly ONE refresh request was performed
    expect(refreshCallCount).toBe(1);

    // 3. Tokens were saved
    expect(AuthService.saveTokens).toHaveBeenCalledWith(newAccessToken, newRefreshToken);
  });

  it('rejects all waiting requests and calls forceLogout if refresh token fails', async () => {
    vi.spyOn(AuthService, 'getAccessToken').mockResolvedValue('expired-token');
    vi.spyOn(AuthService, 'getRefreshToken').mockResolvedValue('expired-refresh-token');
    vi.spyOn(AuthService, 'clearTokens').mockResolvedValue();

    const forceLogoutMock = vi.fn().mockResolvedValue(undefined);
    setForceLogoutHandler(forceLogoutMock);

    vi.spyOn(refreshClient, 'post').mockRejectedValue(new Error('Invalid refresh token'));

    const mockAdapter = vi.fn().mockImplementation(async (config) => {
      const error: any = new Error('Unauthorized');
      error.config = config;
      error.response = { status: 401, data: { message: 'Unauthorized' } };
      error.isAxiosError = true;
      throw error;
    });

    apiClient.defaults.adapter = mockAdapter;

    const p1 = apiClient.get('/mobile/missions/today');
    const p2 = apiClient.get('/mobile/missions/today');

    await expect(p1).rejects.toThrow();
    await expect(p2).rejects.toThrow();

    expect(AuthService.clearTokens).toHaveBeenCalled();
    expect(forceLogoutMock).toHaveBeenCalled();
  });
});
