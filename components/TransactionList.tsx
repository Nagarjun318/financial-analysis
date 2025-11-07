import React, { useState, useEffect, useMemo } from 'react';
import { Transaction } from '../types.ts';
import { TransactionFilters } from './Dashboard.tsx';
// Fix: Imported Loader2 to show a loading spinner on delete.
import { XCircle, ArrowUp, ArrowDown, Pencil, Trash2, Loader2 } from 'lucide-react';
import { formatCurrency, formatDisplayDate } from '../utils.ts';

interface TransactionListProps {
  transactions: Transaction[];
  filters: TransactionFilters;
  onFilterChange: (newFilters: Partial<TransactionFilters>) => void;
  onResetFilters: () => void;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transactionId: number) => Promise<void>;
}

const ROWS_PER_PAGE = 20;

type SortKey = keyof Transaction;

const TransactionList: React.FC<TransactionListProps> = ({ transactions, filters, onFilterChange, onResetFilters, onEdit, onDelete }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey | null; direction: 'ascending' | 'descending' }>({ key: 'date', direction: 'descending' });
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const sortedTransactions = useMemo(() => {
    let sortableItems = [...transactions];
    if (sortConfig.key !== null) {
      const key = sortConfig.key;
      sortableItems.sort((a, b) => {
        const valA = a[key];
        const valB = b[key];
        
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


  useEffect(() => {
    setCurrentPage(1);
  }, [sortedTransactions]);

  const totalPages = Math.ceil(sortedTransactions.length / ROWS_PER_PAGE);

  const currentTableData = useMemo(() => {
    const firstPageIndex = (currentPage - 1) * ROWS_PER_PAGE;
    const lastPageIndex = firstPageIndex + ROWS_PER_PAGE;
    return sortedTransactions.slice(firstPageIndex, lastPageIndex);
  }, [currentPage, sortedTransactions]);

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

  return (
    <div className="bg-light-card dark:bg-dark-card p-4 sm:p-6 rounded-xl shadow-md">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
        <h3 className="text-xl font-semibold text-light-text dark:text-dark-text">All Transactions ({transactions.length} matching)</h3>
        <div className="flex items-center gap-2">
          <input
            type="text"
            name="globalSearch"
            placeholder="Search all..."
            value={filters.globalSearch}
            onChange={handleLocalFilterChange}
            className="w-full sm:w-48 bg-light-bg dark:bg-dark-bg border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-primary"
          />
          <button 
            onClick={onResetFilters} 
            className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-brand-primary dark:hover:text-brand-primary transition-colors"
            title="Clear all filters"
          >
            <XCircle className="h-4 w-4" />
            Clear
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-100 dark:bg-gray-700/50">
            <tr>
              {['date', 'description', 'category', 'amount'].map((key) => (
                <th 
                  key={key} 
                  className="px-4 py-3 font-semibold text-light-text-secondary dark:text-dark-text-secondary cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  onClick={() => requestSort(key as SortKey)}
                >
                  <div className="flex items-center">
                    <span>{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                    {getSortIcon(key as SortKey)}
                  </div>
                </th>
              ))}
              <th className="px-4 py-3 font-semibold text-right text-light-text-secondary dark:text-dark-text-secondary">Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentTableData.map((t) => (
              <tr key={t.id} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-4 py-3 whitespace-nowrap">{formatDisplayDate(t.date)}</td>
                <td className="px-4 py-3 max-w-xs truncate" title={t.description}>{t.description}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-brand-primary/10 text-brand-primary whitespace-nowrap">{t.category}</span>
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
            ))}
             {currentTableData.length === 0 && (
                <tr>
                    <td colSpan={5} className="text-center py-8 text-light-text-secondary dark:text-dark-text-secondary">
                        No transactions found.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
                <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Previous
                </button>
                <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Next
                </button>
            </div>
        </div>
      )}
    </div>
  );
};

export default TransactionList;