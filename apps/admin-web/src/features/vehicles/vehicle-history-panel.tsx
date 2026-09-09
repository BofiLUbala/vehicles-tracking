'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchVehicleHistory } from '@/features/vehicles/api';

export interface VehicleHistoryPanelProps {
  vehicleId: string;
  plateNumber: string;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('fr-FR');
  } catch {
    return iso;
  }
}

/** Panneau d'historique des affectations chauffeur pour un véhicule (`GET /vehicles/:id/history`). */
export function VehicleHistoryPanel({ vehicleId, plateNumber }: VehicleHistoryPanelProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['vehicles', vehicleId, 'history'],
    queryFn: () => fetchVehicleHistory(vehicleId),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Historique d&apos;affectation — {plateNumber}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading && <p className="p-4 text-sm text-muted-foreground">Chargement de l&apos;historique…</p>}
        {isError && <p className="p-4 text-sm text-destructive">Impossible de charger l&apos;historique.</p>}
        {data && data.length === 0 && <p className="p-4 text-sm text-muted-foreground">Aucune affectation enregistrée.</p>}
        {data && data.length > 0 && (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                  <th className="px-3 py-2">Chauffeur</th>
                  <th className="px-3 py-2">Début</th>
                  <th className="px-3 py-2">Fin</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item) => (
                  <tr key={item.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">
                      {item.driver ? `${item.driver.firstName} ${item.driver.lastName}` : item.driverId}
                    </td>
                    <td className="px-3 py-2">{formatDate(item.startedAt)}</td>
                    <td className="px-3 py-2">{item.endedAt ? formatDate(item.endedAt) : 'En cours'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
