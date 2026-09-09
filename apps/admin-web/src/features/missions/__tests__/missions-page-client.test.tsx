import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const fetchMissionsMock = vi.fn();
const fetchDriversMock = vi.fn();
const fetchVehiclesMock = vi.fn();
const createMissionMock = vi.fn();

vi.mock('@/features/missions/api', () => ({
  fetchMissions: (...args: unknown[]) => fetchMissionsMock(...args),
  fetchDrivers: (...args: unknown[]) => fetchDriversMock(...args),
  fetchVehicles: (...args: unknown[]) => fetchVehiclesMock(...args),
  createMission: (...args: unknown[]) => createMissionMock(...args),
}));

vi.mock('@/features/locations/api', () => ({
  fetchLocations: vi.fn().mockResolvedValue([]),
}));

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

import { MissionsPageClient } from '@/features/missions/missions-page-client';
import type { MissionDto } from '@/features/missions/types';

function makeMission(overrides: Partial<MissionDto> = {}): MissionDto {
  return {
    id: 'm1',
    organizationId: 'org-1',
    driverId: 'd1',
    vehicleId: 'v1',
    status: 'PLANNED',
    plannedStart: '2026-09-10T08:00:00.000Z',
    plannedEnd: '2026-09-10T12:00:00.000Z',
    actualStart: null,
    actualEnd: null,
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-01T10:00:00.000Z',
    steps: [
      { id: 's1', missionId: 'm1', locationId: 'loc-1', order: 1, actionType: 'COLLECT', status: 'PENDING', plannedAt: null, toleranceMin: 15, createdAt: '', updatedAt: '' },
    ],
    events: [],
    ...overrides,
  };
}

function renderWithClient(children: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>);
}

describe('MissionsPageClient', () => {
  beforeEach(() => {
    fetchMissionsMock.mockReset();
    fetchDriversMock.mockReset().mockResolvedValue([{ id: 'd1', firstName: 'Jean', lastName: 'Dupont', status: 'ACTIVE' }]);
    fetchVehiclesMock.mockReset().mockResolvedValue([{ id: 'v1', plateNumber: 'AB-123-CD', brand: null, model: null, status: 'AVAILABLE' }]);
    createMissionMock.mockReset();
  });

  it('renders mission rows from the mocked API, resolving driver/vehicle labels', async () => {
    fetchMissionsMock.mockResolvedValue([makeMission()]);

    renderWithClient(<MissionsPageClient />);

    expect(await screen.findByText('Jean Dupont')).toBeInTheDocument();
    expect(screen.getByText('AB-123-CD')).toBeInTheDocument();
    expect(screen.getByText('Planifiée', { selector: 'div' })).toBeInTheDocument();
    expect(fetchMissionsMock).toHaveBeenCalledWith({});
  });

  it('shows the empty state when there are no missions for the filters', async () => {
    fetchMissionsMock.mockResolvedValue([]);

    renderWithClient(<MissionsPageClient />);

    expect(await screen.findByText('Aucune mission pour ces filtres.')).toBeInTheDocument();
  });

  it('re-queries missions with the selected status filter', async () => {
    fetchMissionsMock.mockResolvedValue([makeMission()]);
    const user = userEvent.setup();

    renderWithClient(<MissionsPageClient />);

    await screen.findByText('Jean Dupont');

    const statusSelect = screen.getByLabelText('Statut');
    await user.selectOptions(statusSelect, 'ASSIGNED');

    await waitFor(() => expect(fetchMissionsMock).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'ASSIGNED' })));
  });

  it('filters by driver id text input', async () => {
    fetchMissionsMock.mockResolvedValue([makeMission()]);
    const user = userEvent.setup();

    renderWithClient(<MissionsPageClient />);

    await screen.findByText('Jean Dupont');
    await user.type(screen.getByLabelText(/chauffeur \(id\)/i), 'd-42');

    await waitFor(() => expect(fetchMissionsMock).toHaveBeenLastCalledWith(expect.objectContaining({ driverId: 'd-42' })));
  });
});
