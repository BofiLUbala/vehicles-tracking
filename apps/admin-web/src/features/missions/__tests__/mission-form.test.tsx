import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const fetchDriversMock = vi.fn();
const fetchVehiclesMock = vi.fn();

vi.mock('@/features/missions/api', () => ({
  fetchDrivers: (...args: unknown[]) => fetchDriversMock(...args),
  fetchVehicles: (...args: unknown[]) => fetchVehiclesMock(...args),
}));

vi.mock('@/features/locations/api', () => ({
  fetchLocations: vi.fn().mockResolvedValue([{ id: 'loc-1', name: 'Dépôt Limete' }]),
}));

import { MissionForm } from '@/features/missions/mission-form';
import type { DriverRef, VehicleRef } from '@/features/missions/types';

function renderWithClient(children: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>);
}

const drivers: DriverRef[] = [
  {
    id: 'd1',
    firstName: 'Gauthier',
    lastName: 'Bofi',
    phone: '+243900000001',
    status: 'ACTIVE',
    currentVehicle: { id: 'v1', plateNumber: 'VH-204', status: 'AVAILABLE' },
    activeMission: null,
  },
  {
    id: 'd2',
    firstName: 'Paul',
    lastName: 'Kanku',
    phone: '+243900000002',
    status: 'ACTIVE',
    currentVehicle: null,
    activeMission: { id: 'm-busy-1', status: 'STARTED' },
  },
  {
    id: 'd3',
    firstName: 'Inactif',
    lastName: 'Test',
    phone: null,
    status: 'SUSPENDED',
    currentVehicle: null,
    activeMission: null,
  },
];

const vehicles: VehicleRef[] = [
  { id: 'v1', plateNumber: 'VH-204', brand: 'Isuzu', model: 'NPR', status: 'AVAILABLE', activeMission: null },
  { id: 'v2', plateNumber: 'VH-999', brand: null, model: null, status: 'BROKEN_DOWN', activeMission: null },
];

describe('MissionForm (driver/vehicle wiring)', () => {
  beforeEach(() => {
    fetchDriversMock.mockReset().mockResolvedValue(drivers);
    fetchVehiclesMock.mockReset().mockResolvedValue(vehicles);
  });

  it('fetches real drivers/vehicles and shows availability labels', async () => {
    let resolveDrivers!: (v: DriverRef[]) => void;
    fetchDriversMock.mockReset().mockImplementation(
      () =>
        new Promise<DriverRef[]>((resolve) => {
          resolveDrivers = resolve;
        }),
    );
    renderWithClient(<MissionForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

    expect(await screen.findByText('Chargement des chauffeurs…')).toBeInTheDocument();
    resolveDrivers(drivers);

    const driverSelect = await screen.findByLabelText('Chauffeur');
    expect(fetchDriversMock).toHaveBeenCalled();
    expect(fetchVehiclesMock).toHaveBeenCalled();

    const options = within(driverSelect as HTMLSelectElement).getAllByRole('option');
    expect(options.map((o) => (o as HTMLOptionElement).value)).toEqual(['', 'd1', 'd2', 'd3']);
    expect(options[1].textContent).toContain('Gauthier Bofi');
    expect(options[1].textContent).toContain('VH-204');
    expect(options[1].textContent).toContain('Disponible');
    expect(options[2].textContent).toContain('En mission');
    // Occupé / suspendu : options désactivées, jamais soumises par erreur.
    expect((options[2] as HTMLOptionElement).disabled).toBe(true);
    expect((options[3] as HTMLOptionElement).disabled).toBe(true);
    expect((options[1] as HTMLOptionElement).disabled).toBe(false);
  });

  it('shows an empty state when no drivers exist', async () => {
    fetchDriversMock.mockResolvedValue([]);
    renderWithClient(<MissionForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

    expect(await screen.findByText('Aucun chauffeur disponible.')).toBeInTheDocument();
  });

  it('shows an error with retry when the drivers fetch fails', async () => {
    fetchDriversMock.mockRejectedValueOnce(new Error('boom'));
    renderWithClient(<MissionForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

    expect(await screen.findByText('Impossible de charger les chauffeurs.')).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /réessayer/i }));
    await waitFor(() => expect(fetchDriversMock).toHaveBeenCalledTimes(2));
  });

  it('shows driver context and auto-selects an assignable current vehicle', async () => {
    const user = userEvent.setup();
    renderWithClient(<MissionForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

    const driverSelect = await screen.findByLabelText('Chauffeur');
    await user.selectOptions(driverSelect, 'd1');

    // Le véhicule actuel apparaît dans le panneau de contexte (texte exact).
    expect(screen.getByText('VH-204')).toBeInTheDocument();
    expect(screen.getByText('Aucune')).toBeInTheDocument();
    // Véhicule actuel assignable → présélectionné automatiquement.
    await waitFor(() => {
      expect((screen.getByLabelText('Véhicule') as HTMLSelectElement).value).toBe('v1');
    });
  });

  it('submits real driverId/vehicleId (never labels)', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    renderWithClient(<MissionForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.selectOptions(await screen.findByLabelText('Chauffeur'), 'd1');
    await user.selectOptions(await screen.findByLabelText('Véhicule'), 'v1');
    await user.selectOptions(screen.getByLabelText('Lieu'), 'loc-1');
    await user.click(screen.getByRole('button', { name: /créer la mission/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const values = onSubmit.mock.calls[0][0];
    expect(values.driverId).toBe('d1');
    expect(values.vehicleId).toBe('v1');
  });
});
