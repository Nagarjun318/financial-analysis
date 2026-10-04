import React from 'react';
import { Sparkles } from 'lucide-react';
import { Transaction } from '../types.ts';
import { formatCurrency, formatDisplayDate } from '../utils.ts';
import { predictTransactionCategoriesBatch, BatchAbortedError } from '../services/geminiService.ts';
import { showToast } from '../utils/toast';
import { Modal, Button } from './ui';

interface StagingModalProps {
  isOpen: boolean;
  transactions: Transaction[];
  onClose: () => void;
  onConfirm: () => void;
  onTransactionsUpdate: (transactions: Transaction[]) => void;
  fileName: string | null;
  isConfirming: boolean;
}

const StagingModal: React.FC<StagingModalProps> = ({
  isOpen,
  transactions,
  onClose,
  onConfirm,
  onTransactionsUpdate,
  fileName,
  isConfirming
}) => {
  const [isPredicting, setIsPredicting] = React.useState(false);

  const formatAmount = (amount: number, type: 'debit' | 'credit') => {
    const formatted = formatCurrency(Math.abs(amount));
    return type === 'debit' ? `-${formatted}` : formatted;
  };

  const handlePredictCategories = async () => {
    if (transactions.length === 0) return;

    setIsPredicting(true);
    try {
      
      // Prepare transactions for API (needs id, description, amount)
      // We use index as temporary ID since these aren't in DB yet
      const transactionsForAI = transactions.map((t, idx) => ({
        id: idx + 1,
        description: t.description,
        amount: t.amount
      }));

      const predictions = await predictTransactionCategoriesBatch(transactionsForAI);

      // Update transactions with new AI categories
      const updatedTransactions = transactions.map((t, idx) => {
        const prediction = predictions.find(p => p.id === idx + 1);
        return {
          ...t,
          ai_category: prediction ? prediction.ai_category : t.ai_category
        };
      });

      onTransactionsUpdate(updatedTransactions);
    } catch (error) {
      console.error('Failed to predict categories:', error);

      // A batch failure stops later batches — still apply what succeeded.
      if (error instanceof BatchAbortedError && error.partialResults.length > 0) {
        const byId = new Map(error.partialResults.map(p => [p.id, p.ai_category]));
        onTransactionsUpdate(transactions.map((t, idx) => {
          const ai_category = byId.get(idx + 1);
          return ai_category ? { ...t, ai_category } : t;
        }));
        showToast(`Prediction stopped — ${error.message}. Applied ${error.partialResults.length} earlier prediction(s); the rest kept their categories.`, 'error');
      } else {
        // Show user-friendly error message
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        showToast(`AI category prediction failed: ${errorMessage}. Transactions kept their current categories.`, 'error');
      }
    } finally {
      setIsPredicting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Review Transactions${fileName ? ` from ${fileName}` : ''}`}
      maxWidth="4xl"
      headerAction={
        <Button
          variant="secondary"
          size="sm"
          loading={isPredicting}
          disabled={isPredicting || isConfirming}
          onClick={handlePredictCategories}
        >
          {!isPredicting && <Sparkles className="w-4 h-4" aria-hidden="true" />}
          {isPredicting ? 'Predicting...' : 'Auto-Categorize'}
        </Button>
      }
      footer={
        <>
          <Button variant="secondary" disabled={isConfirming} onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={isConfirming}
            disabled={isConfirming || isPredicting}
            onClick={onConfirm}
            className="w-48"
          >
            {isConfirming ? 'Confirming...' : 'Confirm Transactions'}
          </Button>
        </>
      }
    >
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
                  <th className="py-2 px-3 font-semibold text-light-text-secondary dark:text-dark-text-secondary">AI Category</th>
                  <th className="py-2 px-3 font-semibold text-light-text-secondary dark:text-dark-text-secondary text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t, index) => (
                  <tr key={`${t.date}-${t.amount}-${index}`} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                    <td className="py-2 px-3 whitespace-nowrap">{formatDisplayDate(t.date)}</td>
                    <td className="py-2 px-3">{t.description}</td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                        {t.category}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      {t.ai_category ? (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 flex items-center gap-1 w-fit">
                          <Sparkles className="w-3 h-3" />
                          {t.ai_category}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                    <td className={`py-2 px-3 font-mono text-right ${t.type === 'credit' ? 'text-green-500' : 'text-red-500'}`}>
                      {formatAmount(t.amount, t.type)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
      </div>
    </Modal>
  );
};

export default StagingModal;