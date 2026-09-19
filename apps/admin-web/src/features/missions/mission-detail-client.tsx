'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Map as MapIcon, UserRound, CarFront, CalendarClock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { StatusBadge } from '@/components/status-badge';
import { LoadingSkeleton } from '@/components/empty-state';
import { missionTone } from '@/features/dashboard/tones';
import { fetchLocations } from '@/features/locations/api';
import { assignMission, cancelMission, fetchDrivers, fetchMission, fetchVehicles } from '@/features/missions/api';
import { MissionTraceMapClient } from '@/features/missions/mission-trace-map-client';
import { MISSION_STATUS_LABELS, MISSION_STEP_ACTION_LABELS } from '@/features/missions/status-labels';
import type { MissionStepStatus } from '@/features/missions/status-labels';
import { cn } from '@/lib/utils';

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

const STEP_STATUS_TONE: Record<MissionStepStatus, 'success' | 'info' | 'danger' | 'neutral'> = {
  VALIDATED: 'success',
  IN_PROGRESS: 'info',
  PENDING: 'neutral',
  SKIPPED: 'neutral',
  FAILED: 'danger',
};

const STEP_STATUS_LABELS: Record<MissionStepStatus, string> = {
  PENDING: 'En attente',
  IN_PROGRESS: 'En cours',
  VALIDATED: 'Validée',
  SKIPPED: 'Ignorée',
  FAILED: 'Échouée',
};

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
    return <LoadingSkeleton className="h-[70vh] p-6" />;
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
  const validatedSteps = sortedSteps.filter((s) => s.status === 'VALIDATED').length;

  return (
    <div className="flex flex-col gap-5 p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy text-white">
            <CalendarClock className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Mission #{mission.id.slice(0, 8).toUpperCase()}</h1>
            <p className="text-sm text-muted-foreground">Suivi et exécution de la tournée</p>
          </div>
        </div>
        <StatusBadge tone={missionTone(mission.status)} dot>
          {MISSION_STATUS_LABELS[mission.status] ?? mission.status}
        </StatusBadge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Informations</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <InfoTile icon={UserRound} label="Chauffeur" value={driver ? `${driver.firstName} ${driver.lastName}` : mission.driverId} />
          <InfoTile icon={CarFront} label="Véhicule" value={vehicle?.plateNumber ?? mission.vehicleId} />
          <div className="flex flex-col gap-1 rounded-xl bg-muted/40 p-4">
            <p className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">Avancement</p>
            <p className="text-lg font-bold tabular-nums leading-none text-foreground">
              {validatedSteps} / {sortedSteps.length} étapes
            </p>
          </div>
          <InfoTile label="Début planifié" value={formatDate(mission.plannedStart)} secondary />
          <InfoTile label="Fin planifiée" value={formatDate(mission.plannedEnd)} secondary />
          <InfoTile label="Début réel" value={formatDate(mission.actualStart)} secondary />
          <InfoTile label="Fin réelle" value={formatDate(mission.actualEnd)} secondary />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base font-semibold">Étapes</CardTitle>
          <Badge variant="outline">{sortedSteps.length} étape(s)</Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-2xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Ordre</th>
                  <th className="px-4 py-3">Lieu</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Heure planifiée</th>
                  <th className="px-4 py-3">Statut</th>
                </tr>
              </thead>
              <tbody>
                {sortedSteps.map((step) => (
                  <tr key={step.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                    <td className="px-4 py-3 tabular-nums">
                      <span
                        className={cn(
                          'flex h-6 w-6 items-center justify-center rounded-full text-2xs font-bold',
                          step.status === 'VALIDATED' ? 'bg-success text-white' : step.status === 'IN_PROGRESS' ? 'bg-warning text-white' : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {step.order}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">{locationsById[step.locationId]?.name ?? step.locationId}</td>
                    <td className="px-4 py-3 text-muted-foreground">{MISSION_STEP_ACTION_LABELS[step.actionType] ?? step.actionType}</td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">{formatDate(step.plannedAt)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={STEP_STATUS_TONE[step.status]} dot>
                        {STEP_STATUS_LABELS[step.status] ?? step.status}
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="overflow-hidden rounded-2xl border border-border shadow-card">
        <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <MapIcon className="h-4 w-4 text-primary" />
            Trajet réellement parcouru
          </p>
          <Button type="button" variant="outline" size="sm" onClick={() => setShowMap((v) => !v)}>
            {showMap ? 'Masquer la carte' : 'Afficher sur la carte'}
          </Button>
        </div>
        {showMap && (
          <div className="bg-background">
            <MissionTraceMapClient missionId={mission.id} steps={mission.steps} locationsById={locationsById} />
          </div>
        )}
        {!showMap && mission.steps.length >= 2 && (
          <div className="flex flex-wrap items-center gap-2 bg-card px-4 py-3 text-2xs text-muted-foreground">
            <span className="h-1.5 w-6 rounded-full bg-primary" />
            Trajet réellement parcouru
            <span className="mx-1 text-border">|</span>
            <span className="h-2.5 w-2.5 rounded-full border-2 border-warning" />
            Étapes de la mission
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setShowAssign((v) => !v)} disabled={showAssign}>
              Affecter
            </Button>
            <Button type="button" variant="destructive" onClick={() => setShowCancel((v) => !v)} disabled={!isCancellable || showCancel}>
              Annuler la mission
            </Button>
          </div>

          {showAssign && (
            <div className="grid gap-3 rounded-xl border border-border bg-muted/30 p-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
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
              <div className="flex flex-col gap-1.5">
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
                className="sm:col-span-2 sm:w-fit"
              >
                Confirmer l'affectation
              </Button>
            </div>
          )}

          {showCancel && (
            <div className="flex flex-wrap items-end gap-3 rounded-xl border border-danger/30 bg-danger/5 p-4">
              <div className="flex min-w-[16rem] flex-1 flex-col gap-1.5">
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

function InfoTile({ icon: Icon, label, value, secondary }: { icon?: typeof UserRound; label: string; value: string; secondary?: boolean }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-muted/40 p-4">
      <p className={cn('flex items-center gap-1.5 text-2xs font-medium uppercase tracking-wider text-muted-foreground')}>
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </p>
      <p className={cn('text-base font-bold leading-tight', secondary ? 'text-muted-foreground' : 'text-foreground')}>{value}</p>
    </div>
  );
}