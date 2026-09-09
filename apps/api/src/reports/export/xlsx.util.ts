import ExcelJS from 'exceljs';
import { ReportColumn, columnValue, formatCell } from './export.types';

/** Génère un classeur Excel (.xlsx) à une feuille — nom de feuille et en-têtes à partir des colonnes. */
export async function toXlsx<T>(rows: T[], columns: ReportColumn<T>[], sheetName: string): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'tracking-vehicles';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet(sheetName.slice(0, 31)); // limite Excel : 31 caractères max

  sheet.columns = columns.map((c) => ({ header: c.header, key: c.key, width: Math.max(c.header.length + 2, 12) }));
  sheet.getRow(1).font = { bold: true };

  for (const row of rows) {
    const record: Record<string, unknown> = {};
    for (const c of columns) {
      record[c.key] = formatCell(columnValue(row, c));
    }
    sheet.addRow(record);
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
