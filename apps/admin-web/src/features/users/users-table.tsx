'use client';

import { Badge } from '@/components/ui/badge';
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

export function UsersTable({ users }: UsersTableProps) {
  if (users.length === 0) {
    return <p className="p-4 text-sm text-muted-foreground">Aucun utilisateur.</p>;
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
            <th className="px-3 py-2">Email</th>
            <th className="px-3 py-2">Nom</th>
            <th className="px-3 py-2">Rôle</th>
            <th className="px-3 py-2">Statut</th>
            <th className="px-3 py-2">Créé le</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-b border-border last:border-0">
              <td className="px-3 py-2">{user.email}</td>
              <td className="px-3 py-2">
                {user.firstName || user.lastName ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() : '—'}
              </td>
              <td className="px-3 py-2">
                <Badge variant="outline">{ROLE_LABELS[user.role.name] ?? user.role.name}</Badge>
              </td>
              <td className="px-3 py-2">
                {user.isActive ? (
                  <Badge variant="secondary">Actif</Badge>
                ) : (
                  <Badge variant="destructive">Désactivé</Badge>
                )}
              </td>
              <td className="px-3 py-2">{formatDate(user.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
