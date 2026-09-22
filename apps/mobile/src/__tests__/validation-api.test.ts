import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ValidationApi } from '../api/validation.api';
import { apiClient } from '../api/client';

vi.mock('../api/client', () => ({ apiClient: { post: vi.fn() } }));

describe('ValidationApi multipart contract', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses the backend metadata field and sends the proof photo', async () => {
    (apiClient.post as any).mockResolvedValueOnce({ data: {} });
    const payload = {
      clientEventId: '1df03a82-105d-4d4a-aed8-23823831151c', qrToken: 'signed-token',
      latitude: -4.32, longitude: 15.31, accuracy: 8, isMocked: false,
      recordedAt: '2026-09-20T12:00:00.000Z',
    };
    await ValidationApi.validateStep({ stepId: 'step-1', payload, photoUri: 'file:///proof.jpg' });

    const [, formData] = (apiClient.post as any).mock.calls[0];
    expect((formData as FormData).get('metadata')).toBe(JSON.stringify(payload));
    expect((formData as FormData).has('photo')).toBe(true);
  });
});
