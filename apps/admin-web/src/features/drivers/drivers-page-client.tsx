'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ErrorState, LoadingSkeleton } from '@/components/empty-state';
import { AssignVehicleDialog } from '@/features/drivers/assign-vehicle-dialog';
import { DriverDialog } from '@/features/drivers/link-driver-dialog';
import {
  assignVehicleToDriver,
  createDriver,
  fetchDrivers,
  fetchLinkableDrivers,
  linkDriver,
  inviteDriver,
  removeDriver,
  resendDriverInvitation,
  revokeDriverDevice,
  updateDriver,
} from '@/features/drivers/api';
import { DriversFiltersBar } from '@/features/drivers/drivers-filters';
import { DriversTable } from '@/features/drivers/drivers-table';
import { RevokeDeviceDialog } from '@/features/drivers/revoke-device-dialog';
import type { DriverDto, DriverFilters, InviteDriverInput, LinkDriverInput } from '@/features/drivers/types';
import { fetchVehicles } from '@/features/vehicles/api';
import { connectTrackingSocket } from '@/features/tracking/socket';
import { apiErrorMessage, fetchAccessToken } from '@/lib/api-client';
import { decodeJwt } from 'jose';

export const DRIVERS_QUERY_KEY = ['drivers', 'list'] as const;
export const LINKABLE_DRIVERS_QUERY_KEY = ['drivers', 'linkable'] as const;

function matchesFilters(driver: DriverDto, filters: DriverFilters): boolean {
  if (filters.status && driver.status !== filters.status) return false;
  if (filters.search) {
    const needle = filters.search.toLowerCase();
    const haystack = `${driver.firstName} ${driver.lastName} ${driver.phone} ${driver.email ?? ''}`.toLowerCase();
    if (!haystack.includes(needle)) return false;
  }
  return true;
}

export function DriversPageClient() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<DriverFilters>({});

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<DriverDto | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<DriverDto | null>(null);
  const [assignTarget, setAssignTarget] = useState<DriverDto | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<DriverDto | null>(null);

  const { data, isLoading, isError, refetch: refetchDrivers } = useQuery({
    queryKey: DRIVERS_QUERY_KEY,
    queryFn: fetchDrivers,
  });

  const { data: linkableDrivers, isLoading: linkableLoading, refetch: refetchLinkable } = useQuery({
    queryKey: LINKABLE_DRIVERS_QUERY_KEY,
    queryFn: fetchLinkableDrivers,
    enabled: dialogOpen && !editingDriver,
  });

  const { data: vehicles } = useQuery({
    queryKey: ['vehicles', 'list'],
    queryFn: fetchVehicles,
    enabled: assignTarget !== null,
  });

  // Realtime socket for driver events
  const socketRef = useRef<ReturnType<typeof connectTrackingSocket> | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function setupSocket() {
      try {
        const token = await fetchAccessToken();
        if (!token || cancelled) return;
        const claims = decodeJwt(token) as { organizationId?: string };
        if (!claims.organizationId) return;

        const socket = connectTrackingSocket(token, claims.organizationId);
        socketRef.current = socket;
        if (!cancelled) setSocketConnected(true);

        socket.on('connect', () => setSocketConnected(true));
        socket.on('disconnect', () => setSocketConnected(false));
        socket.on('connect_error', () => setSocketConnected(false));
        socket.on('driver.registered', () => {
          queryClient.invalidateQueries({ queryKey: DRIVERS_QUERY_KEY });
          queryClient.invalidateQueries({ queryKey: LINKABLE_DRIVERS_QUERY_KEY });
        });
        socket.on('driver.changed', () => {
          queryClient.invalidateQueries({ queryKey: DRIVERS_QUERY_KEY });
          queryClient.invalidateQueries({ queryKey: LINKABLE_DRIVERS_QUERY_KEY });
        });
      } catch {
        // Ignore socket setup errors
      }
    }

    setupSocket();

    return () => {
      cancelled = true;
      socketRef.current?.off('driver.registered');
      socketRef.current?.off('driver.changed');
      socketRef.current?.disconnect();
      socketRef.current = null;
      setSocketConnected(false);
    };
  }, [queryClient]);

  // Refetch on window focus (in addition to react-query default)
  useEffect(() => {
    function onFocus() {
      refetchDrivers();
    }
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refetchDrivers]);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: DRIVERS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: LINKABLE_DRIVERS_QUERY_KEY });
  }

  const createMutation = useMutation({
    mutationFn: createDriver,
    onSuccess: () => {
      toast.success('Chauffeur créé');
      invalidate();
      setDialogOpen(false);
    },
    onError: () => toast.error('Impossible de créer le chauffeur'),
  });

  const inviteMutation = useMutation({
    mutationFn: inviteDriver,
    onSuccess: () => {
      toast.success('Chauffeur ajouté. Invitation envoyée si une adresse e-mail a été fournie.');
      invalidate();
      setDialogOpen(false);
    },
    onError: (err) => {
      invalidate();
      toast.error(apiErrorMessage(err, 'Impossible d\'envoyer l\'invitation'));
    },
  });

  const linkMutation = useMutation({
    mutationFn: linkDriver,
    onSuccess: () => {
      toast.success('Compte chauffeur lié');
      invalidate();
      setDialogOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Impossible de lier le compte chauffeur'),
  });

  const resendInvitationMutation = useMutation({
    mutationFn: resendDriverInvitation,
    onSuccess: () => toast.success('Invitation envoyée'),
    onError: (err) => toast.error(apiErrorMessage(err, "Impossible d'envoyer l'invitation")),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: Partial<Parameters<typeof updateDriver>[1]> }) => updateDriver(id, values),
    onSuccess: () => {
      toast.success('Chauffeur mis à jour');
      invalidate();
      setDialogOpen(false);
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

  const filteredDrivers = data?.filter((d) => matchesFilters(d, filters)) ?? [];

  return (
    <div className="flex flex-col gap-5 p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Chauffeurs</h1>
          <p className="text-sm text-muted-foreground">
            Gérez les chauffeurs de votre flotte, leurs affectations et leurs appareils.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => {
            setEditingDriver(null);
            setDialogOpen(true);
          }}
        >
          Ajouter un chauffeur
        </Button>
      </div>

      <DriversFiltersBar filters={filters} onChange={setFilters} />

      <Card>
        <CardContent className="p-0">
          {isLoading && <LoadingSkeleton className="h-64" />}
          {isError && <ErrorState message="Impossible de charger les chauffeurs." />}
          {data && (
            <DriversTable
              drivers={filteredDrivers}
              onEdit={(driver) => {
                setEditingDriver(driver);
                setDialogOpen(true);
              }}
              onDelete={setDeleteTarget}
              onAssignVehicle={setAssignTarget}
              onRevokeDevice={setRevokeTarget}
              onResendInvitation={(driver) => resendInvitationMutation.mutate(driver.id)}
            />
          )}
        </CardContent>
      </Card>

      <DriverDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        driver={editingDriver}
        linkable={linkableDrivers ?? []}
        existingDrivers={data ?? []}
        loadingLinkable={dialogOpen && !editingDriver && linkableLoading}
        onLink={linkMutation.mutateAsync}
        onCreate={inviteMutation.mutateAsync}
        onUpdate={(id, values) => updateMutation.mutateAsync({ id, values })}
        submitting={createMutation.isPending || inviteMutation.isPending || linkMutation.isPending || updateMutation.isPending}
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
