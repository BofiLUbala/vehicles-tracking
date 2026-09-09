import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const fetchRolesMock = vi.fn();

vi.mock('@/features/settings/api', () => ({
  fetchRoles: (...args: unknown[]) => fetchRolesMock(...args),
}));

import { SettingsPageClient } from '@/features/settings/settings-page-client';
import type { RoleDto } from '@/features/settings/types';

function makeRole(overrides: Partial<RoleDto> = {}): RoleDto {
  return {
    id: 'r1',
    name: 'ADMIN',
    description: 'Administrateur de l\'organisation',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function renderWithClient(children: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>);
}

describe('SettingsPageClient', () => {
  beforeEach(() => {
    fetchRolesMock.mockReset();
  });

  it('renders the alert thresholds table read-only', async () => {
    fetchRolesMock.mockResolvedValue([makeRole()]);

    renderWithClient(<SettingsPageClient />);

    expect(screen.getByText('MAX_PLAUSIBLE_SPEED_KMH')).toBeInTheDocument();
    expect(screen.getByText('150 km/h')).toBeInTheDocument();
    expect(screen.getByText('VEHICLE_OFFLINE_THRESHOLD_MINUTES')).toBeInTheDocument();
  });

  it('renders the roles list from the mocked API response', async () => {
    fetchRolesMock.mockResolvedValue([makeRole({ name: 'SUPER_ADMIN', description: 'Accès complet' })]);

    renderWithClient(<SettingsPageClient />);

    expect(await screen.findByText('Super-administrateur')).toBeInTheDocument();
    expect(screen.getByText('Accès complet')).toBeInTheDocument();
    expect(fetchRolesMock).toHaveBeenCalled();
  });

  it('shows the honest "requires backend extension" message for audit logs', () => {
    fetchRolesMock.mockResolvedValue([]);

    renderWithClient(<SettingsPageClient />);

    expect(screen.getAllByText(/nécessite une extension backend/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/aucun contrôleur audit-log/i)).toBeInTheDocument();
  });
});
