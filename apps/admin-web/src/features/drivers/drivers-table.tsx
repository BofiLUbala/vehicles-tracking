'use client';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/empty-state';
import { StatusBadge, type StatusTone } from '@/components/status-badge';
import { driverStatusToLabel } from '@/features/drivers/driver-status';
import type { DriverDto, DriverStatus } from '@/features/drivers/types';

function driverStatusTone(status: DriverStatus): StatusTone {
  switch (status) {
    case 'ACTIVE':
      return 'success';
    case 'SUSPENDED':
      return 'warning';
    case 'UNAVAILABLE':
      return 'neutral';
    case 'DISABLED':
      return 'danger';
    default:
      return 'neutral';
  }
}

function formatMissing(missing: DriverDto['profile']['missing']): string {
  const labels: Record<string, string> = {
    phone: 'Tél.',
    email: 'E-mail',
    licenseNumber: 'Permis',
    password: 'Mobile',
  };
  return missing.map((m) => labels[m] || m).join(', ');
}

function LastSeenBadge({ lastSeenAt }: { lastSeenAt: string | null | undefined }) {
  if (!lastSeenAt) return <span className="text-xs text-muted-foreground">Jamais</span>;
  const diffMs = Date.now() - new Date(lastSeenAt).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 5) return <StatusBadge tone="success" dot>En ligne</StatusBadge>;
  if (diffMins < 60) return <span className="text-xs text-muted-foreground">Il y a {diffMins} min</span>;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return <span className="text-xs text-muted-foreground">Il y a {diffHours} h</span>;
  return <span className="text-xs text-muted-foreground">{new Date(lastSeenAt).toLocaleDateString()}</span>;
}

export interface DriversTableProps {
  drivers: DriverDto[];
  onEdit: (driver: DriverDto) => void;
  onDelete: (driver: DriverDto) => void;
  onAssignVehicle: (driver: DriverDto) => void;
  onRevokeDevice: (driver: DriverDto) => void;
  onResendInvitation: (driver: DriverDto) => void;
}

export function DriversTable({ drivers, onEdit, onDelete, onAssignVehicle, onRevokeDevice, onResendInvitation }: DriversTableProps) {
  if (drivers.length === 0) {
    return <EmptyState title="Aucun chauffeur" description="Aucun chauffeur pour ces filtres." className="py-14" />;
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-2xs uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-3">Nom</th>
            <th className="px-4 py-3">Contact</th>
            <th className="px-4 py-3">Compte</th>
            <th className="px-4 py-3">Statut</th>
            <th className="px-4 py-3">Véhicule</th>
            <th className="px-4 py-3">Présence</th>
            <th className="px-4 py-3">Profil</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {drivers.map((driver) => (
            <tr key={driver.id} className="border-b border-border transition-colors last:border-0 hover:bg-muted/40">
              <td className="px-4 py-3 font-medium text-foreground">
                {driver.firstName} {driver.lastName}
              </td>
              <td className="px-4 py-3 tabular-nums text-sm">
                <div className="space-y-0.5">
                  <div>{driver.phone}</div>
                  {driver.email && <div className="text-muted-foreground truncate max-w-xs">{driver.email}</div>}
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  {driver.hasMobileAccount ? (
                    <StatusBadge tone="info" dot className="text-xs">
                      Mobile
                    </StatusBadge>
                  ) : (
                    <StatusBadge tone="neutral" dot className="text-xs">
                      Invité
                    </StatusBadge>
                  )}
                </div>
              </td>
              <td className="px-4 py-3">
                <StatusBadge tone={driverStatusTone(driver.status)} dot>
                  {driverStatusToLabel(driver.status)}
                </StatusBadge>
              </td>
              <td className="px-4 py-3 tabular-nums">{driver.currentVehicle?.plateNumber ?? '—'}</td>
              <td className="px-4 py-3">
                <LastSeenBadge lastSeenAt={driver.lastSeenAt} />
              </td>
              <td className="px-4 py-3">
                <span className={`text-xs ${driver.profile?.complete ? 'text-success' : 'text-warning'}`}>
                  {driver.profile?.complete ? 'Complet' : `Manquant: ${formatMissing(driver.profile?.missing ?? [])}`}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1.5">
                  <Button type="button" size="sm" variant="outline" onClick={() => onEdit(driver)}>
                    Modifier
                  </Button>
                  {!driver.hasMobileAccount && driver.email && (
                    <Button type="button" size="sm" variant="outline" onClick={() => onResendInvitation(driver)}>
                      Renvoyer l'invitation
                    </Button>
                  )}
                  <Button type="button" size="sm" variant="outline" onClick={() => onAssignVehicle(driver)}>
                    Affecter véhicule
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => onRevokeDevice(driver)}>
                    Révoquer appareil
                  </Button>
                  <Button type="button" size="sm" variant="destructive" onClick={() => onDelete(driver)}>
                    Désactiver
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
