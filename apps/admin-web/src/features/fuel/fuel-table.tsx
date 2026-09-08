'use client';

import { Badge } from '@/components/ui/badge';
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
            <th className="px-3 py-2">Consommation</th>
            <th className="px-3 py-2">Anomalie</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.id} className="border-b border-border last:border-0">
              <td className="px-3 py-2">{formatDate(record.createdAt)}</td>
              <td className="px-3 py-2">
                {onSelectVehicle ? (
                  <button
                    type="button"
                    className={
                      'underline decoration-dotted ' +
                      (selectedVehicleId === record.vehicleId ? 'font-semibold text-primary' : '')
                    }
                    onClick={() => onSelectVehicle(record.vehicleId)}
                  >
                    {record.vehicle?.plateNumber ?? record.vehicleId}
                  </button>
                ) : (
                  record.vehicle?.plateNumber ?? record.vehicleId
                )}
              </td>
              <td className="px-3 py-2">
                {record.driver ? `${record.driver.firstName} ${record.driver.lastName}` : record.driverId}
              </td>
              <td className="px-3 py-2">{record.liters.toFixed(1)} L</td>
              <td className="px-3 py-2">{CURRENCY_FORMAT.format(record.totalCost)}</td>
              <td className="px-3 py-2">{record.odometer.toFixed(0)} km</td>
              <td className="px-3 py-2">
                {record.consumptionL100km != null ? `${record.consumptionL100km.toFixed(1)} L/100km` : '—'}
              </td>
              <td className="px-3 py-2">
                {record.hasAnomaly && <Badge variant="destructive">Anomalie</Badge>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
