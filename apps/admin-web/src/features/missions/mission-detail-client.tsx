'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { fetchLocations } from '@/features/locations/api';
import { assignMission, cancelMission, fetchDrivers, fetchMission, fetchVehicles } from '@/features/missions/api';
import { MissionTraceMapClient } from '@/features/missions/mission-trace-map-client';
import {
  MISSION_STATUS_BADGE_VARIANT,
  MISSION_STATUS_LABELS,
  MISSION_STEP_ACTION_LABELS,
  MISSION_STEP_STATUS_LABELS,
} from '@/features/missions/status-labels';

export interface MissionDetailClientProps {
  missionId: string;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('fr-FR');
  } catch {
    return iso;
  }
}

export function MissionDetailClient({ missionId }: MissionDetailClientProps) {
  const queryClient = useQueryClient();
  const [showMap, setShowMap] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [assignDriverId, setAssignDriverId] = useState('');
  const [assignVehicleId, setAssignVehicleId] = useState('');
  const [cancelReason, setCancelReason] = useState('');

  const missionQuery = useQuery({ queryKey: ['missions', missionId], queryFn: () => fetchMission(missionId) });
  const locationsQuery = useQuery({ queryKey: ['locations'], queryFn: fetchLocations });
  const driversQuery = useQuery({ queryKey: ['missions', 'drivers'], queryFn: fetchDrivers });
  const vehiclesQuery = useQuery({ queryKey: ['missions', 'vehicles'], queryFn: fetchVehicles });

  const assignMutation = useMutation({
    mutationFn: () => assignMission(missionId, { driverId: assignDriverId, vehicleId: assignVehicleId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missions', missionId] });
      queryClient.invalidateQueries({ queryKey: ['missions'] });
      toast.success('Mission affectée.');
      setShowAssign(false);
    },
    onError: () => toast.error("Impossible d'affecter la mission."),
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelMission(missionId, { reason: cancelReason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missions', missionId] });
      queryClient.invalidateQueries({ queryKey: ['missions'] });
      toast.success('Mission annulée.');
      setShowCancel(false);
      setCancelReason('');
    },
    onError: () => toast.error("Impossible d'annuler la mission."),
  });

  if (missionQuery.isLoading) {
    return <p className="p-6 text-sm text-muted-foreground">Chargement de la mission…</p>;
  }
  if (missionQuery.isError || !missionQuery.data) {
    return <p className="p-6 text-sm text-destructive">Impossible de charger cette mission.</p>;
  }

  const mission = missionQuery.data;
  const locationsById = Object.fromEntries((locationsQuery.data ?? []).map((l) => [l.id, l]));
  const driver = driversQuery.data?.find((d) => d.id === mission.driverId);
  const vehicle = vehiclesQuery.data?.find((v) => v.id === mission.vehicleId);
  const sortedSteps = [...mission.steps].sort((a, b) => a.order - b.order);

  const isCancellable = !['COMPLETED', 'CANCELLED', 'NOT_COMPLETED'].includes(mission.status);

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Mission</h1>
        <Badge variant={MISSION_STATUS_BADGE_VARIANT[mission.status] ?? 'outline'}>
          {MISSION_STATUS_LABELS[mission.status] ?? mission.status}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Informations</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <p>
            <span className="text-muted-foreground">Chauffeur : </span>
            {driver ? `${driver.firstName} ${driver.lastName}` : mission.driverId}
          </p>
          <p>
            <span className="text-muted-foreground">Véhicule : </span>
            {vehicle?.plateNumber ?? mission.vehicleId}
          </p>
          <p>
            <span className="text-muted-foreground">Début planifié : </span>
            {formatDate(mission.plannedStart)}
          </p>
          <p>
            <span className="text-muted-foreground">Fin planifiée : </span>
            {formatDate(mission.plannedEnd)}
          </p>
          <p>
            <span className="text-muted-foreground">Début réel : </span>
            {formatDate(mission.actualStart)}
          </p>
          <p>
            <span className="text-muted-foreground">Fin réelle : </span>
            {formatDate(mission.actualEnd)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Étapes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                  <th className="px-3 py-2">Ordre</th>
                  <th className="px-3 py-2">Lieu</th>
                  <th className="px-3 py-2">Action</th>
                  <th className="px-3 py-2">Heure planifiée</th>
                  <th className="px-3 py-2">Statut</th>
                </tr>
              </thead>
              <tbody>
                {sortedSteps.map((step) => (
                  <tr key={step.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">{step.order}</td>
                    <td className="px-3 py-2">{locationsById[step.locationId]?.name ?? step.locationId}</td>
                    <td className="px-3 py-2">{MISSION_STEP_ACTION_LABELS[step.actionType] ?? step.actionType}</td>
                    <td className="px-3 py-2">{formatDate(step.plannedAt)}</td>
                    <td className="px-3 py-2">{MISSION_STEP_STATUS_LABELS[step.status] ?? step.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div>
        <Button type="button" variant="outline" onClick={() => setShowMap((v) => !v)}>
          {showMap ? 'Masquer la carte' : 'Voir sur la carte'}
        </Button>
        {showMap && (
          <div className="mt-3">
            <MissionTraceMapClient vehicleId={mission.vehicleId} steps={mission.steps} locationsById={locationsById} />
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setShowAssign((v) => !v)}>
              Affecter
            </Button>
            <Button type="button" variant="destructive" onClick={() => setShowCancel((v) => !v)} disabled={!isCancellable}>
              Annuler la mission
            </Button>
          </div>

          {showAssign && (
            <div className="flex flex-wrap items-end gap-3 rounded-md border border-border p-3">
              <div className="flex flex-col gap-1">
                <Label htmlFor="assign-driver">Chauffeur</Label>
                <Select id="assign-driver" value={assignDriverId} onChange={(e) => setAssignDriverId(e.target.value)}>
                  <option value="">Sélectionner…</option>
                  {driversQuery.data?.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.firstName} {d.lastName}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="assign-vehicle">Véhicule</Label>
                <Select id="assign-vehicle" value={assignVehicleId} onChange={(e) => setAssignVehicleId(e.target.value)}>
                  <option value="">Sélectionner…</option>
                  {vehiclesQuery.data?.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.plateNumber}
                    </option>
                  ))}
                </Select>
              </div>
              <Button
                type="button"
                onClick={() => assignMutation.mutate()}
                disabled={!assignDriverId || !assignVehicleId || assignMutation.isPending}
              >
                Confirmer l'affectation
              </Button>
            </div>
          )}

          {showCancel && (
            <div className="flex flex-wrap items-end gap-3 rounded-md border border-border p-3">
              <div className="flex flex-1 flex-col gap-1">
                <Label htmlFor="cancel-reason">Raison de l'annulation</Label>
                <Input
                  id="cancel-reason"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Motif (obligatoire, min. 3 caractères)"
                />
              </div>
              <Button
                type="button"
                variant="destructive"
                onClick={() => cancelMutation.mutate()}
                disabled={cancelReason.trim().length < 3 || cancelMutation.isPending}
              >
                Confirmer l'annulation
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
