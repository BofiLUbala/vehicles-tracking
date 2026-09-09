'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { AssignVehicleDialog } from '@/features/drivers/assign-vehicle-dialog';
import {
  assignVehicleToDriver,
  createDriver,
  fetchDrivers,
  removeDriver,
  revokeDriverDevice,
  updateDriver,
} from '@/features/drivers/api';
import { DriverFormDialog } from '@/features/drivers/driver-form-dialog';
import { DriversFiltersBar } from '@/features/drivers/drivers-filters';
import { DriversTable } from '@/features/drivers/drivers-table';
import { RevokeDeviceDialog } from '@/features/drivers/revoke-device-dialog';
import type { DriverFormValues } from '@/features/drivers/schemas';
import type { DriverDto, DriverFilters } from '@/features/drivers/types';
import { fetchVehicles } from '@/features/vehicles/api';

export const DRIVERS_QUERY_KEY = ['drivers', 'list'] as const;

function matchesFilters(driver: DriverDto, filters: DriverFilters): boolean {
  if (filters.status && driver.status !== filters.status) return false;
  if (filters.search) {
    const needle = filters.search.toLowerCase();
    const haystack = `${driver.firstName} ${driver.lastName} ${driver.phone}`.toLowerCase();
    if (!haystack.includes(needle)) return false;
  }
  return true;
}

export function DriversPageClient() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<DriverFilters>({});

  const [formOpen, setFormOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<DriverDto | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<DriverDto | null>(null);
  const [assignTarget, setAssignTarget] = useState<DriverDto | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<DriverDto | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: DRIVERS_QUERY_KEY,
    queryFn: fetchDrivers,
  });

  const { data: vehicles } = useQuery({
    queryKey: ['vehicles', 'list'],
    queryFn: fetchVehicles,
    enabled: assignTarget !== null,
  });

  const filteredDrivers = useMemo(() => (data ?? []).filter((d) => matchesFilters(d, filters)), [data, filters]);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: DRIVERS_QUERY_KEY });
  }

  const createMutation = useMutation({
    mutationFn: createDriver,
    onSuccess: () => {
      toast.success('Chauffeur créé');
      invalidate();
      setFormOpen(false);
    },
    onError: () => toast.error('Impossible de créer le chauffeur'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: Partial<DriverFormValues> }) => updateDriver(id, values),
    onSuccess: () => {
      toast.success('Chauffeur mis à jour');
      invalidate();
      setFormOpen(false);
      setEditingDriver(null);
    },
    onError: () => toast.error('Impossible de mettre à jour le chauffeur'),
  });

  const deleteMutation = useMutation({
    mutationFn: removeDriver,
    onSuccess: () => {
      toast.success('Chauffeur désactivé');
      invalidate();
      setDeleteTarget(null);
    },
    onError: () => toast.error('Impossible de désactiver le chauffeur'),
  });

  const assignMutation = useMutation({
    mutationFn: ({ driverId, vehicleId }: { driverId: string; vehicleId: string }) =>
      assignVehicleToDriver(driverId, vehicleId),
    onSuccess: () => {
      toast.success('Véhicule affecté');
      invalidate();
      setAssignTarget(null);
    },
    onError: () => toast.error("Impossible d'affecter le véhicule"),
  });

  const revokeMutation = useMutation({
    mutationFn: ({ driverId, deviceId }: { driverId: string; deviceId: string }) =>
      revokeDriverDevice(driverId, deviceId),
    onSuccess: () => {
      toast.success('Appareil révoqué');
      invalidate();
      setRevokeTarget(null);
    },
    onError: () => toast.error("Impossible de révoquer l'appareil"),
  });

  async function handleSubmit(values: DriverFormValues) {
    const payload = { ...values, licenseNumber: values.licenseNumber || undefined };
    if (editingDriver) {
      await updateMutation.mutateAsync({ id: editingDriver.id, values: payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Chauffeurs</h1>
        <Button
          type="button"
          onClick={() => {
            setEditingDriver(null);
            setFormOpen(true);
          }}
        >
          Nouveau chauffeur
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <DriversFiltersBar filters={filters} onChange={setFilters} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading && <p className="p-4 text-sm text-muted-foreground">Chargement des chauffeurs…</p>}
          {isError && <p className="p-4 text-sm text-destructive">Impossible de charger les chauffeurs.</p>}
          {data && (
            <DriversTable
              drivers={filteredDrivers}
              onEdit={(driver) => {
                setEditingDriver(driver);
                setFormOpen(true);
              }}
              onDelete={setDeleteTarget}
              onAssignVehicle={setAssignTarget}
              onRevokeDevice={setRevokeTarget}
            />
          )}
        </CardContent>
      </Card>

      <DriverFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        driver={editingDriver}
        onSubmit={handleSubmit}
        submitting={createMutation.isPending || updateMutation.isPending}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Désactiver ce chauffeur ?"
        description={
          deleteTarget ? `${deleteTarget.firstName} ${deleteTarget.lastName} sera désactivé (suppression réversible).` : undefined
        }
        confirmLabel="Désactiver"
        destructive
        submitting={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />

      <AssignVehicleDialog
        open={assignTarget !== null}
        onOpenChange={(open) => !open && setAssignTarget(null)}
        driver={assignTarget}
        vehicles={vehicles ?? []}
        submitting={assignMutation.isPending}
        onAssign={(vehicleId) => {
          if (assignTarget) assignMutation.mutate({ driverId: assignTarget.id, vehicleId });
        }}
      />

      <RevokeDeviceDialog
        open={revokeTarget !== null}
        onOpenChange={(open) => !open && setRevokeTarget(null)}
        driver={revokeTarget}
        submitting={revokeMutation.isPending}
        onRevoke={(deviceId) => {
          if (revokeTarget) revokeMutation.mutate({ driverId: revokeTarget.id, deviceId });
        }}
      />
    </div>
  );
}
