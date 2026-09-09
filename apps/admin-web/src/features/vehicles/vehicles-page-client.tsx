'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AssignDriverDialog } from '@/features/vehicles/assign-driver-dialog';
import { assignDriverToVehicle, createVehicle, fetchVehicles, updateVehicle } from '@/features/vehicles/api';
import { VehicleFormDialog } from '@/features/vehicles/vehicle-form-dialog';
import { VehicleHistoryPanel } from '@/features/vehicles/vehicle-history-panel';
import { VehiclesFiltersBar } from '@/features/vehicles/vehicles-filters';
import { VehiclesTable } from '@/features/vehicles/vehicles-table';
import type { VehicleFormOutput } from '@/features/vehicles/schemas';
import type { VehicleDto, VehicleFilters } from '@/features/vehicles/types';
import { fetchDrivers } from '@/features/drivers/api';

export const VEHICLES_QUERY_KEY = ['vehicles', 'list'] as const;

function matchesFilters(vehicle: VehicleDto, filters: VehicleFilters): boolean {
  if (filters.status && vehicle.status !== filters.status) return false;
  if (filters.search) {
    const needle = filters.search.toLowerCase();
    const haystack = `${vehicle.plateNumber} ${vehicle.brand ?? ''} ${vehicle.model ?? ''}`.toLowerCase();
    if (!haystack.includes(needle)) return false;
  }
  return true;
}

export function VehiclesPageClient() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<VehicleFilters>({});

  const [formOpen, setFormOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<VehicleDto | null>(null);
  const [assignTarget, setAssignTarget] = useState<VehicleDto | null>(null);
  const [historyVehicle, setHistoryVehicle] = useState<VehicleDto | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: VEHICLES_QUERY_KEY,
    queryFn: fetchVehicles,
  });

  const { data: drivers } = useQuery({
    queryKey: ['drivers', 'list'],
    queryFn: fetchDrivers,
    enabled: assignTarget !== null,
  });

  const filteredVehicles = useMemo(() => (data ?? []).filter((v) => matchesFilters(v, filters)), [data, filters]);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: VEHICLES_QUERY_KEY });
  }

  const createMutation = useMutation({
    mutationFn: createVehicle,
    onSuccess: () => {
      toast.success('Véhicule créé');
      invalidate();
      setFormOpen(false);
    },
    onError: () => toast.error('Impossible de créer le véhicule'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: Partial<VehicleFormOutput> }) => updateVehicle(id, values),
    onSuccess: () => {
      toast.success('Véhicule mis à jour');
      invalidate();
      setFormOpen(false);
      setEditingVehicle(null);
    },
    onError: () => toast.error('Impossible de mettre à jour le véhicule'),
  });

  const assignMutation = useMutation({
    mutationFn: ({ vehicleId, driverId }: { vehicleId: string; driverId: string }) =>
      assignDriverToVehicle(vehicleId, driverId),
    onSuccess: () => {
      toast.success('Chauffeur affecté');
      invalidate();
      setAssignTarget(null);
    },
    onError: () => toast.error("Impossible d'affecter le chauffeur"),
  });

  async function handleSubmit(values: VehicleFormOutput) {
    const payload = { ...values, brand: values.brand || undefined, model: values.model || undefined };
    if (editingVehicle) {
      await updateMutation.mutateAsync({ id: editingVehicle.id, values: payload });
    } else {
      await createMutation.mutateAsync(payload as VehicleFormOutput & { plateNumber: string });
    }
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Véhicules</h1>
        <Button
          type="button"
          onClick={() => {
            setEditingVehicle(null);
            setFormOpen(true);
          }}
        >
          Nouveau véhicule
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <VehiclesFiltersBar filters={filters} onChange={setFilters} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading && <p className="p-4 text-sm text-muted-foreground">Chargement des véhicules…</p>}
          {isError && <p className="p-4 text-sm text-destructive">Impossible de charger les véhicules.</p>}
          {data && (
            <VehiclesTable
              vehicles={filteredVehicles}
              selectedVehicleId={historyVehicle?.id}
              onEdit={(vehicle) => {
                setEditingVehicle(vehicle);
                setFormOpen(true);
              }}
              onAssignDriver={setAssignTarget}
              onSelectHistory={(vehicle) =>
                setHistoryVehicle((prev) => (prev?.id === vehicle.id ? null : vehicle))
              }
            />
          )}
        </CardContent>
      </Card>

      {historyVehicle && <VehicleHistoryPanel vehicleId={historyVehicle.id} plateNumber={historyVehicle.plateNumber} />}

      <VehicleFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        vehicle={editingVehicle}
        onSubmit={handleSubmit}
        submitting={createMutation.isPending || updateMutation.isPending}
      />

      <AssignDriverDialog
        open={assignTarget !== null}
        onOpenChange={(open) => !open && setAssignTarget(null)}
        vehicle={assignTarget}
        drivers={drivers ?? []}
        submitting={assignMutation.isPending}
        onAssign={(driverId) => {
          if (assignTarget) assignMutation.mutate({ vehicleId: assignTarget.id, driverId });
        }}
      />
    </div>
  );
}
