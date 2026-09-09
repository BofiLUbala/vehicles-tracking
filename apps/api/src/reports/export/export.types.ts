/** Format d'export supporté par tous les endpoints de `src/reports/` (section 20). */
export type ReportFormat = 'json' | 'csv' | 'xlsx' | 'pdf';

/** Une colonne de rapport : `key` lit la valeur (via un accesseur simple) sur chaque ligne, `header`
 * est le libellé affiché dans le fichier exporté (CSV/XLSX/PDF). */
export interface ReportColumn<T> {
  key: string;
  header: string;
  /** Extraction de la valeur affichée — par défaut `row[key]`. Utile pour aplatir les relations
   * (ex : `row.vehicle?.plateNumber`) ou formater une date. */
  value?: (row: T) => string | number | boolean | Date | null | undefined;
}

export function columnValue<T>(row: T, column: ReportColumn<T>): string | number | boolean | Date | null | undefined {
  if (column.value) return column.value(row);
  return (row as Record<string, unknown>)[column.key] as string | number | boolean | Date | null | undefined;
}

export function formatCell(value: string | number | boolean | Date | null | undefined): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  return String(value);
}
