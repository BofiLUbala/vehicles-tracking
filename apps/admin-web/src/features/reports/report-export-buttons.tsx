'use client';

import { Button } from '@/components/ui/button';
import { buildReportDownloadUrl } from '@/features/reports/api';
import type { FuelReportFilters, MissionReportFilters, ReportFormat, ReportType } from '@/features/reports/types';

const FORMATS: Array<{ format: Exclude<ReportFormat, 'json'>; label: string }> = [
  { format: 'csv', label: 'CSV' },
  { format: 'xlsx', label: 'Excel' },
  { format: 'pdf', label: 'PDF' },
];

export interface ReportExportButtonsProps {
  type: ReportType;
  filters: MissionReportFilters | FuelReportFilters;
}

/**
 * Boutons d'export : chaque bouton est un lien `<a>` de navigation directe vers le proxy Next.js
 * `/api/reports/:type?...&format=...` — le navigateur télécharge le fichier nativement grâce à
 * l'en-tête `Content-Disposition: attachment` renvoyé par le proxy (voir `src/features/reports/api.ts`
 * pour le détail du pourquoi du proxy plutôt qu'un lien direct vers le backend).
 */
export function ReportExportButtons({ type, filters }: ReportExportButtonsProps) {
  return (
    <div className="flex items-center gap-2">
      {FORMATS.map(({ format, label }) => (
        <Button key={format} asChild variant="outline" size="sm">
          <a href={buildReportDownloadUrl(type, filters, format)}>Exporter {label}</a>
        </Button>
      ))}
    </div>
  );
}
