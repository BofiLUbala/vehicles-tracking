'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState, ErrorState, LoadingSkeleton } from '@/components/empty-state';
import { MissionForm } from '@/features/missions/mission-form';
import { MissionsFiltersBar } from '@/features/missions/missions-filters';
import { MissionsTable } from '@/features/missions/missions-table';
import { createMission, fetchDrivers, fetchMissions, fetchVehicles } from '@/features/missions/api';
import { toMissionStepInputs } from '@/features/missions/steps-field-array';
import type { MissionFormValues } from '@/features/missions/schemas';
import type { MissionFilters } from '@/features/missions/types';

export function MissionsPageClient() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<MissionFilters>({});
  const [showCreateForm, setShowCreateForm] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['missions', filters],
    queryFn: () => fetchMissions(filters),
  });

  const driversQuery = useQuery({ queryKey: ['missions', 'drivers'], queryFn: fetchDrivers });
  const vehiclesQuery = useQuery({ queryKey: ['missions', 'vehicles'], queryFn: fetchVehicles });

  const createMutation = useMutation({
    mutationFn: (values: MissionFormValues) =>
      createMission({
        driverId: values.driverId,
        vehicleId: values.vehicleId,
        ...(values.plannedStart ? { plannedStart: new Date(values.plannedStart).toISOString() } : {}),
        ...(values.plannedEnd ? { plannedEnd: new Date(values.plannedEnd).toISOString() } : {}),
        steps: toMissionStepInputs(
          values.steps.map((s) => ({
            key: '',
            locationId: s.locationId,
            actionType: s.actionType,
            plannedAt: s.plannedAt ?? '',
            toleranceMin: s.toleranceMin ?? 15,
          })),
        ),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missions'] });
      toast.success('Mission créée.');
      setShowCreateForm(false);
    },
    onError: () => toast.error('Impossible de créer la mission.'),
  });

  const driversById = Object.fromEntries((driversQuery.data ?? []).map((d) => [d.id, d]));
  const vehiclesById = Object.fromEntries((vehiclesQuery.data ?? []).map((v) => [v.id, v]));

  return (
    <div className="flex flex-col gap-5 p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Missions</h1>
          <p className="text-sm text-muted-foreground">
            Planifiez, assignez et suivez les tournées de votre flotte.
          </p>
        </div>
        {!showCreateForm && (
          <Button type="button" onClick={() => setShowCreateForm(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Nouvelle mission
          </Button>
        )}
      </div>

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Nouvelle mission</CardTitle>
          </CardHeader>
          <CardContent>
            <MissionForm
              onSubmit={(values) => createMutation.mutateAsync(values)}
              onCancel={() => setShowCreateForm(false)}
              submitting={createMutation.isPending}
            />
          </CardContent>
        </Card>
      )}

      <MissionsFiltersBar filters={filters} onChange={setFilters} />

      <Card>
        <CardContent className="p-0">
          {isLoading && <LoadingSkeleton className="h-64 rounded-b-xl" />}
          {isError && (
            <ErrorState message="Impossible de charger les missions" className="h-64 rounded-b-xl" />
          )}
          {data && (
            <MissionsTable
              missions={data}
              driversById={driversById}
              vehiclesById={vehiclesById}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}