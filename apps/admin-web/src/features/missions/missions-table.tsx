'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { StatusBadge } from '@/components/status-badge';
import { EmptyState } from '@/components/empty-state';
import { missionTone } from '@/features/dashboard/tones';
import { MISSION_STATUS_LABELS } from '@/features/missions/status-labels';
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
    return <EmptyState title="Aucune mission" description="Aucune mission pour ces filtres." className="py-14" />;
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-2xs uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-3">Statut</th>
            <th className="px-4 py-3">Chauffeur</th>
            <th className="px-4 py-3">Véhicule</th>
            <th className="px-4 py-3">Début planifié</th>
            <th className="px-4 py-3">Fin planifiée</th>
            <th className="px-4 py-3 text-center">Étapes</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {missions.map((mission) => {
            const driver = driversById?.[mission.driverId];
            const vehicle = vehiclesById?.[mission.vehicleId];
            return (
              <tr key={mission.id} className="group border-b border-border transition-colors last:border-0 hover:bg-muted/40">
                <td className="px-4 py-3">
                  <StatusBadge tone={missionTone(mission.status)} dot>
                    {MISSION_STATUS_LABELS[mission.status] ?? mission.status}
                  </StatusBadge>
                </td>
                <td className="px-4 py-3 font-medium text-foreground">
                  {driver ? `${driver.firstName} ${driver.lastName}` : mission.driverId}
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {vehicle?.plateNumber ?? mission.vehicleId}
                </td>
                <td className="px-4 py-3 tabular-nums text-muted-foreground">{formatDate(mission.plannedStart)}</td>
                <td className="px-4 py-3 tabular-nums text-muted-foreground">{formatDate(mission.plannedEnd)}</td>
                <td className="px-4 py-3 text-center tabular-nums text-muted-foreground">{mission.steps.length}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/missions/${mission.id}`}
                    className="inline-flex items-center gap-0.5 text-sm font-semibold text-primary transition-colors hover:text-primary/80 group-hover:underline"
                  >
                    Détail <ChevronRight className="h-4 w-4" />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}