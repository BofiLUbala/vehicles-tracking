import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const fetchLocationsMock = vi.fn();
const deleteLocationMock = vi.fn();
const createLocationMock = vi.fn();
const updateLocationMock = vi.fn();
const generateLocationQrMock = vi.fn();

vi.mock('@/features/locations/api', () => ({
  fetchLocations: (...args: unknown[]) => fetchLocationsMock(...args),
  deleteLocation: (...args: unknown[]) => deleteLocationMock(...args),
  createLocation: (...args: unknown[]) => createLocationMock(...args),
  updateLocation: (...args: unknown[]) => updateLocationMock(...args),
  generateLocationQr: (...args: unknown[]) => generateLocationQrMock(...args),
}));

// La carte MapLibre n'a pas de sens dans jsdom (pas de WebGL) — même approche que
// features/tracking (aucun test ne monte tracking-map.tsx directement).
vi.mock('@/features/locations/location-map-picker-client', () => ({
  LocationMapPickerClient: () => null,
}));

import { LocationsPageClient } from '@/features/locations/locations-page-client';
import type { LocationDto } from '@/features/locations/types';

function makeLocation(overrides: Partial<LocationDto> = {}): LocationDto {
  return {
    id: 'loc-1',
    organizationId: 'org-1',
    name: 'Dépôt Nord',
    type: 'DROPOFF',
    address: '12 rue des Lilas',
    latitude: 48.85,
    longitude: 2.35,
    allowedRadius: 75,
    status: 'ACTIVE',
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-01T10:00:00.000Z',
    deletedAt: null,
    ...overrides,
  };
}

function renderWithClient(children: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>);
}

describe('LocationsPageClient', () => {
  beforeEach(() => {
    fetchLocationsMock.mockReset();
    deleteLocationMock.mockReset();
    createLocationMock.mockReset();
    updateLocationMock.mockReset();
    generateLocationQrMock.mockReset();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('renders location rows from the mocked API response', async () => {
    fetchLocationsMock.mockResolvedValue([makeLocation()]);

    renderWithClient(<LocationsPageClient />);

    expect(await screen.findByText('Dépôt Nord')).toBeInTheDocument();
    expect(screen.getByText('12 rue des Lilas')).toBeInTheDocument();
    expect(screen.getByText('75 m')).toBeInTheDocument();
    expect(fetchLocationsMock).toHaveBeenCalledTimes(1);
  });

  it('shows an empty-state message when there are no locations', async () => {
    fetchLocationsMock.mockResolvedValue([]);

    renderWithClient(<LocationsPageClient />);

    expect(await screen.findByText('Aucun point géographique enregistré.')).toBeInTheDocument();
  });

  it('asks for confirmation and calls deleteLocation when disabling a location', async () => {
    fetchLocationsMock.mockResolvedValue([makeLocation()]);
    deleteLocationMock.mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderWithClient(<LocationsPageClient />);

    await screen.findByText('Dépôt Nord');
    await user.click(screen.getByRole('button', { name: 'Désactiver' }));

    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => expect(deleteLocationMock).toHaveBeenCalledWith('loc-1'));
  });

  it('generates a QR code when clicking "Générer QR"', async () => {
    fetchLocationsMock.mockResolvedValue([makeLocation()]);
    generateLocationQrMock.mockResolvedValue({
      id: 'qr-1',
      locationId: 'loc-1',
      token: 'signed-token-abc',
      revokedAt: null,
      createdAt: '2026-09-01T10:00:00.000Z',
    });
    const user = userEvent.setup();

    renderWithClient(<LocationsPageClient />);

    await screen.findByText('Dépôt Nord');
    await user.click(screen.getByRole('button', { name: 'Générer QR' }));

    await waitFor(() => expect(generateLocationQrMock).toHaveBeenCalledWith('loc-1'));
    expect(await screen.findByRole('dialog', { name: 'QR code pour Dépôt Nord' })).toBeInTheDocument();
  });
});
