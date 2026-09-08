import { describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import { requestWithAuth } from '@/lib/api-client';

function makeAxiosLikeError(status: number) {
  const error: any = new Error('Request failed');
  error.isAxiosError = true;
  error.response = { status };
  return error;
}

describe('requestWithAuth', () => {
  it('attaches the bearer token and returns the response on success', async () => {
    const instance = { request: vi.fn().mockResolvedValue({ data: { ok: true } }) };
    const tokenFetcher = vi.fn().mockResolvedValue('access-token');
    const onAuthFailure = vi.fn();

    const res = await requestWithAuth(instance as any, { url: '/foo', method: 'GET' }, tokenFetcher, onAuthFailure);

    expect(res.data).toEqual({ ok: true });
    expect(tokenFetcher).toHaveBeenCalledWith(false);
    expect(instance.request).toHaveBeenCalledTimes(1);
    expect(instance.request.mock.calls[0][0].headers.Authorization).toBe('Bearer access-token');
    expect(onAuthFailure).not.toHaveBeenCalled();
  });

  it('refreshes the token once and retries after a 401', async () => {
    const instance = {
      request: vi
        .fn()
        .mockRejectedValueOnce(makeAxiosLikeError(401))
        .mockResolvedValueOnce({ data: { ok: true } }),
    };
    const tokenFetcher = vi.fn().mockResolvedValueOnce('expired-token').mockResolvedValueOnce('fresh-token');
    const onAuthFailure = vi.fn();

    const res = await requestWithAuth(instance as any, { url: '/foo', method: 'GET' }, tokenFetcher, onAuthFailure);

    expect(res.data).toEqual({ ok: true });
    expect(tokenFetcher).toHaveBeenNthCalledWith(1, false);
    expect(tokenFetcher).toHaveBeenNthCalledWith(2, true);
    expect(instance.request).toHaveBeenCalledTimes(2);
    expect(instance.request.mock.calls[1][0].headers.Authorization).toBe('Bearer fresh-token');
    expect(onAuthFailure).not.toHaveBeenCalled();
  });

  it('forces logout and rethrows when the refresh also fails', async () => {
    const instance = { request: vi.fn().mockRejectedValue(makeAxiosLikeError(401)) };
    const tokenFetcher = vi.fn().mockResolvedValueOnce('expired-token').mockResolvedValueOnce(null);
    const onAuthFailure = vi.fn();

    await expect(
      requestWithAuth(instance as any, { url: '/foo', method: 'GET' }, tokenFetcher, onAuthFailure),
    ).rejects.toThrow();

    expect(instance.request).toHaveBeenCalledTimes(1);
    expect(onAuthFailure).toHaveBeenCalledTimes(1);
  });

  it('does not attempt a refresh for non-401 errors', async () => {
    const instance = { request: vi.fn().mockRejectedValue(makeAxiosLikeError(500)) };
    const tokenFetcher = vi.fn().mockResolvedValue('access-token');
    const onAuthFailure = vi.fn();

    await expect(
      requestWithAuth(instance as any, { url: '/foo', method: 'GET' }, tokenFetcher, onAuthFailure),
    ).rejects.toThrow();

    expect(tokenFetcher).toHaveBeenCalledTimes(1);
    expect(onAuthFailure).not.toHaveBeenCalled();
  });
});

// Vérifie que axios.isAxiosError est bien ce que le module utilise (pas une réimplémentation).
describe('axios.isAxiosError sanity check', () => {
  it('recognizes our fake axios error shape', () => {
    expect(axios.isAxiosError(makeAxiosLikeError(401))).toBe(true);
  });
});
