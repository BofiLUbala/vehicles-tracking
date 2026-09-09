'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { fetchFuelReport, fetchMissionsReport } from '@/features/reports/api';
import { FuelReportFiltersBar, MissionReportFiltersBar } from '@/features/reports/reports-filters';
import { ReportExportButtons } from '@/features/reports/report-export-buttons';
import { FuelReportTable, MissionsReportTable } from '@/features/reports/reports-table';
import type { FuelReportFilters, MissionReportFilters, ReportType } from '@/features/reports/types';

const REPORT_TABS: Array<{ type: ReportType; label: string }> = [
  { type: 'missions', label: 'Missions' },
  { type: 'fuel', label: 'Carburant' },
];

export function ReportsPageClient() {
  const [type, setType] = useState<ReportType>('missions');
  const [missionFilters, setMissionFilters] = useState<MissionReportFilters>({});
  const [fuelFilters, setFuelFilters] = useState<FuelReportFilters>({});

  const missionsQuery = useQuery({
    queryKey: ['reports', 'missions', missionFilters],
    queryFn: () => fetchMissionsReport(missionFilters),
    enabled: type === 'missions',
  });

  const fuelQuery = useQuery({
    queryKey: ['reports', 'fuel', fuelFilters],
    queryFn: () => fetchFuelReport(fuelFilters),
    enabled: type === 'fuel',
  });

  const activeQuery = type === 'missions' ? missionsQuery : fuelQuery;
  const activeFilters = type === 'missions' ? missionFilters : fuelFilters;

  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="text-xl font-semibold">Rapports</h1>

      <div className="flex items-center gap-2" role="tablist" aria-label="Type de rapport">
        {REPORT_TABS.map((tab) => (
          <Button
            key={tab.type}
            type="button"
            role="tab"
            aria-selected={type === tab.type}
            variant={type === tab.type ? 'default' : 'outline'}
            size="sm"
            className={cn(type === tab.type && 'pointer-events-none')}
            onClick={() => setType(tab.type)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          {type === 'missions' ? (
            <MissionReportFiltersBar filters={missionFilters} onChange={setMissionFilters} />
          ) : (
            <FuelReportFiltersBar filters={fuelFilters} onChange={setFuelFilters} />
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Aperçu des données avant export.</p>
        <ReportExportButtons type={type} filters={activeFilters} />
      </div>

      <Card>
        <CardContent className="p-0">
          {activeQuery.isLoading && <p className="p-4 text-sm text-muted-foreground">Chargement du rapport…</p>}
          {activeQuery.isError && <p className="p-4 text-sm text-destructive">Impossible de charger le rapport.</p>}
          {activeQuery.data && type === 'missions' && <MissionsReportTable rows={missionsQuery.data ?? []} />}
          {activeQuery.data && type === 'fuel' && <FuelReportTable rows={fuelQuery.data ?? []} />}
        </CardContent>
      </Card>
    </div>
  );
}
