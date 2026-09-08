'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FuelFiltersBar } from '@/features/fuel/fuel-filters';
import { FuelTable } from '@/features/fuel/fuel-table';
import { VehicleFuelPanel } from '@/features/fuel/vehicle-fuel-panel';
import { fetchFuelRecords } from '@/features/fuel/api';
import type { FuelRecordFilters } from '@/features/fuel/types';

export function FuelPageClient() {
  const [filters, setFilters] = useState<FuelRecordFilters>({});
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['fuel', 'records', filters],
    queryFn: () => fetchFuelRecords(filters),
  });

  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="text-xl font-semibold">Carburant</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <FuelFiltersBar filters={filters} onChange={setFilters} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading && <p className="p-4 text-sm text-muted-foreground">Chargement des pleins…</p>}
          {isError && <p className="p-4 text-sm text-destructive">Impossible de charger les pleins.</p>}
          {data && (
            <FuelTable records={data} onSelectVehicle={setSelectedVehicleId} selectedVehicleId={selectedVehicleId} />
          )}
        </CardContent>
      </Card>

      {selectedVehicleId && <VehicleFuelPanel vehicleId={selectedVehicleId} />}
    </div>
  );
}
