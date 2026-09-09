import PDFDocument from 'pdfkit';
import { ReportColumn, columnValue, formatCell } from './export.types';

const PAGE_MARGIN = 30;
const ROW_HEIGHT = 18;
const FONT_SIZE = 8;

/**
 * Génère un PDF tabulaire simple (pas de mise en page sophistiquée — le cahier des charges ne
 * demande pas plus qu'un export lisible, voir docs/PHASE5_NOTES.md). Une page paysage, colonnes de
 * largeur égale, en-tête répété sur chaque nouvelle page.
 */
export function toPdf<T>(rows: T[], columns: ReportColumn<T>[], title: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: PAGE_MARGIN, layout: 'landscape', size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width - PAGE_MARGIN * 2;
    const colWidth = pageWidth / columns.length;

    function drawHeader() {
      doc.font('Helvetica-Bold').fontSize(FONT_SIZE);
      let x = PAGE_MARGIN;
      const y = doc.y;
      for (const c of columns) {
        doc.text(c.header, x, y, { width: colWidth, ellipsis: true });
        x += colWidth;
      }
      doc.moveDown();
      doc.font('Helvetica').fontSize(FONT_SIZE);
    }

    doc.fontSize(14).font('Helvetica-Bold').text(title, { align: 'left' });
    doc.moveDown(0.5);
    doc.fontSize(FONT_SIZE).font('Helvetica').text(`Généré le ${new Date().toISOString()} — ${rows.length} ligne(s)`);
    doc.moveDown();

    drawHeader();

    for (const row of rows) {
      if (doc.y + ROW_HEIGHT > doc.page.height - PAGE_MARGIN) {
        doc.addPage();
        drawHeader();
      }
      let x = PAGE_MARGIN;
      const y = doc.y;
      for (const c of columns) {
        const text = formatCell(columnValue(row, c));
        doc.text(text, x, y, { width: colWidth, ellipsis: true });
        x += colWidth;
      }
      doc.moveDown();
    }

    doc.end();
  });
}
