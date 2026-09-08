import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const fetchAlertsMock = vi.fn();
const updateAlertStatusMock = vi.fn();

vi.mock('@/features/alerts/api', () => ({
  fetchAlerts: (...args: unknown[]) => fetchAlertsMock(...args),
  updateAlertStatus: (...args: unknown[]) => updateAlertStatusMock(...args),
}));

vi.mock('@/lib/api-client', () => ({
  fetchAccessToken: vi.fn().mockResolvedValue(null), // pas de token -> pas de socket ouvert dans ce test
}));

const fakeSocket = {
  on: vi.fn(),
  off: vi.fn(),
  disconnect: vi.fn(),
  emit: vi.fn(),
};

vi.mock('@/features/tracking/socket', () => ({
  connectTrackingSocket: vi.fn(() => fakeSocket),
}));

import { useAlerts } from '@/features/alerts/use-alerts';
import type { AlertDto } from '@/features/alerts/types';

function makeAlert(overrides: Partial<AlertDto> = {}): AlertDto {
  return {
    id: 'a1',
    type: 'SPEEDING',
    level: 'MEDIUM',
    status: 'NEW',
    score: 10,
    message: null,
    vehicleId: 'v1',
    driverId: 'd1',
    missionId: null,
    createdAt: '2026-09-08T10:00:00.000Z',
    updatedAt: '2026-09-08T10:00:00.000Z',
    ...overrides,
  };
}

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useAlerts', () => {
  beforeEach(() => {
    fetchAlertsMock.mockReset();
    updateAlertStatusMock.mockReset();
  });

  it('loads the initial alert list from GET /alerts', async () => {
    fetchAlertsMock.mockResolvedValue([makeAlert()]);

    const { result } = renderHook(() => useAlerts({}), { wrapper });

    await waitFor(() => expect(result.current.alerts).toHaveLength(1));
    expect(result.current.alerts[0].id).toBe('a1');
  });

  it('transition() calls PATCH with the correct new status and updates the UI optimistically', async () => {
    fetchAlertsMock.mockResolvedValue([makeAlert({ status: 'NEW' })]);
    updateAlertStatusMock.mockResolvedValue(makeAlert({ status: 'ACKNOWLEDGED' }));

    const { result } = renderHook(() => useAlerts({}), { wrapper });

    await waitFor(() => expect(result.current.alerts).toHaveLength(1));

    act(() => {
      result.current.transition('a1', 'ACKNOWLEDGED');
    });

    // Mise à jour optimiste immédiate (avant même la résolution de la promesse PATCH).
    expect(result.current.alerts[0].status).toBe('ACKNOWLEDGED');

    await waitFor(() => expect(updateAlertStatusMock).toHaveBeenCalledWith('a1', 'ACKNOWLEDGED'));
  });
});
