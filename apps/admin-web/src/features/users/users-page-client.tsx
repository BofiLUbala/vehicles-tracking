'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ErrorState, LoadingSkeleton } from '@/components/empty-state';
import { UsersTable } from '@/features/users/users-table';
import { fetchUsers, inviteAdmin } from '@/features/users/api';
import { Input } from '@/components/ui/input';
import { canManageUsers } from '@/features/users/permissions';
import { useCurrentUser } from '@/features/auth/current-user';

export function UsersPageClient() {
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const { data: currentUser } = useCurrentUser();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['users', 'list'],
    queryFn: fetchUsers,
  });

  const canManage = canManageUsers(currentUser?.role);
  const invitation = useMutation({
    mutationFn: inviteAdmin,
    onSuccess: async () => {
      setInviteMessage('Invitation créée. Communiquez à cette personne le lien /activate-invitation.');
      setInviteEmail('');
      await queryClient.invalidateQueries({ queryKey: ['users', 'list'] });
    },
    onError: () => setInviteMessage("Impossible de créer l’invitation."),
  });

  return (
    <div className="flex flex-col gap-5 p-6 lg:p-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Utilisateurs</h1>
        <p className="text-sm text-muted-foreground">
          Gérez les comptes administrateurs et les rôles de votre organisation.
        </p>
      </div>

      <Card>
        <CardContent className="px-5 pb-5 pt-3 text-sm text-muted-foreground">
          Les comptes administrateurs sont créés sur invitation du super-administrateur, puis activés
          par leur propriétaire avec un code reçu par e-mail.
        </CardContent>
      </Card>

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Gestion des comptes (Super-administrateur)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Input
                className="max-w-sm"
                type="email"
                placeholder="nouvel.admin@exemple.com"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
              />
              <Button
                variant="outline"
                disabled={!inviteEmail || invitation.isPending}
                onClick={() => { setInviteMessage(null); invitation.mutate(inviteEmail); }}
              >
                {invitation.isPending ? 'Invitation…' : 'Inviter un utilisateur'}
              </Button>
            </div>
            {inviteMessage && <p className="text-sm">{inviteMessage}</p>}
            <div className="flex flex-wrap gap-2">
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
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading && <LoadingSkeleton className="h-64" />}
          {isError && <ErrorState message="Impossible de charger les utilisateurs." />}
          {data && <UsersTable users={data} />}
        </CardContent>
      </Card>
    </div>
  );
}
