import React from 'react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import { Transaction } from '../types.ts';
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
    <div className="rounded-xl shadow-md overflow-hidden">
      <List height={height} itemCount={transactions.length} itemSize={rowHeight} width="100%">
        {Row}
      </List>
    </div>
  );
};
