import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const fetchFuelRecordsMock = vi.fn();

vi.mock('@/features/fuel/api', () => ({
  fetchFuelRecords: (...args: unknown[]) => fetchFuelRecordsMock(...args),
  fetchVehicleFuelSummary: vi.fn(),
  fetchVehicleFuelAnomalies: vi.fn(),
}));

import { FuelPageClient } from '@/features/fuel/fuel-page-client';
import type { FuelRecordDto } from '@/features/fuel/types';

function makeRecord(overrides: Partial<FuelRecordDto> = {}): FuelRecordDto {
  return {
    id: 'f1',
    vehicleId: 'v1',
    driverId: 'd1',
    liters: 40.5,
    totalCost: 62.3,
    odometer: 12000,
    fuelType: 'DIESEL',
    stationName: 'Station Total',
    latitude: null,
    longitude: null,
    receiptFileId: null,
    createdAt: '2026-09-08T10:00:00.000Z',
    vehicle: { id: 'v1', plateNumber: 'AB-123-CD' },
    driver: { id: 'd1', firstName: 'Jean', lastName: 'Dupont' },
    consumptionL100km: 8.2,
    hasAnomaly: false,
    ...overrides,
  };
}

function renderWithClient(children: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>);
}

describe('FuelPageClient', () => {
  beforeEach(() => {
    fetchFuelRecordsMock.mockReset();
  });

  it('renders fuel record rows from the mocked API response', async () => {
    fetchFuelRecordsMock.mockResolvedValue([makeRecord()]);

    renderWithClient(<FuelPageClient />);

    expect(await screen.findByText('AB-123-CD')).toBeInTheDocument();
    expect(screen.getByText('Jean Dupont')).toBeInTheDocument();
    expect(screen.getByText('40.5 L')).toBeInTheDocument();
    expect(screen.getByText('8.2 L/100km')).toBeInTheDocument();
    expect(fetchFuelRecordsMock).toHaveBeenCalledWith({});
  });

  it('calls the API with the correct params when a filter is set', async () => {
    fetchFuelRecordsMock.mockResolvedValue([makeRecord()]);
    const user = userEvent.setup();

    renderWithClient(<FuelPageClient />);

    await screen.findByText('AB-123-CD');

    const vehicleInput = screen.getByLabelText(/véhicule \(id\)/i);
    await user.type(vehicleInput, 'v-42');

    await waitFor(() =>
      expect(fetchFuelRecordsMock).toHaveBeenLastCalledWith(expect.objectContaining({ vehicleId: 'v-42' })),
    );
  });

  it('shows the anomaly badge on a record flagged with hasAnomaly', async () => {
    fetchFuelRecordsMock.mockResolvedValue([makeRecord({ hasAnomaly: true })]);

    renderWithClient(<FuelPageClient />);

    // 'Anomalie' apparaît aussi comme en-tête de colonne (<th>) — on cible spécifiquement le badge
    // (<div>) pour ne pas matcher les deux occurrences.
    expect(await screen.findByText('Anomalie', { selector: 'div' })).toBeInTheDocument();
  });
});
