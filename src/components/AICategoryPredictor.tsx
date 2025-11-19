import React from 'react';
import { Transaction } from '../types';
import { Sparkles, RefreshCw, Check, X, Info } from 'lucide-react';
import { predictTransactionCategoriesBatch } from '../services/geminiService';
import { updateTransactionAICategoriesBatch } from '../services/supabaseClient';

interface AICategoryPredictorProps {
  transactions: Transaction[];
  onCategoriesUpdated: () => void;
}

export const AICategoryPredictor: React.FC<AICategoryPredictorProps> = ({
  transactions,
  onCategoriesUpdated
}) => {
  const [isPredicting, setIsPredicting] = React.useState(false);
  const [progress, setProgress] = React.useState({ current: 0, total: 0 });
  const [result, setResult] = React.useState(null as { success: number; failed: number } | null);
  const [error, setError] = React.useState(null as string | null);
  const [showInfo, setShowInfo] = React.useState(false);

  // Get unique existing categories from transactions
  const existingCategories = React.useMemo(() => {
    const categories = new Set<string>();
    transactions.forEach(t => {
      if (t.category && t.category !== 'Uncategorized') {
        categories.add(t.category);
      }
    });
    return Array.from(categories).sort();
  }, [transactions]);

  // Filter transactions that need AI categorization
  const transactionsNeedingAI = React.useMemo(() => {
    return transactions.filter(t => !t.ai_category && t.id);
  }, [transactions]);

  const handlePredictCategories = async () => {
    if (transactionsNeedingAI.length === 0) {
      setError('No transactions need AI categorization');
      return;
    }

    setIsPredicting(true);
    setError(null);
    setResult(null);
    setProgress({ current: 0, total: transactionsNeedingAI.length });

    try {
      // Process in batches of 20 for better API efficiency
      const batchSize = 20;
      const allUpdates: Array<{ id: number; ai_category: string }> = [];
      
      for (let i = 0; i < transactionsNeedingAI.length; i += batchSize) {
        const batch = transactionsNeedingAI.slice(i, i + batchSize);
        
        // Predict categories for this batch
        const predictions = await predictTransactionCategoriesBatch(
          batch.map((t: Transaction) => ({ description: t.description, amount: t.amount })),
          existingCategories
        );

        // Prepare updates
        batch.forEach((transaction: Transaction, idx: number) => {
          if (transaction.id) {
            allUpdates.push({
              id: transaction.id,
              ai_category: predictions[idx] || 'Uncategorized'
            });
          }
        });

        setProgress({ current: Math.min(i + batchSize, transactionsNeedingAI.length), total: transactionsNeedingAI.length });
      }

      // Update database with all predictions
      const updateResult = await updateTransactionAICategoriesBatch(allUpdates);

      if (updateResult.success) {
        setResult({
          success: updateResult.updatedCount || 0,
          failed: allUpdates.length - (updateResult.updatedCount || 0)
        });
        
        // Notify parent to refresh data
        setTimeout(() => {
          onCategoriesUpdated();
        }, 1000);
      } else {
        setError(updateResult.error || 'Failed to update database');
      }
    } catch (err) {
      console.error('Category prediction error:', err);
      setError(err instanceof Error ? err.message : 'Failed to predict categories');
    } finally {
      setIsPredicting(false);
    }
  };

  const handleResetResults = () => {
    setResult(null);
    setError(null);
    setProgress({ current: 0, total: 0 });
  };

  return (
    <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-xl border border-purple-200 dark:border-purple-800">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              AI Category Prediction
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
              {transactionsNeedingAI.length} transactions need categorization
            </p>
          </div>
        </div>
        
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="p-1 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded transition-colors"
        >
          <Info className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </button>
      </div>

      {showInfo && (
        <div className="bg-white/50 dark:bg-gray-800/50 p-3 rounded-lg text-xs text-gray-700 dark:text-gray-300 mb-3">
          <p className="mb-2">
            <strong>How it works:</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>AI analyzes transaction descriptions</li>
            <li>Predicts categories based on existing patterns</li>
            <li>Saves predictions to "AI_Category" column</li>
            <li>Processes in batches for efficiency</li>
          </ul>
        </div>
      )}

      {/* Progress */}
      {isPredicting && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-700 dark:text-gray-300">
              Analyzing transactions...
            </span>
            <span className="text-gray-600 dark:text-gray-400">
              {progress.current} / {progress.total}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-full transition-all duration-300"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 rounded-lg mb-3">
          <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
            <Check className="w-4 h-4" />
            <span className="text-sm font-medium">
              Successfully categorized {result.success} transactions
            </span>
          </div>
          {result.failed > 0 && (
            <p className="text-xs text-green-700 dark:text-green-300 mt-1 ml-6">
              {result.failed} failed
            </p>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 rounded-lg mb-3">
          <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
            <X className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handlePredictCategories}
          disabled={isPredicting || transactionsNeedingAI.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        >
          {isPredicting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Predicting...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Predict Categories
            </>
          )}
        </button>

        {result && (
          <button
            onClick={handleResetResults}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
          >
            Clear
          </button>
        )}
      </div>

      {/* Available Categories Preview */}
      {existingCategories.length > 0 && (
        <div className="mt-3 pt-3 border-t border-purple-200 dark:border-purple-800">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
            Using {existingCategories.length} existing categories:
          </p>
          <div className="flex flex-wrap gap-1">
            {existingCategories.slice(0, 8).map((cat: string) => (
              <span
                key={cat}
                className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs"
              >
                {cat}
              </span>
            ))}
            {existingCategories.length > 8 && (
              <span className="px-2 py-0.5 text-gray-500 dark:text-gray-400 text-xs">
                +{existingCategories.length - 8} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AICategoryPredictor;
