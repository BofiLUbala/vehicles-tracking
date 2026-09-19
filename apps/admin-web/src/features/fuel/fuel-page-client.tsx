'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { ErrorState, LoadingSkeleton } from '@/components/empty-state';
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
    <div className="flex flex-col gap-5 p-6 lg:p-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Carburant</h1>
        <p className="text-sm text-muted-foreground">
          Suivez les pleins, les coûts et la consommation de votre flotte.
        </p>
      </div>

      <FuelFiltersBar filters={filters} onChange={setFilters} />

      <Card>
        <CardContent className="p-0">
          {isLoading && <LoadingSkeleton className="h-64" />}
          {isError && <ErrorState message="Impossible de charger les pleins." />}
          {data && (
            <FuelTable records={data} onSelectVehicle={setSelectedVehicleId} selectedVehicleId={selectedVehicleId} />
          )}
        </CardContent>
      </Card>

      {selectedVehicleId && <VehicleFuelPanel vehicleId={selectedVehicleId} />}
    </div>
  );
}
