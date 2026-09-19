'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FilterBar, FilterField } from '@/components/filter-bar';
import { ErrorState, LoadingSkeleton } from '@/components/empty-state';
import { AuditTable } from '@/features/audit/audit-table';
import { AUDIT_PAGE_SIZE, fetchAuditEntries } from '@/features/audit/api';
import type { AuditFilters } from '@/features/audit/types';

const EMPTY_FILTERS: AuditFilters = {};

export function AuditPageClient() {
  const [filters, setFilters] = useState<AuditFilters>(EMPTY_FILTERS);
  const [page, setPage] = useState(0);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['audit', 'list', filters, page],
    queryFn: () => fetchAuditEntries(filters, page),
  });

  function updateFilter<K extends keyof AuditFilters>(key: K, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
    setPage(0);
  }

  const total = data?.total ?? 0;
  const from = total === 0 ? 0 : page * AUDIT_PAGE_SIZE + 1;
  const to = Math.min((page + 1) * AUDIT_PAGE_SIZE, total);
  const canGoPrevious = page > 0;
  const canGoNext = to < total;

  return (
    <div className="flex flex-col gap-5 p-6 lg:p-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Journal d’audit</h1>
        <p className="text-sm text-muted-foreground">
          Trace des actions sensibles réalisées dans votre organisation (connexions, missions,
          alertes, validations).
        </p>
      </div>

      <FilterBar>
        <FilterField label="Action">
          <Input
            id="audit-action"
            value={filters.action ?? ''}
            onChange={(event) => updateFilter('action', event.target.value)}
            placeholder="ex. mission.cancel"
          />
        </FilterField>
        <FilterField label="Entité">
          <Input
            id="audit-entity"
            value={filters.entity ?? ''}
            onChange={(event) => updateFilter('entity', event.target.value)}
            placeholder="ex. Mission"
          />
        </FilterField>
        <FilterField label="Du">
          <Input
            id="audit-from"
            type="date"
            value={filters.from ?? ''}
            onChange={(event) => updateFilter('from', event.target.value)}
          />
        </FilterField>
        <FilterField label="Au">
          <Input
            id="audit-to"
            type="date"
            value={filters.to ?? ''}
            onChange={(event) => updateFilter('to', event.target.value)}
          />
        </FilterField>
        {(filters.action || filters.entity || filters.from || filters.to) && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={() => {
              setFilters(EMPTY_FILTERS);
              setPage(0);
            }}
          >
            Réinitialiser
          </Button>
        )}
      </FilterBar>

      <Card>
        <CardContent className="p-0">
          {isLoading && <LoadingSkeleton className="h-64" />}
          {isError && (
            <ErrorState message="Impossible de charger le journal d’audit." onRetry={() => void refetch()} />
          )}
          {data && <AuditTable entries={data.items} />}
        </CardContent>
      </Card>

      {data && total > 0 && (
        <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
          <span className="tabular-nums">
            {from}–{to} sur {total}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={!canGoPrevious} onClick={() => setPage((p) => Math.max(0, p - 1))}>
              Précédent
            </Button>
            <Button variant="outline" size="sm" disabled={!canGoNext} onClick={() => setPage((p) => p + 1)}>
              Suivant
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}