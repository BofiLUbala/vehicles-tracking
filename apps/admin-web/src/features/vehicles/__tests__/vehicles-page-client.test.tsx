import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const fetchVehiclesMock = vi.fn();
const createVehicleMock = vi.fn();
const updateVehicleMock = vi.fn();
const assignDriverToVehicleMock = vi.fn();
const fetchVehicleHistoryMock = vi.fn();

vi.mock('@/features/vehicles/api', () => ({
  fetchVehicles: (...args: unknown[]) => fetchVehiclesMock(...args),
  fetchVehicle: vi.fn(),
  fetchVehicleHistory: (...args: unknown[]) => fetchVehicleHistoryMock(...args),
  createVehicle: (...args: unknown[]) => createVehicleMock(...args),
  updateVehicle: (...args: unknown[]) => updateVehicleMock(...args),
  removeVehicle: vi.fn(),
  assignDriverToVehicle: (...args: unknown[]) => assignDriverToVehicleMock(...args),
}));

const fetchDriversMock = vi.fn();
vi.mock('@/features/drivers/api', () => ({
  fetchDrivers: (...args: unknown[]) => fetchDriversMock(...args),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { VehiclesPageClient } from '@/features/vehicles/vehicles-page-client';
import type { VehicleDto } from '@/features/vehicles/types';
import type { DriverDto } from '@/features/drivers/types';

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

function makeDriver(overrides: Partial<DriverDto> = {}): DriverDto {
  return {
    id: 'd1',
    organizationId: 'org1',
    firstName: 'Jean',
    lastName: 'Dupont',
    phone: '+243999000000',
    licenseNumber: null,
    status: 'ACTIVE',
    createdAt: '2026-09-08T10:00:00.000Z',
    updatedAt: '2026-09-08T10:00:00.000Z',
    currentVehicle: null,
    ...overrides,
  };
}

function renderWithClient(children: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>);
}

describe('VehiclesPageClient', () => {
  beforeEach(() => {
    fetchVehiclesMock.mockReset();
    createVehicleMock.mockReset();
    updateVehicleMock.mockReset();
    assignDriverToVehicleMock.mockReset();
    fetchVehicleHistoryMock.mockReset();
    fetchDriversMock.mockReset();
    fetchDriversMock.mockResolvedValue([makeDriver()]);
  });

  it('renders vehicle rows from the mocked API response', async () => {
    fetchVehiclesMock.mockResolvedValue([makeVehicle()]);

    renderWithClient(<VehiclesPageClient />);

    expect(await screen.findByText('AB-123-CD')).toBeInTheDocument();
    expect(screen.getByText('Toyota Hilux')).toBeInTheDocument();
    expect(screen.getByText('Disponible', { selector: 'div' })).toBeInTheDocument();
    expect(screen.getByText('60 L')).toBeInTheDocument();
  });

  it('filters the vehicle list by status', async () => {
    fetchVehiclesMock.mockResolvedValue([
      makeVehicle({ id: 'v1', plateNumber: 'AB-123-CD', status: 'AVAILABLE' }),
      makeVehicle({ id: 'v2', plateNumber: 'XY-999-ZZ', status: 'BROKEN_DOWN' }),
    ]);
    const user = userEvent.setup();

    renderWithClient(<VehiclesPageClient />);

    await screen.findByText('AB-123-CD');
    expect(screen.getByText('XY-999-ZZ')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/^statut$/i), 'BROKEN_DOWN');

    await waitFor(() => expect(screen.queryByText('AB-123-CD')).not.toBeInTheDocument());
    expect(screen.getByText('XY-999-ZZ')).toBeInTheDocument();
  });

  it('validates the create-vehicle form (plate number required)', async () => {
    fetchVehiclesMock.mockResolvedValue([]);
    const user = userEvent.setup();

    renderWithClient(<VehiclesPageClient />);

    await user.click(await screen.findByRole('button', { name: /nouveau véhicule/i }));
    await user.click(screen.getByRole('button', { name: /^enregistrer$/i }));

    expect(await screen.findByText(/immatriculation est requise/i)).toBeInTheDocument();
    expect(createVehicleMock).not.toHaveBeenCalled();
  });

  it('calls assignDriverToVehicle with the vehicle id and selected driver id', async () => {
    fetchVehiclesMock.mockResolvedValue([makeVehicle()]);
    assignDriverToVehicleMock.mockResolvedValue(makeVehicle());
    const user = userEvent.setup();

    renderWithClient(<VehiclesPageClient />);

    await user.click(await screen.findByRole('button', { name: /affecter chauffeur/i }));
    await screen.findByText('Chauffeur');

    const select = screen.getByLabelText(/^chauffeur$/i);
    await user.selectOptions(select, 'd1');

    await user.click(screen.getByRole('button', { name: /^affecter$/i }));

    await waitFor(() => expect(assignDriverToVehicleMock).toHaveBeenCalledWith('v1', 'd1'));
  });
});
