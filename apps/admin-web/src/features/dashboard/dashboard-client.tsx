'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Car, ClipboardList, UserRound, ShieldAlert, Droplets, ArrowRight } from 'lucide-react';
import { MetricCard } from '@/components/metric-card';
import { StatusBadge } from '@/components/status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/empty-state';
import { fetchLiveVehicles } from '@/features/tracking/api';
import { fetchMissions } from '@/features/missions/api';
import { fetchDrivers } from '@/features/drivers/api';
import { fetchAlerts } from '@/features/alerts/api';
import { fetchVehicles } from '@/features/vehicles/api';
import { fetchFuelRecords } from '@/features/fuel/api';
import { MISSION_STATUS_LABELS } from '@/features/missions/status-labels';
import { FleetOverviewMap } from '@/features/dashboard/fleet-overview-map';
import { FleetBreakdown } from '@/features/dashboard/fleet-breakdown';
import { missionTone, alertTone } from '@/features/dashboard/tones';
import type { VehicleTrackingStatus } from '@/features/tracking/types';
import type { MissionStatus } from '@/features/missions/status-labels';
import type { AlertDto } from '@/features/alerts/types';

const ALERT_TYPE_LABELS: Record<string, string> = {
  SPEEDING: 'Excès de vitesse',
  ROUTE_DEVIATION: 'Déviation d’itinéraire',
  UNAUTHORIZED_STOP: 'Arrêt non autorisé',
  MOCK_GPS: 'GPS simulé',
  MISSED_STEP: 'Étape manquée',
  LATE_ARRIVAL: 'Retard',
  FUEL_ANOMALY: 'Anomalie carburant',
  DEVICE_OFFLINE: 'Appareil hors ligne',
  OTHER: 'Autre',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'à l’instant';
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  return `il y a ${hours} h`;
}

