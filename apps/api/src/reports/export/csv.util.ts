import { ReportColumn, columnValue, formatCell } from './export.types';

/** Échappe une cellule CSV (RFC 4180) : entoure de guillemets si elle contient une virgule, un
 * guillemet, ou un retour à la ligne ; double les guillemets internes. */
function escapeCsvCell(raw: string): string {
  if (/[",\n\r]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

/** Sérialisation CSV volontairement légère (pas de dépendance) — en-tête + une ligne par élément,
 * fin de ligne CRLF (convention RFC 4180, compatible Excel). */
export function toCsv<T>(rows: T[], columns: ReportColumn<T>[]): string {
  const header = columns.map((c) => escapeCsvCell(c.header)).join(',');
  const lines = rows.map((row) => columns.map((c) => escapeCsvCell(formatCell(columnValue(row, c)))).join(','));
  return [header, ...lines].join('\r\n') + '\r\n';
}
