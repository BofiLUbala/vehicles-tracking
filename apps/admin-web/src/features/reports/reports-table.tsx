'use client';

import { EmptyState } from '@/components/empty-state';
import { StatusBadge } from '@/components/status-badge';
import { missionTone } from '@/features/dashboard/tones';
import type { FuelReportRow, MissionReportRow } from '@/features/reports/types';
import { MISSION_STATUS_LABELS } from '@/features/missions/status-labels';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('fr-FR');
  } catch {
    return iso;
  }
}

const CURRENCY_FORMAT = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

export interface MissionsReportTableProps {
  rows: MissionReportRow[];
}

export function MissionsReportTable({ rows }: MissionsReportTableProps) {
  if (rows.length === 0) {
    return <EmptyState title="Aucune mission" description="Aucune mission pour ces filtres." className="py-14" />;
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-2xs uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-3">Statut</th>
            <th className="px-4 py-3">Véhicule</th>
            <th className="px-4 py-3">Chauffeur</th>
            <th className="px-4 py-3">Points de collecte / dépôt</th>
            <th className="px-4 py-3 text-center">Étapes</th>
            <th className="px-4 py-3">Début planifié</th>
            <th className="px-4 py-3">Début réel</th>
            <th className="px-4 py-3">Fin réelle</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border transition-colors last:border-0 hover:bg-muted/40">
              <td className="px-4 py-3">
                <StatusBadge tone={missionTone(row.status)} dot>
                  {MISSION_STATUS_LABELS[row.status] ?? row.status}
                </StatusBadge>
              </td>
              <td className="px-4 py-3 tabular-nums">{row.vehiclePlate ?? row.vehicleId ?? '—'}</td>
              <td className="px-4 py-3 font-medium text-foreground">{row.driverName ?? row.driverId ?? '—'}</td>
              <td className="px-4 py-3">{row.locations || '—'}</td>
              <td className="px-4 py-3 text-center tabular-nums text-muted-foreground">{row.stepCount}</td>
              <td className="px-4 py-3 tabular-nums text-muted-foreground">{formatDate(row.plannedStart)}</td>
              <td className="px-4 py-3 tabular-nums text-muted-foreground">{formatDate(row.actualStart)}</td>
              <td className="px-4 py-3 tabular-nums text-muted-foreground">{formatDate(row.actualEnd)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export interface FuelReportTableProps {
  rows: FuelReportRow[];
}

export function FuelReportTable({ rows }: FuelReportTableProps) {
  if (rows.length === 0) {
    return <EmptyState title="Aucun plein" description="Aucun plein pour ces filtres." className="py-14" />;
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-2xs uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Véhicule</th>
            <th className="px-4 py-3">Chauffeur</th>
            <th className="px-4 py-3 text-right">Litres</th>
            <th className="px-4 py-3 text-right">Coût</th>
            <th className="px-4 py-3 text-right">Odomètre</th>
            <th className="px-4 py-3">Carburant</th>
            <th className="px-4 py-3">Station</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border transition-colors last:border-0 hover:bg-muted/40">
              <td className="px-4 py-3 tabular-nums text-muted-foreground">{formatDate(row.createdAt)}</td>
              <td className="px-4 py-3 tabular-nums">{row.vehiclePlate ?? row.vehicleId ?? '—'}</td>
              <td className="px-4 py-3 font-medium text-foreground">{row.driverName ?? row.driverId ?? '—'}</td>
              <td className="px-4 py-3 text-right font-bold tabular-nums">{row.liters.toFixed(1)} L</td>
              <td className="px-4 py-3 text-right font-bold tabular-nums">{CURRENCY_FORMAT.format(row.totalCost)}</td>
              <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{row.odometer.toFixed(0)} km</td>
              <td className="px-4 py-3">{row.fuelType}</td>
              <td className="px-4 py-3">{row.stationName ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}