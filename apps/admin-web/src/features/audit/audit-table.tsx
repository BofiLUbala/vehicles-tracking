'use client';

import { EmptyState } from '@/components/empty-state';
import { StatusBadge } from '@/components/status-badge';
import type { AuditEntryDto } from '@/features/audit/types';
import { auditActionToLabel, auditEntityToLabel } from '@/features/audit/audit-labels';

export interface AuditTableProps {
  entries: AuditEntryDto[];
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function shortId(id: string | null): string {
  return id ? id.slice(0, 8).toUpperCase() : '—';
}

function formatMetadata(metadata: Record<string, unknown> | null): string {
  if (!metadata || Object.keys(metadata).length === 0) return '—';
  try {
    return JSON.stringify(metadata);
  } catch {
    return '—';
  }
}

export function AuditTable({ entries }: AuditTableProps) {
  if (entries.length === 0) {
    return (
      <EmptyState
        title="Aucune entrée d’audit"
        description="Aucune action enregistrée pour ces critères."
        className="py-14"
      />
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-2xs uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Acteur</th>
            <th className="px-4 py-3">Action</th>
            <th className="px-4 py-3">Entité</th>
            <th className="px-4 py-3">Cible</th>
            <th className="px-4 py-3">Métadonnées</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id} className="border-b border-border align-top transition-colors last:border-0 hover:bg-muted/40">
              <td className="whitespace-nowrap px-4 py-3 tabular-nums text-muted-foreground">
                {formatDateTime(entry.createdAt)}
              </td>
              <td className="px-4 py-3">
                {entry.actorName ? (
                  <span className="font-medium text-foreground">{entry.actorName}</span>
                ) : (
                  <StatusBadge tone="neutral">Système / anonyme</StatusBadge>
                )}
              </td>
              <td className="px-4 py-3">
                <span className="font-medium text-foreground">{auditActionToLabel(entry.action)}</span>
                <span className="block text-2xs text-muted-foreground">{entry.action}</span>
              </td>
              <td className="px-4 py-3">
                <StatusBadge tone="info">{auditEntityToLabel(entry.entity)}</StatusBadge>
              </td>
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{shortId(entry.entityId)}</td>
              <td className="max-w-[22rem] px-4 py-3">
                <span
                  className="block truncate font-mono text-xs text-muted-foreground"
                  title={formatMetadata(entry.metadata)}
                >
                  {formatMetadata(entry.metadata)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}