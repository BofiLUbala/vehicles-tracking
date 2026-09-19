'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorState, LoadingSkeleton } from '@/components/empty-state';
import { StatusBadge, type StatusTone } from '@/components/status-badge';
import { fetchRoles } from '@/features/settings/api';
import { ALERT_THRESHOLDS } from '@/features/settings/thresholds';

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super-administrateur',
  ADMIN: 'Administrateur',
  DRIVER: 'Chauffeur',
};

const ROLE_TONES: Record<string, StatusTone> = {
  SUPER_ADMIN: 'navy',
  ADMIN: 'info',
  DRIVER: 'success',
};

export function SettingsPageClient() {
  const { data: roles, isLoading, isError } = useQuery({
    queryKey: ['settings', 'roles'],
    queryFn: fetchRoles,
  });

  return (
    <div className="flex flex-col gap-5 p-6 lg:p-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Paramètres</h1>
        <p className="text-sm text-muted-foreground">
          Seuils d&apos;alerte et rôles de votre organisation.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Seuils d&apos;alerte actuels</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Ces seuils sont configurés par variables d&apos;environnement côté API (
            <code className="rounded bg-muted px-1 py-0.5 text-xs">apps/api/.env</code>) et non en
            base de données : cet écran est en lecture seule. L&apos;édition en direct est une
            évolution future qui nécessitera un mécanisme de stockage des paramètres côté backend.
          </p>
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-2xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Seuil</th>
                  <th className="px-4 py-3">Variable</th>
                  <th className="px-4 py-3">Valeur par défaut</th>
                  <th className="px-4 py-3">Description</th>
                </tr>
              </thead>
              <tbody>
                {ALERT_THRESHOLDS.map((threshold) => (
                  <tr key={threshold.envVar} className="border-b border-border align-top transition-colors last:border-0 hover:bg-muted/40">
                    <td className="px-4 py-3 font-medium text-foreground">{threshold.label}</td>
                    <td className="px-4 py-3">
                      <code className="rounded bg-muted px-1 py-0.5 text-xs">{threshold.envVar}</code>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                      {threshold.defaultValue} {threshold.unit}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{threshold.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Rôles et permissions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Liste en lecture seule des rôles disponibles. L&apos;édition des permissions associées
            à chaque rôle nécessite une extension backend (le modèle <code className="rounded bg-muted px-1 py-0.5 text-xs">Permission</code> existe
            en base mais n&apos;est pas encore exposé par l&apos;API).
          </p>
          {isLoading && <LoadingSkeleton className="h-32" />}
          {isError && <ErrorState message="Impossible de charger les rôles." />}
          {roles && (
            <ul className="flex flex-col gap-2">
              {roles.map((role) => (
                <li key={role.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/50 px-4 py-3">
                  <StatusBadge tone={ROLE_TONES[role.name] ?? 'neutral'} dot>
                    {ROLE_LABELS[role.name] ?? role.name}
                  </StatusBadge>
                  <span className="text-sm text-muted-foreground">{role.description ?? 'Aucune description.'}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Journaux d&apos;audit</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          L&apos;API journalise déjà de nombreuses actions dans la table <code className="rounded bg-muted px-1 py-0.5 text-xs">AuditLog</code> (ex. annulation
          de mission, transitions de statut d&apos;alerte), mais n&apos;expose aujourd&apos;hui aucun
          endpoint de lecture (aucun contrôleur audit-log dans <code className="rounded bg-muted px-1 py-0.5 text-xs">apps/api/src</code>). Cette section
          nécessite une extension backend avant de pouvoir afficher un journal consultable ici.
        </CardContent>
      </Card>
    </div>
  );
}