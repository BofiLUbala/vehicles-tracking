'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { MISSION_STATUS_BADGE_VARIANT, MISSION_STATUS_LABELS } from '@/features/missions/status-labels';
import type { DriverRef, MissionDto, VehicleRef } from '@/features/missions/types';

export interface MissionsTableProps {
  missions: MissionDto[];
  /** Référentiels optionnels pour afficher un nom/immatriculation plutôt qu'un id brut. */
  driversById?: Record<string, DriverRef>;
  vehiclesById?: Record<string, VehicleRef>;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('fr-FR');
  } catch {
    return iso;
  }
}

export function MissionsTable({ missions, driversById, vehiclesById }: MissionsTableProps) {
  if (missions.length === 0) {
    return <p className="p-4 text-sm text-muted-foreground">Aucune mission pour ces filtres.</p>;
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
            <th className="px-3 py-2">Statut</th>
            <th className="px-3 py-2">Chauffeur</th>
            <th className="px-3 py-2">Véhicule</th>
            <th className="px-3 py-2">Début planifié</th>
            <th className="px-3 py-2">Fin planifiée</th>
            <th className="px-3 py-2">Étapes</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {missions.map((mission) => (
            <tr key={mission.id} className="border-b border-border last:border-0">
              <td className="px-3 py-2">
                <Badge variant={MISSION_STATUS_BADGE_VARIANT[mission.status] ?? 'outline'}>
                  {MISSION_STATUS_LABELS[mission.status] ?? mission.status}
                </Badge>
              </td>
              <td className="px-3 py-2">
                {(() => {
                  const driver = driversById?.[mission.driverId];
                  return driver ? `${driver.firstName} ${driver.lastName}` : mission.driverId;
                })()}
              </td>
              <td className="px-3 py-2">{vehiclesById?.[mission.vehicleId]?.plateNumber ?? mission.vehicleId}</td>
              <td className="px-3 py-2">{formatDate(mission.plannedStart)}</td>
              <td className="px-3 py-2">{formatDate(mission.plannedEnd)}</td>
              <td className="px-3 py-2">{mission.steps.length}</td>
              <td className="px-3 py-2">
                <Link href={`/missions/${mission.id}`} className="text-sm font-medium text-primary underline">
                  Détail
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
