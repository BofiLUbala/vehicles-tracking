import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const fetchDriversMock = vi.fn();
const createDriverMock = vi.fn();
const updateDriverMock = vi.fn();
const removeDriverMock = vi.fn();
const assignVehicleToDriverMock = vi.fn();
const revokeDriverDeviceMock = vi.fn();

vi.mock('@/features/drivers/api', () => ({
  fetchDrivers: (...args: unknown[]) => fetchDriversMock(...args),
  fetchDriver: vi.fn(),
  createDriver: (...args: unknown[]) => createDriverMock(...args),
  updateDriver: (...args: unknown[]) => updateDriverMock(...args),
  removeDriver: (...args: unknown[]) => removeDriverMock(...args),
  assignVehicleToDriver: (...args: unknown[]) => assignVehicleToDriverMock(...args),
  revokeDriverDevice: (...args: unknown[]) => revokeDriverDeviceMock(...args),
}));

const fetchVehiclesMock = vi.fn();
vi.mock('@/features/vehicles/api', () => ({
  fetchVehicles: (...args: unknown[]) => fetchVehiclesMock(...args),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { DriversPageClient } from '@/features/drivers/drivers-page-client';
import type { DriverDto } from '@/features/drivers/types';
import type { VehicleDto } from '@/features/vehicles/types';

function makeDriver(overrides: Partial<DriverDto> = {}): DriverDto {
  return {
    id: 'd1',
    organizationId: 'org1',
    firstName: 'Jean',
    lastName: 'Dupont',
    phone: '+243999000000',
    licenseNumber: 'LIC-1',
    status: 'ACTIVE',
    createdAt: '2026-09-08T10:00:00.000Z',
    updatedAt: '2026-09-08T10:00:00.000Z',
    currentVehicle: null,
    ...overrides,
  };
}

function makeVehicle(overrides: Partial<VehicleDto> = {}): VehicleDto {
  return {
    id: 'v1',
    organizationId: 'org1',
    plateNumber: 'AB-123-CD',
    brand: 'Toyota',
    model: 'Hilux',
    year: 2020,
    status: 'AVAILABLE',
    tankCapacity: 60,
    createdAt: '2026-09-08T10:00:00.000Z',
    updatedAt: '2026-09-08T10:00:00.000Z',
    currentDriver: null,
    ...overrides,
  };
}

function renderWithClient(children: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>);
}

describe('DriversPageClient', () => {
  beforeEach(() => {
    fetchDriversMock.mockReset();
    createDriverMock.mockReset();
    updateDriverMock.mockReset();
    removeDriverMock.mockReset();
    assignVehicleToDriverMock.mockReset();
    revokeDriverDeviceMock.mockReset();
    fetchVehiclesMock.mockReset();
    fetchVehiclesMock.mockResolvedValue([makeVehicle()]);
  });

  it('renders driver rows from the mocked API response', async () => {
    fetchDriversMock.mockResolvedValue([makeDriver()]);

    renderWithClient(<DriversPageClient />);

    expect(await screen.findByText('Jean Dupont')).toBeInTheDocument();
    expect(screen.getByText('+243999000000')).toBeInTheDocument();
    expect(screen.getByText('Actif', { selector: 'div' })).toBeInTheDocument();
  });

  it('filters the driver list by search text', async () => {
    fetchDriversMock.mockResolvedValue([
      makeDriver({ id: 'd1', firstName: 'Jean', lastName: 'Dupont' }),
      makeDriver({ id: 'd2', firstName: 'Marie', lastName: 'Curie', phone: '+243999111111' }),
    ]);
    const user = userEvent.setup();

    renderWithClient(<DriversPageClient />);

    await screen.findByText('Jean Dupont');
    expect(screen.getByText('Marie Curie')).toBeInTheDocument();

    await user.type(screen.getByLabelText(/recherche/i), 'Marie');

    await waitFor(() => expect(screen.queryByText('Jean Dupont')).not.toBeInTheDocument());
    expect(screen.getByText('Marie Curie')).toBeInTheDocument();
  });

  it('validates the create-driver form (required fields and phone format)', async () => {
    fetchDriversMock.mockResolvedValue([]);
    const user = userEvent.setup();

    renderWithClient(<DriversPageClient />);

    await user.click(await screen.findByRole('button', { name: /nouveau chauffeur/i }));
    await user.type(screen.getByLabelText(/téléphone/i), '0999000000');
    await user.click(screen.getByRole('button', { name: /^enregistrer$/i }));

    expect(await screen.findByText(/prénom est requis/i)).toBeInTheDocument();
    expect(screen.getByText(/format e\.164/i)).toBeInTheDocument();
    expect(createDriverMock).not.toHaveBeenCalled();
  });

  it('calls assignVehicleToDriver with the driver id and selected vehicle id', async () => {
    fetchDriversMock.mockResolvedValue([makeDriver()]);
    assignVehicleToDriverMock.mockResolvedValue(makeDriver());
    const user = userEvent.setup();

    renderWithClient(<DriversPageClient />);

    await user.click(await screen.findByRole('button', { name: /affecter véhicule/i }));
    await screen.findByText('Véhicule');

    const select = screen.getByLabelText(/véhicule$/i);
    await user.selectOptions(select, 'v1');

    await user.click(screen.getByRole('button', { name: /^affecter$/i }));

    await waitFor(() => expect(assignVehicleToDriverMock).toHaveBeenCalledWith('d1', 'v1'));
  });

  it('calls revokeDriverDevice with the driver id and typed device id', async () => {
    fetchDriversMock.mockResolvedValue([makeDriver()]);
    revokeDriverDeviceMock.mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderWithClient(<DriversPageClient />);

    await user.click(await screen.findByRole('button', { name: /révoquer appareil/i }));
    await user.type(screen.getByLabelText(/identifiant de l'appareil/i), 'device-123');
    await user.click(screen.getByRole('button', { name: /^révoquer$/i }));

    await waitFor(() => expect(revokeDriverDeviceMock).toHaveBeenCalledWith('d1', 'device-123'));
  });
});
