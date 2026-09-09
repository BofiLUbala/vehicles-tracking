'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Missions</h1>
        {!showCreateForm && <Button type="button" onClick={() => setShowCreateForm(true)}>Nouvelle mission</Button>}
      </div>

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Nouvelle mission</CardTitle>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <MissionsFiltersBar filters={filters} onChange={setFilters} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading && <p className="p-4 text-sm text-muted-foreground">Chargement des missions…</p>}
          {isError && <p className="p-4 text-sm text-destructive">Impossible de charger les missions.</p>}
          {data && <MissionsTable missions={data} driversById={driversById} vehiclesById={vehiclesById} />}
        </CardContent>
      </Card>
    </div>
  );
}
