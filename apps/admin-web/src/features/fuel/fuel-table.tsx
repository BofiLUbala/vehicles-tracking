'use client';

import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/empty-state';
import { StatusBadge } from '@/components/status-badge';
import type { FuelRecordDto } from '@/features/fuel/types';

export interface FuelTableProps {
  records: FuelRecordDto[];
  onSelectVehicle?: (vehicleId: string) => void;
  selectedVehicleId?: string | null;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('fr-FR');
  } catch {
    return iso;
  }
}

const CURRENCY_FORMAT = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

export function FuelTable({ records, onSelectVehicle, selectedVehicleId }: FuelTableProps) {
  if (records.length === 0) {
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
            <th className="px-4 py-3 text-right">Consommation</th>
            <th className="px-4 py-3">Anomalie</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.id} className="border-b border-border transition-colors last:border-0 hover:bg-muted/40">
              <td className="px-4 py-3 tabular-nums text-muted-foreground">{formatDate(record.createdAt)}</td>
              <td className="px-4 py-3">
                {onSelectVehicle ? (
                  <button
                    type="button"
                    className={cn(
                      'font-semibold transition-colors',
                      selectedVehicleId === record.vehicleId
                        ? 'text-primary underline'
                        : 'text-foreground hover:text-primary/80',
                    )}
                    onClick={() => onSelectVehicle(record.vehicleId)}
                  >
                    {record.vehicle?.plateNumber ?? record.vehicleId}
                  </button>
                ) : (
                  <span className="font-medium text-foreground">{record.vehicle?.plateNumber ?? record.vehicleId}</span>
                )}
              </td>
              <td className="px-4 py-3 font-medium text-foreground">
                {record.driver ? `${record.driver.firstName} ${record.driver.lastName}` : record.driverId}
              </td>
              <td className="px-4 py-3 text-right font-bold tabular-nums">{record.liters.toFixed(1)} L</td>
              <td className="px-4 py-3 text-right font-bold tabular-nums">{CURRENCY_FORMAT.format(record.totalCost)}</td>
              <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{record.odometer.toFixed(0)} km</td>
              <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                {record.consumptionL100km != null ? `${record.consumptionL100km.toFixed(1)} L/100km` : '—'}
              </td>
              <td className="px-4 py-3">
                {record.hasAnomaly && (
                  <StatusBadge tone="danger" dot>
                    Anomalie
                  </StatusBadge>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}