export function DashboardClient() {
  const vehiclesQuery = useQuery({ queryKey: ['dashboard', 'vehicles'], queryFn: fetchVehicles });
  const liveQuery = useQuery({ queryKey: ['dashboard', 'live'], queryFn: fetchLiveVehicles });
  const missionsQuery = useQuery({ queryKey: ['dashboard', 'missions'], queryFn: () => fetchMissions() });
  const driversQuery = useQuery({ queryKey: ['dashboard', 'drivers'], queryFn: fetchDrivers });
  const alertsQuery = useQuery({ queryKey: ['dashboard', 'alerts'], queryFn: () => fetchAlerts({ status: 'NEW' }) });
  const fuelQuery = useQuery({ queryKey: ['dashboard', 'fuel'], queryFn: () => fetchFuelRecords({}) });

  const liveVehicles = liveQuery.data ?? [];
  const activeMissions = useMemo(
    () => (missionsQuery.data ?? []).filter((m) => m.status === 'STARTED' || m.status === 'IN_PROGRESS'),
    [missionsQuery.data],
  );
  const activeDrivers = (driversQuery.data ?? []).filter((d) => d.status === 'ACTIVE').length;
  const openAlerts = alertsQuery.data ?? [];

  const fuelTotals = useMemo(() => {
    return (fuelQuery.data ?? []).reduce(
      (acc, r) => ({ liters: acc.liters + r.liters, cost: acc.cost + r.totalCost }),
      { liters: 0, cost: 0 },
    );
  }, [fuelQuery.data]);

  const fleetBreakdown = useMemo(() => {
    const counts: Record<VehicleTrackingStatus, number> = {
      MOVING: 0,
      ON_MISSION: 0,
      STOPPED: 0,
      OFFLINE: 0,
      SUSPICIOUS: 0,
    };
    for (const v of liveVehicles) counts[v.status] += 1;
    return counts;
  }, [liveVehicles]);

  const recentMissions = useMemo(
    () => [...(missionsQuery.data ?? [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5),
    [missionsQuery.data],
  );

  const isLoading = liveQuery.isLoading && missionsQuery.isLoading && driversQuery.isLoading && alertsQuery.isLoading;

  if (isLoading) return <LoadingSkeleton className="h-full" />;

  return (
    <div className="flex flex-col gap-5 p-6 lg:p-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Tableau de bord</h1>
        <p className="text-sm text-muted-foreground">Vue d’ensemble opérationnelle de votre flotte en temps réel.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Véhicules actifs"
          value={liveVehicles.length}
          icon={Car}
          accent="primary"
          hint={`${fleetBreakdown.MOVING} en mouvement`}
          href="/tracking"
        />
        <MetricCard
          label="Missions en cours"
          value={activeMissions.length}
          icon={ClipboardList}
          accent="success"
          hint="STARTED / IN_PROGRESS"
          href="/missions"
        />
        <MetricCard
          label="Chauffeurs actifs"
          value={activeDrivers}
          icon={UserRound}
          accent="navy"
          hint="comptes actifs"
          href="/drivers"
        />
        <MetricCard
          label="Alertes ouvertes"
          value={openAlerts.length}
          icon={ShieldAlert}
          accent="danger"
          hint={openAlerts.length > 0 ? `${openAlerts.filter((a) => a.level === 'HIGH' || a.level === 'CRITICAL').length} critiques` : undefined}
          href="/alerts"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2 overflow-hidden">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Vue temps réel</CardTitle>
            <Link
              href="/tracking"
              className="inline-flex items-center gap-1 text-2xs font-semibold text-primary hover:text-primary/80"
            >
              Suivi complet <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-[26rem] overflow-hidden rounded-xl border border-border">
              <FleetOverviewMap vehicles={liveVehicles} />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>État de la flotte</CardTitle>
              <Link href="/tracking" className="text-2xs font-semibold text-primary hover:text-primary/80">
                Détail
              </Link>
            </CardHeader>
            <CardContent>
              <FleetBreakdown counts={fleetBreakdown} total={liveVehicles.length} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Carburant</CardTitle>
              <Link href="/fuel" className="inline-flex items-center gap-1 text-2xs font-semibold text-primary hover:text-primary/80">
                <Droplets className="h-3 w-3" /> Détail
              </Link>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5 rounded-xl bg-muted/60 p-4">
                <p className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">Volumes enregistrés</p>
                <p className="text-2xl font-bold tabular-nums">{fuelTotals.liters.toFixed(0)} L</p>
              </div>
              <div className="flex flex-col gap-1.5 rounded-xl bg-muted/60 p-4">
                <p className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">Coût total</p>
                <p className="text-2xl font-bold tabular-nums">
                  {fuelTotals.cost.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Alertes récentes</CardTitle>
            <Link href="/alerts" className="inline-flex items-center gap-1 text-2xs font-semibold text-primary hover:text-primary/80">
              Toutes les alertes <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="flex flex-col">
            {openAlerts.length === 0 && (
              <p className="rounded-xl bg-success/10 px-4 py-6 text-center text-sm font-medium text-success">
                Aucune alerte ouverte — la flotte est sous contrôle.
              </p>
            )}
            {openAlerts.slice(0, 6).map((alert) => (
              <AlertRow key={alert.id} alert={alert} />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Activité missions</CardTitle>
            <Link href="/missions" className="inline-flex items-center gap-1 text-2xs font-semibold text-primary hover:text-primary/80">
              Toutes les missions <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="flex flex-col">
            {recentMissions.length === 0 && (
              <p className="rounded-xl bg-muted px-4 py-6 text-center text-sm text-muted-foreground">
                Aucune mission pour le moment.
              </p>
            )}
            {recentMissions.map((mission) => (
              <Link
                key={mission.id}
                href={`/missions/${mission.id}`}
                className="flex items-center justify-between gap-3 border-b border-border py-3 last:border-0 hover:bg-muted/40"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <p className="truncate text-sm font-semibold text-foreground">#{mission.id.slice(0, 8).toUpperCase()}</p>
                  <p className="text-2xs text-muted-foreground">
                    {mission.steps.length} étape(s) — créée {timeAgo(mission.createdAt)}
                  </p>
                </div>
                <StatusBadge tone={missionTone(mission.status)} dot>
                  {MISSION_STATUS_LABELS[mission.status as MissionStatus]}
                </StatusBadge>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AlertRow({ alert }: { alert: AlertDto }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border py-3 last:border-0 hover:bg-muted/40">
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="truncate text-sm font-semibold text-foreground">
          {ALERT_TYPE_LABELS[alert.type] ?? alert.type}
        </p>
        <p className="truncate text-2xs text-muted-foreground">
          {alert.vehicle?.plateNumber ?? 'Véhicule inconnu'} · {timeAgo(alert.createdAt)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-sm font-bold tabular-nums text-foreground">{alert.score}</span>
        <StatusBadge tone={alertTone(alert.level)} dot>
          {alert.level}
        </StatusBadge>
      </div>
    </div>
  );
}