'use client';

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
    return <p className="p-4 text-sm text-muted-foreground">Aucune mission pour ces filtres.</p>;
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
            <th className="px-3 py-2">Statut</th>
            <th className="px-3 py-2">Véhicule</th>
            <th className="px-3 py-2">Chauffeur</th>
            <th className="px-3 py-2">Points de collecte / dépôt</th>
            <th className="px-3 py-2">Étapes</th>
            <th className="px-3 py-2">Début planifié</th>
            <th className="px-3 py-2">Début réel</th>
            <th className="px-3 py-2">Fin réelle</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border last:border-0">
              <td className="px-3 py-2">{MISSION_STATUS_LABELS[row.status] ?? row.status}</td>
              <td className="px-3 py-2">{row.vehiclePlate ?? row.vehicleId ?? '—'}</td>
              <td className="px-3 py-2">{row.driverName ?? row.driverId ?? '—'}</td>
              <td className="px-3 py-2">{row.locations || '—'}</td>
              <td className="px-3 py-2">{row.stepCount}</td>
              <td className="px-3 py-2">{formatDate(row.plannedStart)}</td>
              <td className="px-3 py-2">{formatDate(row.actualStart)}</td>
              <td className="px-3 py-2">{formatDate(row.actualEnd)}</td>
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
    return <p className="p-4 text-sm text-muted-foreground">Aucun plein pour ces filtres.</p>;
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
            <th className="px-3 py-2">Date</th>
            <th className="px-3 py-2">Véhicule</th>
            <th className="px-3 py-2">Chauffeur</th>
            <th className="px-3 py-2">Litres</th>
            <th className="px-3 py-2">Coût</th>
            <th className="px-3 py-2">Odomètre</th>
            <th className="px-3 py-2">Carburant</th>
            <th className="px-3 py-2">Station</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border last:border-0">
              <td className="px-3 py-2">{formatDate(row.createdAt)}</td>
              <td className="px-3 py-2">{row.vehiclePlate ?? row.vehicleId ?? '—'}</td>
              <td className="px-3 py-2">{row.driverName ?? row.driverId ?? '—'}</td>
              <td className="px-3 py-2">{row.liters.toFixed(1)} L</td>
              <td className="px-3 py-2">{CURRENCY_FORMAT.format(row.totalCost)}</td>
              <td className="px-3 py-2">{row.odometer.toFixed(0)} km</td>
              <td className="px-3 py-2">{row.fuelType}</td>
              <td className="px-3 py-2">{row.stationName ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
