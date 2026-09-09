import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const fetchUsersMock = vi.fn();
const useCurrentUserMock = vi.fn();

vi.mock('@/features/users/api', () => ({
  fetchUsers: (...args: unknown[]) => fetchUsersMock(...args),
}));

vi.mock('@/features/auth/current-user', () => ({
  useCurrentUser: () => useCurrentUserMock(),
}));

import { UsersPageClient } from '@/features/users/users-page-client';
import type { AdminUserDto } from '@/features/users/types';

function makeUser(overrides: Partial<AdminUserDto> = {}): AdminUserDto {
  return {
    id: 'u1',
    email: 'admin@demo.local',
    firstName: 'Ada',
    lastName: 'Admin',
    isActive: true,
    role: { id: 'r1', name: 'ADMIN', description: null },
    createdAt: '2026-09-01T10:00:00.000Z',
    ...overrides,
  };
}

function renderWithClient(children: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>);
}

describe('UsersPageClient', () => {
  beforeEach(() => {
    fetchUsersMock.mockReset();
    useCurrentUserMock.mockReset();
  });

  it('renders the user list from the mocked API response', async () => {
    fetchUsersMock.mockResolvedValue([makeUser()]);
    useCurrentUserMock.mockReturnValue({ data: { id: 'me', role: 'ADMIN', organizationId: 'org1' } });

    renderWithClient(<UsersPageClient />);

    expect(await screen.findByText('admin@demo.local')).toBeInTheDocument();
    expect(screen.getByText('Ada Admin')).toBeInTheDocument();
  });

  it('shows management actions (disabled) to a SUPER_ADMIN', async () => {
    fetchUsersMock.mockResolvedValue([makeUser()]);
    useCurrentUserMock.mockReturnValue({ data: { id: 'me', role: 'SUPER_ADMIN', organizationId: 'org1' } });

    renderWithClient(<UsersPageClient />);

    await screen.findByText('admin@demo.local');

    const inviteButton = screen.getByRole('button', { name: 'Inviter un utilisateur' });
    expect(inviteButton).toBeInTheDocument();
    expect(inviteButton).toBeDisabled();
  });

  it('hides management actions from a non-SUPER_ADMIN', async () => {
    fetchUsersMock.mockResolvedValue([makeUser()]);
    useCurrentUserMock.mockReturnValue({ data: { id: 'me', role: 'ADMIN', organizationId: 'org1' } });

    renderWithClient(<UsersPageClient />);

    await screen.findByText('admin@demo.local');

    expect(screen.queryByRole('button', { name: 'Inviter un utilisateur' })).not.toBeInTheDocument();
  });
});
