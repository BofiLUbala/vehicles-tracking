'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UsersTable } from '@/features/users/users-table';
import { fetchUsers } from '@/features/users/api';
import { canManageUsers } from '@/features/users/permissions';
import { useCurrentUser } from '@/features/auth/current-user';

export function UsersPageClient() {
  const { data: currentUser } = useCurrentUser();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['users', 'list'],
    queryFn: fetchUsers,
  });

  const canManage = canManageUsers(currentUser?.role);

  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="text-xl font-semibold">Utilisateurs</h1>

      <Card>
        <CardContent className="pt-4 text-sm text-muted-foreground">
          Cette liste est en lecture seule pour le moment : l&apos;API n&apos;expose aujourd&apos;hui que{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">GET /users</code> et{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">GET /users/:id</code>. La création
          d&apos;administrateurs, le changement de rôle et la désactivation nécessitent une extension
          backend (voir <code className="rounded bg-muted px-1 py-0.5 text-xs">apps/api/src/users</code>).
        </CardContent>
      </Card>

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Gestion des comptes (Super-administrateur)</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <span title="Nécessite une extension backend : aucun endpoint de création n'existe encore.">
              <Button disabled variant="outline">
                Inviter un utilisateur
              </Button>
            </span>
            <span title="Nécessite une extension backend : aucun endpoint de changement de rôle n'existe encore.">
              <Button disabled variant="outline">
                Changer le rôle
              </Button>
            </span>
            <span title="Nécessite une extension backend : aucun endpoint de désactivation n'existe encore.">
              <Button disabled variant="outline">
                Désactiver un compte
              </Button>
            </span>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading && <p className="p-4 text-sm text-muted-foreground">Chargement des utilisateurs…</p>}
          {isError && <p className="p-4 text-sm text-destructive">Impossible de charger les utilisateurs.</p>}
          {data && <UsersTable users={data} />}
        </CardContent>
      </Card>
    </div>
  );
}
