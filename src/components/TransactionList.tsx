import React from 'react';
import { Transaction, AnomalyResult } from '../types.ts';
import { TransactionFilters } from './Dashboard.tsx';
// Fix: Imported Loader2 to show a loading spinner on delete.
import { XCircle, ArrowUp, ArrowDown, Pencil, Trash2, Loader2 } from 'lucide-react';
import { formatCurrency, formatDisplayDate } from '../utils.ts';
import { exportTransactionsCsv } from '../utils/exportCsv.ts';

interface TransactionListProps {
  transactions: Transaction[];
  filters: TransactionFilters;
  anomalies?: AnomalyResult[];
  onFilterChange: (newFilters: Partial<TransactionFilters>) => void;
  onResetFilters: () => void;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transactionId: number) => Promise<void>;
}

// Removed pagination; using incremental infinite scroll
const BATCH_SIZE = 50;

type SortKey = keyof Transaction;

const TransactionList: React.FC<TransactionListProps> = ({ transactions, filters, anomalies = [], onFilterChange, onResetFilters, onEdit, onDelete }) => {
  // Infinite scroll visible count
  const [visibleCount, setVisibleCount] = React.useState(BATCH_SIZE);
  // Column widths with user resizable state
  const [colWidths, setColWidths] = React.useState({
    date: 140,
    type: 80,
    description: 320,
    category: 180,
    amount: 120,
    actions: 110,
  } as { [k: string]: number });

  const startResize = (key: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = colWidths[key];
    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX;
  setColWidths((w: { [k: string]: number }) => ({ ...w, [key]: Math.max(60, startWidth + delta) }));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };
  const [sortConfig, setSortConfig] = React.useState({ key: 'date' as SortKey | null, direction: 'descending' as 'ascending' | 'descending' });
  const [deletingId, setDeletingId] = React.useState(null as number | null);

  const sortedTransactions = React.useMemo(() => {
    let sortableItems: Transaction[] = [...transactions];
    if (sortConfig.key !== null) {
      const key = sortConfig.key;
      sortableItems.sort((a: Transaction, b: Transaction) => {
        const valA = a[key as keyof Transaction];
        const valB = b[key as keyof Transaction];
        
        let comparison = 0;

        if (typeof valA === 'string' && typeof valB === 'string') {
          if (key === 'date') {
            comparison = valA.localeCompare(valB);
          } else {
            comparison = valA.localeCompare(valB, undefined, { sensitivity: 'base' });
          }
        } else if (typeof valA === 'number' && typeof valB === 'number') {
          if (valA > valB) {
            comparison = 1;
          } else if (valA < valB) {
            comparison = -1;
          }
        }
        
        return sortConfig.direction === 'ascending' ? comparison : -comparison;
      });
    }
    return sortableItems;
  }, [transactions, sortConfig]);


  // Reset visible rows when dataset changes
  React.useEffect(() => {
    setVisibleCount(BATCH_SIZE);
  }, [sortedTransactions]);

  const visibleRows = React.useMemo(() => sortedTransactions.slice(0, visibleCount), [sortedTransactions, visibleCount]);

  const handleScrollLoadMore = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
      // Near bottom; load more if available
      if (visibleCount < sortedTransactions.length) {
        setVisibleCount((c: number) => Math.min(c + BATCH_SIZE, sortedTransactions.length));
      }
    }
  };

  const totalAmount = React.useMemo(() => sortedTransactions.reduce((sum: number, t: Transaction) => sum + t.amount, 0), [sortedTransactions]);

  const formatAmount = (amount: number, type: 'debit' | 'credit') => {
    const formatted = formatCurrency(Math.abs(amount));
    return type === 'debit' ? `-${formatted}` : formatted;
  };
  
  const handleDeleteClick = async (transactionId: number) => {
    setDeletingId(transactionId);
    try {
        await onDelete(transactionId);
    } finally {
        setDeletingId(null);
    }
  };

  const handleLocalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    onFilterChange({ [name]: value });
  };

  const requestSort = (key: SortKey) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: SortKey) => {
    if (sortConfig.key !== key) {
      return null;
    }
    if (sortConfig.direction === 'ascending') {
      return <ArrowUp className="h-4 w-4 ml-1" />;
    }
    return <ArrowDown className="h-4 w-4 ml-1" />;
  };

  const anomalyLookup = React.useMemo(() => {
    const map = new Map<number, AnomalyResult>();
    for (const a of anomalies) {
      if (typeof a.transactionId === 'number') map.set(a.transactionId, a);
    }
    return map;
  }, [anomalies]);

  // Treat the auto-applied current year from summary as baseline (not a user filter).
  const currentYear = new Date().getFullYear().toString();
  const isFiltered = !!(
    (filters.globalSearch && filters.globalSearch.trim() !== '') ||
    (filters.date && filters.date.trim() !== '') ||
    (filters.description && filters.description.trim() !== '') ||
    (filters.category && filters.category.trim() !== '') ||
    (filters.amount && filters.amount.trim() !== '') ||
    (filters.type && filters.type !== 'all') ||
    (filters.monthYear && filters.monthYear.trim() !== '') ||
    (filters.year && filters.year !== currentYear)
  );
  return (
    <div className="glass-panel animated-border p-4 sm:p-6 rounded-xl shadow-lg">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
        <div className="flex flex-col">
          <h3 className="text-xl font-semibold rainbow-text drop-shadow-sm">All Transactions</h3>
          <span className="text-xs font-medium tracking-wide opacity-80 mt-0.5">Rows: {transactions.length}{isFiltered && <span className="ml-2 px-2 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary">Filtered</span>}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => exportTransactionsCsv('transactions', transactions)}
            className="px-3 py-1.5 text-sm rounded-md bg-brand-primary text-white hover:bg-brand-primary/90 transition-colors"
            title="Download all current matching transactions as CSV (always enabled)"
            aria-label="Export transactions to CSV"
          >
            Export CSV
          </button>
          <input
            type="text"
            name="globalSearch"
            placeholder="Search all..."
            value={filters.globalSearch}
            onChange={handleLocalFilterChange}
            className="w-full sm:w-48 bg-light-bg dark:bg-dark-bg border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-primary"
          />
          {isFiltered && (
            <button 
              onClick={onResetFilters} 
              className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-brand-primary dark:hover:text-brand-primary transition-colors"
              title="Clear all filters"
            >
              <XCircle className="h-4 w-4" />
              Clear
            </button>
          )}
        </div>
      </div>
      <div className="overflow-x-auto max-h-[480px] overflow-y-auto" onScroll={handleScrollLoadMore}>
        <table className="w-full text-sm text-left table-fixed">
          <colgroup>
            <col style={{ width: colWidths.date }} />
            <col style={{ width: colWidths.type }} />
            <col style={{ width: colWidths.description }} />
            <col style={{ width: colWidths.category }} />
            <col style={{ width: colWidths.amount }} />
            <col style={{ width: colWidths.actions }} />
          </colgroup>
          <thead className="sticky top-0 z-10 bg-gray-100 dark:bg-gray-700/50 shadow-sm">
            <tr>
              {['date','type','description','category','amount','actions'].map((key) => (
                <th
                  key={key}
                  className={`px-4 py-3 font-semibold ${key === 'actions' ? 'text-right' : ''} text-light-text-secondary dark:text-dark-text-secondary cursor-pointer group relative select-none`}
                  onClick={() => key !== 'actions' && requestSort(key as SortKey)}
                >
                  <div className="flex items-center">
                    <span>{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                    {key !== 'actions' && getSortIcon(key as SortKey)}
                  </div>
                  <span
                    onMouseDown={(e) => startResize(key, e)}
                    className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize group-hover:bg-brand-primary/30 active:bg-brand-primary/50"
                    title="Drag to resize column"
                  />
                </th>
              ))}
            </tr>
          </thead>
      <tbody>
        {visibleRows.map((t: Transaction) => {
              const anomaly = t.id ? anomalyLookup.get(t.id) : undefined;
              const anomalyClass = anomaly ? (anomaly.severity === 'severe' ? 'bg-red-50 dark:bg-red-950/30' : 'bg-amber-50 dark:bg-amber-950/30') : '';
              return (
              <tr key={t.id} className={`gradient-table-row border-b border-gray-200 dark:border-gray-700 last:border-b-0 transition-colors ${anomalyClass}`}> 
                <td className="px-4 py-3 whitespace-nowrap">{formatDisplayDate(t.date)}</td>
                <td className="px-4 py-3 whitespace-nowrap capitalize">{t.type}</td>
                <td className="px-4 py-3 max-w-xs truncate" title={t.description}>{t.description}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-brand-primary/10 text-brand-primary whitespace-nowrap inline-flex items-center gap-1">
                    {t.category}
                    {t.recurring && (
                      <span className="text-[10px] uppercase tracking-wide bg-amber-500/20 text-amber-600 dark:text-amber-300 px-1.5 py-0.5 rounded">
                        Recurring
                      </span>
                    )}
                    {anomaly && (
                      <span
                        className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded ${anomaly.severity === 'severe' ? 'bg-red-500/20 text-red-600 dark:text-red-300' : 'bg-amber-500/30 text-amber-700 dark:text-amber-300'}`}
                        title={`Anomalous ${anomaly.severity} (z-score ${anomaly.zScore.toFixed(2)})`}
                      >
                        {anomaly.severity === 'severe' ? 'Severe Anomaly' : 'Anomaly'}
                      </span>
                    )}
                  </span>
                </td>
                <td className={`px-4 py-3 font-mono text-right ${t.type === 'credit' ? 'text-green-500' : 'text-red-500'}`}>
                  {formatAmount(t.amount, t.type)}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => onEdit(t)} title="Edit" className="p-1.5 text-gray-500 hover:text-brand-primary hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors">
                        <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => t.id && handleDeleteClick(t.id)} disabled={deletingId === t.id} title="Delete" className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors disabled:opacity-50">
                      {deletingId === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </button>
                  </div>
                </td>
              </tr>
            );})}
       {visibleRows.length === 0 && (
        <tr>
          <td colSpan={6} className="text-center py-8 text-light-text-secondary dark:text-dark-text-secondary">
            No transactions found.
          </td>
        </tr>
      )}
          </tbody>
          <tfoot className="sticky bottom-0 z-10 bg-gray-100 dark:bg-gray-700/50 shadow-inner">
            <tr className="font-semibold">
              <td colSpan={4} className="px-4 py-3 text-right">Total</td>
              <td className="px-4 py-3 font-mono text-right">{formatAmount(totalAmount, totalAmount >= 0 ? 'credit' : 'debit')}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
      {/* Pagination removed in favor of infinite scroll */}
    </div>
  );
};

export default TransactionList;