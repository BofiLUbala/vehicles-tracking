import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const fetchDriversMock = vi.fn();
const fetchLinkableDriversMock = vi.fn();
const createDriverMock = vi.fn();
const updateDriverMock = vi.fn();
const removeDriverMock = vi.fn();
const assignVehicleToDriverMock = vi.fn();
const revokeDriverDeviceMock = vi.fn();
const inviteDriverMock = vi.fn();
const linkDriverMock = vi.fn();
const resendDriverInvitationMock = vi.fn();

vi.mock('@/features/drivers/api', () => ({
  fetchDrivers: (...args: unknown[]) => fetchDriversMock(...args),
  fetchLinkableDrivers: (...args: unknown[]) => fetchLinkableDriversMock(...args),
  fetchDriver: vi.fn(),
  createDriver: (...args: unknown[]) => createDriverMock(...args),
  updateDriver: (...args: unknown[]) => updateDriverMock(...args),
  removeDriver: (...args: unknown[]) => removeDriverMock(...args),
  assignVehicleToDriver: (...args: unknown[]) => assignVehicleToDriverMock(...args),
  revokeDriverDevice: (...args: unknown[]) => revokeDriverDeviceMock(...args),
  inviteDriver: (...args: unknown[]) => inviteDriverMock(...args),
  linkDriver: (...args: unknown[]) => linkDriverMock(...args),
  resendDriverInvitation: (...args: unknown[]) => resendDriverInvitationMock(...args),
}));

const fetchVehiclesMock = vi.fn();
vi.mock('@/features/vehicles/api', () => ({
  fetchVehicles: (...args: unknown[]) => fetchVehiclesMock(...args),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/features/tracking/socket', () => ({
  connectTrackingSocket: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
    disconnect: vi.fn(),
  })),
}));

vi.mock('@/lib/api-client', () => ({
  fetchAccessToken: vi.fn().mockResolvedValue('mock-token'),
  apiErrorMessage: (_err: unknown, fallback: string) => fallback,
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
    email: 'jean@example.com',
    licenseNumber: 'LIC-1',
    status: 'ACTIVE',
    createdAt: '2026-09-08T10:00:00.000Z',
    updatedAt: '2026-09-08T10:00:00.000Z',
    currentVehicle: null,
    activeMission: null,
    hasMobileAccount: true,
    device: null,
    lastSeenAt: null,
    profile: { complete: true, missing: [] },
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
    fetchLinkableDriversMock.mockReset();
    createDriverMock.mockReset();
    updateDriverMock.mockReset();
    removeDriverMock.mockReset();
    assignVehicleToDriverMock.mockReset();
    revokeDriverDeviceMock.mockReset();
    inviteDriverMock.mockReset();
    linkDriverMock.mockReset();
    fetchVehiclesMock.mockReset();
    fetchVehiclesMock.mockResolvedValue([makeVehicle()]);
    fetchLinkableDriversMock.mockResolvedValue([]);
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

  it('opens the link driver dialog (no longer creates directly)', async () => {
    fetchDriversMock.mockResolvedValue([]);
    const user = userEvent.setup();

    renderWithClient(<DriversPageClient />);

    // Button text changed from "Nouveau chauffeur" to "Ajouter un chauffeur"
    await user.click(await screen.findByRole('button', { name: /ajouter un chauffeur/i }));

    // Should show the linkable accounts picker (empty state)
    expect(await screen.findByText(/aucun compte chauffeur/i)).toBeInTheDocument();
    expect(createDriverMock).not.toHaveBeenCalled();
    expect(inviteDriverMock).not.toHaveBeenCalled();
  });

  it('combines the selected area code with the local number when inviting', async () => {
    fetchDriversMock.mockResolvedValue([]);
    inviteDriverMock.mockResolvedValue(makeDriver({ phone: '+33612345678' }));
    const user = userEvent.setup();
    renderWithClient(<DriversPageClient />);

    await user.click(await screen.findByRole('button', { name: /ajouter un chauffeur/i }));
    await user.click(screen.getByRole('button', { name: /inviter un nouveau chauffeur/i }));
    await user.type(screen.getByLabelText('Prénom'), 'Marie');
    await user.type(screen.getByLabelText('Nom'), 'Curie');
    await user.selectOptions(screen.getByLabelText('Indicatif téléphonique'), '+33');
    await user.type(screen.getByLabelText('Téléphone'), '06 12 34 56 78');
    await user.type(screen.getByLabelText('E-mail'), 'marie@exemple.com');
    await user.click(screen.getByRole('button', { name: /ajouter et inviter/i }));

    await waitFor(() => expect(inviteDriverMock).toHaveBeenCalledWith(
      expect.objectContaining({ firstName: 'Marie', lastName: 'Curie', phone: '+33612345678', email: 'marie@exemple.com' }),
    ));
  });

  it('requires an e-mail to send the activation link', async () => {
    fetchDriversMock.mockResolvedValue([]);
    const user = userEvent.setup();
    renderWithClient(<DriversPageClient />);

    await user.click(await screen.findByRole('button', { name: /ajouter un chauffeur/i }));
    await user.click(screen.getByRole('button', { name: /inviter un nouveau chauffeur/i }));
    await user.type(screen.getByLabelText('Prénom'), 'Marie');
    await user.type(screen.getByLabelText('Nom'), 'Curie');
    await user.type(screen.getByLabelText('Téléphone'), '0999 111 222');
    await user.click(screen.getByRole('button', { name: /ajouter et inviter/i }));

    expect(await screen.findByText(/requis pour envoyer le lien d’activation/i)).toBeInTheDocument();
    expect(inviteDriverMock).not.toHaveBeenCalled();
  });

  it('explains a duplicate number before submitting the invitation', async () => {
    fetchDriversMock.mockResolvedValue([makeDriver()]);
    const user = userEvent.setup();
    renderWithClient(<DriversPageClient />);

    await user.click(await screen.findByRole('button', { name: /ajouter un chauffeur/i }));
    await user.click(screen.getByRole('button', { name: /inviter un nouveau chauffeur/i }));
    await user.type(screen.getByLabelText('Téléphone'), '0999 000 000');

    expect(screen.getByRole('alert')).toHaveTextContent('Ce numéro est déjà utilisé par Jean Dupont');
    expect(screen.getByRole('button', { name: /ajouter et inviter/i })).toBeDisabled();
    expect(inviteDriverMock).not.toHaveBeenCalled();
  });

  it('calls assignVehicleToDriver with the driver id and selected vehicle id', async () => {
    fetchDriversMock.mockResolvedValue([makeDriver()]);
    assignVehicleToDriverMock.mockResolvedValue(makeDriver());
    const user = userEvent.setup();

    renderWithClient(<DriversPageClient />);

    await user.click(await screen.findByRole('button', { name: /affecter véhicule/i }));
    // Wait for the dialog's vehicle select to appear
    const select = await screen.findByLabelText(/véhicule$/i);
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
