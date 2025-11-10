import { Transaction } from '../types';

/**
 * Export an array of transactions to CSV and trigger a client download.
 * Columns kept minimal; extend as needed.
 */
export function exportTransactionsCsv(filename: string, transactions: Transaction[]) {
  const header = ['Date','Description','Category','Type','Amount','Recurring'];
  const rows = transactions.map(t => [
    t.date,
    escapeCsv(t.description),
    escapeCsv(t.category),
    t.type,
    t.amount.toString(),
    t.recurring ? 'yes' : ''
  ].join(','));
  const csv = [header.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}
