import React from 'react';
import { X, Loader2 } from 'lucide-react';
import { Transaction } from '../types';
import { formatCurrency, formatDisplayDate } from '../utils';

interface StagingModalProps {
  isOpen: boolean;
  transactions: Transaction[];
  onClose: () => void;
  onConfirm: () => void;
  fileName: string | null;
  isConfirming: boolean;
}

const StagingModal: React.FC<StagingModalProps> = ({ isOpen, transactions, onClose, onConfirm, fileName, isConfirming }) => {
  if (!isOpen) {
    return null;
  }

  const formatAmount = (amount: number, type: 'debit' | 'credit') => {
    const formatted = formatCurrency(Math.abs(amount));
    return type === 'debit' ? `-${formatted}` : formatted;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-light-card dark:bg-dark-card rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-light-text dark:text-dark-text truncate pr-4">
            Review Transactions from <span className="text-brand-primary font-bold">{fileName}</span>
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close modal"
          >
            <X className="h-6 w-6" />
          </button>
        </header>
        
        <main className="p-6 overflow-y-auto">
          <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-4">
            Found {transactions.length} transactions. Please review them before adding to the dashboard.
          </p>
          <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
            <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/60">
                    <tr>
                        <th className="py-2 px-3 font-semibold text-light-text-secondary dark:text-dark-text-secondary">Date</th>
                        <th className="py-2 px-3 font-semibold text-light-text-secondary dark:text-dark-text-secondary">Description</th>
                        <th className="py-2 px-3 font-semibold text-light-text-secondary dark:text-dark-text-secondary">Category</th>
                        <th className="py-2 px-3 font-semibold text-light-text-secondary dark:text-dark-text-secondary text-right">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {transactions.map((t, index) => (
                        <tr key={`${t.date}-${t.amount}-${index}`} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                            <td className="py-2 px-3 whitespace-nowrap">{formatDisplayDate(t.date)}</td>
                            <td className="py-2 px-3">{t.description}</td>
                            <td className="py-2 px-3">
                                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-brand-primary/10 text-brand-primary">
                                    {t.category}
                                </span>
                            </td>
                            <td className={`py-2 px-3 font-mono text-right ${t.type === 'credit' ? 'text-green-500' : 'text-red-500'}`}>
                                {formatAmount(t.amount, t.type)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
          </div>
        </main>

        <footer className="flex justify-end gap-4 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-dark-bg rounded-b-xl">
          <button
            onClick={onClose}
            disabled={isConfirming}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-light-text dark:text-dark-text rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors disabled:opacity-70"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isConfirming}
            className="flex items-center justify-center gap-2 w-48 px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 transition-colors disabled:opacity-70"
          >
            {isConfirming ? <Loader2 className="h-5 w-5 animate-spin"/> : 'Confirm Transactions'}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default StagingModal;