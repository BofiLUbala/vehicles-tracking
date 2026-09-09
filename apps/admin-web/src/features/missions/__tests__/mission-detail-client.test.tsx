import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const fetchMissionMock = vi.fn();
const fetchDriversMock = vi.fn();
const fetchVehiclesMock = vi.fn();
const assignMissionMock = vi.fn();
const cancelMissionMock = vi.fn();

vi.mock('@/features/missions/api', () => ({
  fetchMission: (...args: unknown[]) => fetchMissionMock(...args),
  fetchDrivers: (...args: unknown[]) => fetchDriversMock(...args),
  fetchVehicles: (...args: unknown[]) => fetchVehiclesMock(...args),
  assignMission: (...args: unknown[]) => assignMissionMock(...args),
  cancelMission: (...args: unknown[]) => cancelMissionMock(...args),
}));

vi.mock('@/features/locations/api', () => ({
  fetchLocations: vi.fn().mockResolvedValue([
    { id: 'loc-1', organizationId: 'org-1', name: 'Dépôt Nord', type: 'DROPOFF', address: null, latitude: 48.8, longitude: 2.3, allowedRadius: 50, status: 'ACTIVE', createdAt: '', updatedAt: '', deletedAt: null },
  ]),
}));

// La carte (MapLibre) n'est affichée que sur clic explicite dans ce composant et n'est de toute
// façon pas testable sous jsdom (pas de WebGL) — mockée comme les autres cartes du projet.
vi.mock('@/features/missions/mission-trace-map-client', () => ({
  MissionTraceMapClient: () => null,
}));

import { MissionDetailClient } from '@/features/missions/mission-detail-client';
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

describe('MissionDetailClient', () => {
  beforeEach(() => {
    fetchMissionMock.mockReset();
    fetchDriversMock.mockReset().mockResolvedValue([{ id: 'd1', firstName: 'Jean', lastName: 'Dupont', status: 'ACTIVE' }]);
    fetchVehiclesMock.mockReset().mockResolvedValue([{ id: 'v1', plateNumber: 'AB-123-CD', brand: null, model: null, status: 'AVAILABLE' }]);
    assignMissionMock.mockReset();
    cancelMissionMock.mockReset();
  });

  it('renders mission info and its ordered steps', async () => {
    fetchMissionMock.mockResolvedValue(makeMission());

    renderWithClient(<MissionDetailClient missionId="m1" />);

    expect(await screen.findByText('Jean Dupont')).toBeInTheDocument();
    expect(screen.getByText('AB-123-CD')).toBeInTheDocument();
    expect(screen.getByText('Dépôt Nord')).toBeInTheDocument();
    expect(screen.getByText('En attente')).toBeInTheDocument();
  });

  it('calls assignMission with the selected driver and vehicle', async () => {
    fetchMissionMock.mockResolvedValue(makeMission());
    assignMissionMock.mockResolvedValue(makeMission({ status: 'ASSIGNED' }));
    const user = userEvent.setup();

    renderWithClient(<MissionDetailClient missionId="m1" />);

    await screen.findByText('Jean Dupont');
    await user.click(screen.getByRole('button', { name: 'Affecter' }));

    await user.selectOptions(screen.getByLabelText('Chauffeur'), 'd1');
    await user.selectOptions(screen.getByLabelText('Véhicule'), 'v1');
    await user.click(screen.getByRole('button', { name: "Confirmer l'affectation" }));

    await waitFor(() => expect(assignMissionMock).toHaveBeenCalledWith('m1', { driverId: 'd1', vehicleId: 'v1' }));
  });

  it('requires a reason and calls cancelMission with it', async () => {
    fetchMissionMock.mockResolvedValue(makeMission());
    cancelMissionMock.mockResolvedValue(makeMission({ status: 'CANCELLED' }));
    const user = userEvent.setup();

    renderWithClient(<MissionDetailClient missionId="m1" />);

    await screen.findByText('Jean Dupont');
    await user.click(screen.getByRole('button', { name: 'Annuler la mission' }));

    const confirmButton = screen.getByRole('button', { name: "Confirmer l'annulation" });
    expect(confirmButton).toBeDisabled();

    await user.type(screen.getByLabelText("Raison de l'annulation"), 'Véhicule en panne');
    expect(confirmButton).toBeEnabled();

    await user.click(confirmButton);

    await waitFor(() => expect(cancelMissionMock).toHaveBeenCalledWith('m1', { reason: 'Véhicule en panne' }));
  });
});
