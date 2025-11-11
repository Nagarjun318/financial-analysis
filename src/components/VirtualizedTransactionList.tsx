import React from 'react';
// Using react-window list via createElement to avoid JSX typing issues with CDN/ambient types.
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import { Transaction } from '../types.ts';
import { exportTransactionsCsv } from '../utils/exportCsv.ts';
import { formatCurrency, formatDisplayDate } from '../utils.ts';

interface VirtualizedTransactionListProps {
  transactions: Transaction[];
  height?: number;
  rowHeight?: number;
  onEdit: (t: Transaction) => void;
  onDelete: (id: number) => Promise<void>;
}

// Minimal virtualization renderer; reuse styling ideas from TransactionList.
export const VirtualizedTransactionList: React.FC<VirtualizedTransactionListProps> = ({
  transactions,
  height = 600,
  rowHeight = 48,
  onEdit,
  onDelete,
}) => {
  // Persistent header + export even when dataset large
  const totalAmount = React.useMemo(() => transactions.reduce((sum, t) => sum + t.amount, 0), [transactions]);
  const headerRowHeight = 42; // px height for column headers
  const listHeight = Math.max(0, height - headerRowHeight); // ensure non-negative
  const Row = ({ index, style }: ListChildComponentProps) => {
    const t = transactions[index];
    const formatAmount = (amount: number, type: 'debit' | 'credit') => {
      const formatted = formatCurrency(Math.abs(amount));
      return type === 'debit' ? `-${formatted}` : formatted;
    };
    return (
      <div style={style} className="grid grid-cols-5 gap-2 items-center px-3 border-b border-gray-200 dark:border-gray-700 text-sm bg-light-card dark:bg-dark-card">
        <div>{formatDisplayDate(t.date)}</div>
        <div className="truncate" title={t.description}>{t.description}</div>
        <div className="truncate">
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-brand-primary/10 text-brand-primary inline-flex items-center gap-1">
            {t.category}
            {t.recurring && <span className="text-[9px] bg-amber-500/20 text-amber-600 dark:text-amber-300 px-1 rounded">R</span>}
          </span>
        </div>
        <div className={`font-mono text-right ${t.type === 'credit' ? 'text-green-500' : 'text-red-500'}`}>{formatAmount(t.amount, t.type)}</div>
        <div className="flex justify-end gap-2">
          <button onClick={() => onEdit(t)} className="text-xs px-2 py-1 rounded bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500">Edit</button>
          {t.id && (
            <button onClick={() => onDelete(t.id!)} className="text-xs px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600">Del</button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="glass-panel animated-border rounded-xl shadow-lg overflow-hidden">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-light-bg/40 dark:bg-dark-bg/40 backdrop-blur">
        <h3 className="text-sm sm:text-base font-semibold gradient-text">All Transactions (Virtualized)</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportTransactionsCsv('transactions', transactions)}
            className="px-3 py-1.5 text-xs sm:text-sm rounded-md bg-brand-primary text-white hover:bg-brand-primary/90 transition-colors"
            aria-label="Export transactions to CSV"
          >Export CSV</button>
          <span className="hidden sm:inline text-[11px] font-mono opacity-70">Rows: {transactions.length}</span>
          <span className={`hidden sm:inline text-[11px] font-mono ${totalAmount >= 0 ? 'text-green-600 dark:text-green-300' : 'text-red-600 dark:text-red-400'}`}>{(totalAmount >=0 ? '+' : '')}{formatCurrency(Math.abs(totalAmount))}</span>
        </div>
      </div>
      {/* Column headers (sticky) */}
      <div className="grid grid-cols-5 gap-2 px-3 py-2 text-xs sm:text-[13px] font-semibold tracking-wide uppercase sticky top-0 bg-light-bg/70 dark:bg-dark-bg/70 backdrop-blur border-b border-gray-200 dark:border-gray-700 z-10">
        <div>Date</div>
        <div>Description</div>
        <div>Category</div>
        <div className="text-right">Amount</div>
        <div className="text-right">Actions</div>
      </div>
      {React.createElement(List, { height: listHeight, itemCount: transactions.length, itemSize: rowHeight, width: '100%' }, Row)}
      {transactions.length === 0 && (
        <div className="p-6 text-center text-light-text-secondary dark:text-dark-text-secondary">No transactions loaded yet.</div>
      )}
    </div>
  );
};
