'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { REPORT_PAGE_SIZE, fetchFuelReport, fetchMissionsReport } from '@/features/reports/api';
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
  const [offset, setOffset] = useState(0);

  // Changer d'onglet ou de filtres invalide la page courante : repartir de la premiere.
  const resetToFirstPage = () => setOffset(0);

  const missionsQuery = useQuery({
    queryKey: ['reports', 'missions', missionFilters, offset],
    queryFn: () => fetchMissionsReport(missionFilters, { offset }),
    enabled: type === 'missions',
  });

  const fuelQuery = useQuery({
    queryKey: ['reports', 'fuel', fuelFilters, offset],
    queryFn: () => fetchFuelReport(fuelFilters, { offset }),
    enabled: type === 'fuel',
  });

  const activeQuery = type === 'missions' ? missionsQuery : fuelQuery;
  const activeFilters = type === 'missions' ? missionFilters : fuelFilters;
  const meta = activeQuery.data?.meta;
  const firstRowNumber = meta && meta.returned > 0 ? meta.offset + 1 : 0;
  const lastRowNumber = meta ? meta.offset + meta.returned : 0;

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
            onClick={() => {
              setType(tab.type);
              resetToFirstPage();
            }}
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
            <MissionReportFiltersBar
              filters={missionFilters}
              onChange={(next) => {
                setMissionFilters(next);
                resetToFirstPage();
              }}
            />
          ) : (
            <FuelReportFiltersBar
              filters={fuelFilters}
              onChange={(next) => {
                setFuelFilters(next);
                resetToFirstPage();
              }}
            />
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
          {activeQuery.data && type === 'missions' && <MissionsReportTable rows={missionsQuery.data?.rows ?? []} />}
          {activeQuery.data && type === 'fuel' && <FuelReportTable rows={fuelQuery.data?.rows ?? []} />}
        </CardContent>
      </Card>

      {meta && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {meta.returned === 0
              ? 'Aucune ligne pour ces filtres.'
              : `Lignes ${firstRowNumber} à ${lastRowNumber}`}
            {meta.truncated && (
              <span className="ml-2 font-medium text-foreground">
                — résultats incomplets, d’autres lignes existent au-delà de cette page.
              </span>
            )}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={meta.offset === 0 || activeQuery.isFetching}
              onClick={() => setOffset((current) => Math.max(0, current - REPORT_PAGE_SIZE))}
            >
              Page précédente
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!meta.hasMore || activeQuery.isFetching}
              onClick={() => setOffset((current) => current + REPORT_PAGE_SIZE)}
            >
              Page suivante
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
