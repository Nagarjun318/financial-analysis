/**
 * Generic table export helpers: CSV, Excel (.xlsx) and PDF (via print).
 * Zero new hard dependencies — Excel uses the already-installed `xlsx`
 * package via dynamic import so it stays out of the initial bundle.
 */

export type ExportFormat = 'csv' | 'excel' | 'pdf';

export function escapeCsvCell(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function datedFilename(base: string, ext: string): string {
  const date = new Date().toISOString().split('T')[0];
  const name = `${base}-${date}`;
  return name.endsWith(`.${ext}`) ? name : `${name}.${ext}`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on next tick so the download has time to start.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportRowsToCsv(
  baseFilename: string,
  headers: string[],
  rows: (string | number)[][],
) {
  const lines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((r) => r.map(escapeCsvCell).join(',')),
  ];
  // BOM helps Excel open UTF-8 (₹ etc.) correctly.
  const csv = '﻿' + lines.join('\n');
  downloadBlob(
    new Blob([csv], { type: 'text/csv;charset=utf-8;' }),
    datedFilename(baseFilename, 'csv'),
  );
}

export async function exportRowsToExcel(
  baseFilename: string,
  sheetName: string,
  headers: string[],
  rows: (string | number)[][],
) {
  const XLSX = await import('xlsx');
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  // Reasonable column widths based on content length.
  const colWidths = headers.map((h, i) => {
    const maxLen = Math.max(
      h.length,
      ...rows.map((r) => String(r[i] ?? '').length),
    );
    return { wch: Math.min(Math.max(maxLen + 2, 12), 40) };
  });
  (ws as { '!cols'?: { wch: number }[] })['!cols'] = colWidths;
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31) || 'Sheet1');
  const wbout: ArrayBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  downloadBlob(
    new Blob([wbout], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    datedFilename(baseFilename, 'xlsx'),
  );
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * PDF export without adding a PDF library: renders a clean print-friendly
 * document in a new window and triggers the browser print dialog, where the
 * user picks "Save as PDF". This is the standard zero-dependency approach
 * and preserves formatting (₹, tables, totals).
 */
export function exportRowsToPdf(
  title: string,
  subtitle: string,
  headers: string[],
  rows: (string | number)[][],
  footer?: string,
) {
  const dateStr = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const thCells = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('');
  const bodyRows = rows
    .map(
      (r, idx) =>
        `<tr class="${idx % 2 ? 'alt' : ''}">${r.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`,
    )
    .join('');

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, 'Segoe UI', Roboto, Arial, sans-serif; color: #111; margin: 32px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .meta { color: #666; font-size: 12px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #f3f4f6; text-align: left; padding: 8px; border: 1px solid #ddd; }
  td { padding: 7px 8px; border: 1px solid #e5e5e5; }
  tr.alt td { background: #fafafa; }
  .footer { margin-top: 16px; font-size: 12px; font-weight: 600; }
  @media print { body { margin: 0; } }
</style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <div class="meta">${escapeHtml(subtitle)} &middot; ${escapeHtml(dateStr)} &middot; ${rows.length} row(s)</div>
  <table>
    <thead><tr>${thCells}</tr></thead>
    <tbody>${bodyRows || `<tr><td colspan="${headers.length}">No rows</td></tr>`}</tbody>
  </table>
  ${footer ? `<div class="footer">${escapeHtml(footer)}</div>` : ''}
  <script>window.onload = () => { window.print(); };</script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) {
    throw new Error('Popup blocked — please allow popups to export PDF.');
  }
  win.document.write(html);
  win.document.close();
}
