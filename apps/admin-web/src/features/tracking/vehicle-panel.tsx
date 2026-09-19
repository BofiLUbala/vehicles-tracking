'use client';

import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowRight, CarFront, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConnectionStatus } from '@/components/connection-status';
import { fetchMissionTrace } from '@/features/tracking/api';
import { fetchMission } from '@/features/missions/api';
import { MISSION_STATUS_LABELS } from '@/features/missions/status-labels';
import { statusToLabel } from '@/features/tracking/status';
import { useMissionStatusLabel } from '@/features/tracking/mission-status';
import { MissionProgress } from '@/components/mission-progress';
import type { LiveVehicle, MissionTraceResponse, VehiclePositionUpdatedEvent } from '@/features/tracking/types';

interface VehiclePanelProps {
  vehicle: LiveVehicle;
  traceVisible: boolean;
  connected: boolean;
  onToggleTrace: () => void;
  onClose: () => void;
  onMissionTraceLoaded?: (trace: MissionTraceResponse) => void;
  onLivePoint?: (point: { latitude: number; longitude: number; recordedAt: string }) => void;
  socket?: import('socket.io-client').Socket | null;
  trace?: MissionTraceResponse | null;
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatDuration(startedAt: string, endedAt?: string | null): string {
  const start = new Date(startedAt).getTime();
  const end = endedAt ? new Date(endedAt).getTime() : Date.now();
  const seconds = Math.floor((end - start) / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours} h ${minutes} min`;
  return `${minutes} min`;
}

function lastUpdateLabel(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return `il y a ${Math.max(1, Math.floor(diff / 1000))} s`;
  if (diff < 3_600_000) return `il y a ${Math.floor(diff / 60_000)} min`;
  return `il y a ${Math.floor(diff / 3_600_000)} h`;
}

export function VehiclePanel({ vehicle, traceVisible, connected, onToggleTrace, onClose, onMissionTraceLoaded, onLivePoint, socket, trace }: VehiclePanelProps) {
  const traceRef = useRef<MissionTraceResponse | null>(null);
  const missionStatusLabel = useMissionStatusLabel(trace?.status ?? null);

  const missionQuery = useQuery({
    queryKey: ['tracking', 'missions', vehicle.activeMissionId, 'trace'],
    queryFn: () => fetchMissionTrace(vehicle.activeMissionId!),
    enabled: traceVisible && !!vehicle.activeMissionId,
  });

  // Détails complets de la mission (statut + étapes) — chargés indépendamment du toggle trace pour
  // alimenter l'avancement réel même quand le tracé n'est pas affiché.
  const missionDetailQuery = useQuery({
    queryKey: ['missions', vehicle.activeMissionId],
    queryFn: () => fetchMission(vehicle.activeMissionId!),
    enabled: !!vehicle.activeMissionId,
  });

  const missionSteps = missionDetailQuery.data?.steps ?? [];
  const completedSteps = missionSteps.filter((step) => step.status === 'VALIDATED' || step.status === 'SKIPPED').length;
  const missionDetailStatusLabel = missionDetailQuery.data
    ? MISSION_STATUS_LABELS[missionDetailQuery.data.status]
    : null;

  useEffect(() => {
    if (missionQuery.data) {
      traceRef.current = missionQuery.data;
      onMissionTraceLoaded?.(missionQuery.data);
    }
  }, [missionQuery.data, onMissionTraceLoaded]);

  useEffect(() => {
    if (!socket || !vehicle.activeMissionId || !traceVisible) return;

    const handlePosition = (event: VehiclePositionUpdatedEvent) => {
      if (event.vehicleId === vehicle.id && event.missionId === vehicle.activeMissionId) {
        onLivePoint?.({ latitude: event.latitude, longitude: event.longitude, recordedAt: event.recordedAt });
      }
    };

    socket.on('vehicle.position.updated', handlePosition);
    return () => {
      socket.off('vehicle.position.updated', handlePosition);
    };
  }, [socket, vehicle.id, vehicle.activeMissionId, traceVisible, onLivePoint]);

  const activeTrace = missionQuery.data ?? trace;
  const shouldShowTrace = traceVisible && !!vehicle.activeMissionId;

  return (
    <div className="flex max-h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <div className="flex items-start justify-between gap-3 border-b border-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy text-white">
            <CarFront className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Véhicule : {vehicle.plate}</p>
            <p className="text-2xs text-muted-foreground">ID {vehicle.id.slice(0, 8)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ConnectionStatus state={connected ? 'live' : 'offline'} />
          <button
            type="button"
            aria-label="Fermer le panneau"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
          <div className="rounded-xl bg-muted/50 p-3.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Statut</p>
              <span className="font-semibold text-foreground">{statusToLabel(vehicle.status)}</span>
            </div>
          </div>

          {vehicle.activeMissionId ? (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5">
              <p className="text-xs font-semibold text-primary">Mission active</p>
              <p className="mt-1 text-sm font-bold text-foreground">{vehicle.activeMissionId.slice(0, 8).toUpperCase()}</p>
              <div className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
                <p>
                  Statut :{' '}
                  <span className="font-semibold text-foreground">
                    {missionDetailStatusLabel ?? missionStatusLabel}
                  </span>
                </p>
                <p>
                  Début :{' '}
                  <span className="font-semibold tabular-nums text-foreground">
                    {activeTrace?.startedAt ? new Date(activeTrace.startedAt).toLocaleTimeString('fr-FR') : '—'}
                  </span>
                </p>
                <p>
                  Dernière MAJ :{' '}
                  <span className="font-semibold tabular-nums text-foreground">
                    {activeTrace?.lastPositionAt ? lastUpdateLabel(activeTrace.lastPositionAt) : '—'}
                  </span>
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-muted/50 p-3.5 text-xs text-muted-foreground">Aucune mission active</div>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <StatTile label="Vitesse" value={vehicle.speedKmh != null ? Math.round(vehicle.speedKmh) : '—'} unit="km/h" />
            <StatTile
              label="Précision GPS"
              value={vehicle.accuracy != null ? Math.round(vehicle.accuracy) : '—'}
              unit="m"
            />
            <StatTile
              label="Dernière position"
              value={vehicle.lastUpdateAt ? lastUpdateLabel(vehicle.lastUpdateAt).replace('il y a ', '') : '—'}
              unit=""
            />
            <StatTile
              label="Mission"
              value={vehicle.activeMissionId ? missionDetailStatusLabel ?? '…' : '—'}
              unit=""
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                Trajet réellement parcouru
              </p>
              {vehicle.activeMissionId && (
                <button
                  type="button"
                  onClick={onToggleTrace}
                  className="text-2xs font-semibold text-primary hover:text-primary/80"
                >
                  {traceVisible ? 'Masquer' : 'Afficher'}
                </button>
              )}
            </div>

            {activeTrace ? (
              <div className="grid grid-cols-3 gap-2.5">
                <StatTile label="Distance" value={formatDistance(activeTrace.totalDistanceMeters)} unit="" />
                <StatTile
                  label="Durée"
                  value={activeTrace.startedAt ? formatDuration(activeTrace.startedAt) : '—'}
                  unit=""
                />
                <StatTile
                  label="Étapes"
                  value={missionSteps.length > 0 ? `${completedSteps}/${missionSteps.length}` : '—'}
                  unit=""
                />
              </div>
            ) : (
              <p className="rounded-lg bg-muted/40 px-3 py-2 text-2xs text-muted-foreground">
                Aucune trace affichée. Activez l&apos;affichage du trajet pour un véhicule en mission active.
              </p>
            )}

            {shouldShowTrace && missionQuery.isLoading && (
              <p className="mt-2 text-2xs text-muted-foreground">Chargement de la trace…</p>
            )}
            {shouldShowTrace && missionQuery.isError && (
              <p className="mt-2 text-2xs text-danger">Impossible de charger la trace.</p>
            )}
          </div>

          {vehicle.activeMissionId && (
            <div className="rounded-xl border border-border bg-card p-3.5">
              <MissionProgress
                label="Avancement de la mission"
                value={completedSteps}
                total={missionSteps.length}
              />
              {missionDetailQuery.isError && (
                <p className="mt-2 text-2xs text-danger">Impossible de charger les étapes de la mission.</p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border p-4">
        {vehicle.activeMissionId ? (
          <Button asChild className="w-full gap-2">
            <Link href={`/missions/${vehicle.activeMissionId}`}>
              Voir les détails de la mission
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        ) : (
          <Button variant="outline" className="w-full gap-2" onClick={onToggleTrace}>
            <ExternalLink className="h-4 w-4" />
            {traceVisible ? 'Masquer la trace' : 'Voir la trace'}
          </Button>
        )}
      </div>
    </div>
  );
}

function StatTile({ label, value, unit }: { label: string; value: string | number; unit: string }) {
  return (
    <div className="flex flex-col rounded-xl bg-muted/40 p-3">
      <p className="text-2xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-lg font-bold tabular-nums leading-none text-foreground">
        {value}
        {unit && <span className="ml-0.5 text-2xs font-medium text-muted-foreground">{unit}</span>}
      </p>
    </div>
  );
}