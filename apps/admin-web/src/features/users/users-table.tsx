'use client';

import { EmptyState } from '@/components/empty-state';
import { StatusBadge, type StatusTone } from '@/components/status-badge';
import type { AdminUserDto } from '@/features/users/types';

export interface UsersTableProps {
  users: AdminUserDto[];
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('fr-FR');
  } catch {
    return iso;
  }
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super-administrateur',
  ADMIN: 'Administrateur',
  DRIVER: 'Chauffeur',
};

const ROLE_TONES: Record<string, StatusTone> = {
  SUPER_ADMIN: 'navy',
  ADMIN: 'info',
  MANAGER: 'neutral',
  DRIVER: 'success',
};

export function UsersTable({ users }: UsersTableProps) {
  if (users.length === 0) {
    return <EmptyState title="Aucun utilisateur" description="Aucun utilisateur." className="py-14" />;
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-2xs uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Nom</th>
            <th className="px-4 py-3">Rôle</th>
            <th className="px-4 py-3">Statut</th>
            <th className="px-4 py-3">Créé le</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-b border-border transition-colors last:border-0 hover:bg-muted/40">
              <td className="px-4 py-3 font-medium text-foreground">{user.email}</td>
              <td className="px-4 py-3">
                {user.firstName || user.lastName ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() : '—'}
              </td>
              <td className="px-4 py-3">
                <StatusBadge tone={ROLE_TONES[user.role.name] ?? 'neutral'}>
                  {ROLE_LABELS[user.role.name] ?? user.role.name}
                </StatusBadge>
              </td>
              <td className="px-4 py-3">
                {user.isActive ? (
                  <StatusBadge tone="success" dot>
                    Actif
                  </StatusBadge>
                ) : (
                  <StatusBadge tone="danger" dot>
                    Désactivé
                  </StatusBadge>
                )}
              </td>
              <td className="px-4 py-3 tabular-nums text-muted-foreground">{formatDate(user.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}