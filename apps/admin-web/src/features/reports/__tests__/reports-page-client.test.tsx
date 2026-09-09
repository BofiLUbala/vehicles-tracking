import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const fetchMissionsReportMock = vi.fn();
const fetchFuelReportMock = vi.fn();

vi.mock('@/features/reports/api', async () => {
  const actual = await vi.importActual<typeof import('@/features/reports/api')>('@/features/reports/api');
  return {
    ...actual,
    fetchMissionsReport: (...args: unknown[]) => fetchMissionsReportMock(...args),
    fetchFuelReport: (...args: unknown[]) => fetchFuelReportMock(...args),
  };
});

import { ReportsPageClient } from '@/features/reports/reports-page-client';
import type { FuelReportRow, MissionReportRow } from '@/features/reports/types';

function makeMissionRow(overrides: Partial<MissionReportRow> = {}): MissionReportRow {
  return {
    id: 'm1',
    status: 'COMPLETED',
    vehicleId: 'v1',
    vehiclePlate: 'AB-123-CD',
    driverId: 'd1',
    driverName: 'Jean Dupont',
    locations: 'Dépôt Nord',
    plannedStart: '2026-09-01T08:00:00.000Z',
    plannedEnd: '2026-09-01T09:00:00.000Z',
    actualStart: '2026-09-01T08:05:00.000Z',
    actualEnd: '2026-09-01T10:00:00.000Z',
    stepCount: 2,
    createdAt: '2026-09-01T07:00:00.000Z',
    ...overrides,
  };
}

function makeFuelRow(overrides: Partial<FuelReportRow> = {}): FuelReportRow {
  return {
    id: 'f1',
    vehicleId: 'v1',
    vehiclePlate: 'AB-123-CD',
    driverId: 'd1',
    driverName: 'Jean Dupont',
    liters: 40.5,
    totalCost: 62.3,
    odometer: 12000,
    fuelType: 'DIESEL',
    stationName: 'Station Total',
    createdAt: '2026-09-08T10:00:00.000Z',
    ...overrides,
  };
}

function renderWithClient(children: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>);
}

describe('ReportsPageClient', () => {
  beforeEach(() => {
    fetchMissionsReportMock.mockReset();
    fetchFuelReportMock.mockReset();
  });

  it('renders mission report rows from the mocked API response by default', async () => {
    fetchMissionsReportMock.mockResolvedValue([makeMissionRow()]);

    renderWithClient(<ReportsPageClient />);

    expect(await screen.findByText('Terminée')).toBeInTheDocument();
    expect(screen.getByText('AB-123-CD')).toBeInTheDocument();
    expect(screen.getByText('Jean Dupont')).toBeInTheDocument();
    expect(fetchMissionsReportMock).toHaveBeenCalledWith({});
  });

  it('calls the missions API with the correct params when a filter is set', async () => {
    fetchMissionsReportMock.mockResolvedValue([makeMissionRow()]);
    const user = userEvent.setup();

    renderWithClient(<ReportsPageClient />);

    await screen.findByText('Terminée');

    const vehicleInput = screen.getByLabelText(/véhicule \(id\)/i);
    await user.type(vehicleInput, 'v-42');

    await waitFor(() =>
      expect(fetchMissionsReportMock).toHaveBeenLastCalledWith(expect.objectContaining({ vehicleId: 'v-42' })),
    );
  });

  it('switches to the fuel report tab and loads fuel rows', async () => {
    fetchMissionsReportMock.mockResolvedValue([makeMissionRow()]);
    fetchFuelReportMock.mockResolvedValue([makeFuelRow()]);
    const user = userEvent.setup();

    renderWithClient(<ReportsPageClient />);

    await screen.findByText('Terminée');

    await user.click(screen.getByRole('tab', { name: 'Carburant' }));

    expect(await screen.findByText('40.5 L')).toBeInTheDocument();
    expect(fetchFuelReportMock).toHaveBeenCalledWith({});
  });

  it('renders export buttons pointing at the report download proxy with active filters', async () => {
    fetchMissionsReportMock.mockResolvedValue([makeMissionRow()]);
    const user = userEvent.setup();

    renderWithClient(<ReportsPageClient />);

    await screen.findByText('Terminée');

    const vehicleInput = screen.getByLabelText(/véhicule \(id\)/i);
    await user.type(vehicleInput, 'v-42');

    await waitFor(() =>
      expect(fetchMissionsReportMock).toHaveBeenLastCalledWith(expect.objectContaining({ vehicleId: 'v-42' })),
    );

    const csvLink = screen.getByRole('link', { name: 'Exporter CSV' });
    expect(csvLink).toHaveAttribute('href', '/api/reports/missions?vehicleId=v-42&format=csv');
  });
});
