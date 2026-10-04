import React from 'react';
// Using react-window list via createElement to avoid JSX typing issues with CDN/ambient types.
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import { Loader2, RefreshCw, Sparkles, Trash2, XCircle } from 'lucide-react';
import { Transaction } from '../types.ts';
import { exportTransactionsCsv } from '../utils/exportCsv.ts';
import { formatCurrency, formatDisplayDate } from '../utils.ts';
import { EmptyState } from './ui';
import { GEMINI_MODELS, DEFAULT_GEMINI_MODEL, BatchAbortedError, predictTransactionCategoriesBatch, type GeminiModel } from '../services/geminiService.ts';
import { updateTransactionAICategoriesBatch, clearTransactionAICategories } from '../services/neonClient.ts';
import type { TransactionFilters } from './Dashboard.tsx';
import { isTransactionFilterActive } from './transactionFilterUtils.ts';

interface VirtualizedTransactionListProps {
  transactions: Transaction[];
  height?: number;
  rowHeight?: number;
  onEdit: (t: Transaction) => void;
  onDelete: (id: number) => Promise<void>;
  filters?: TransactionFilters;
  onFilterChange?: (newFilters: Partial<TransactionFilters>) => void;
  onRefreshData?: () => void;
  /** True when AI natural-language search results are shown (a filter-like view). */
  searchActive?: boolean;
}

const MODEL_STORAGE_KEY = 'ai-category-model';

const MODEL_OPTIONS: { value: GeminiModel; label: string }[] = [
  { value: GEMINI_MODELS.FLASH_3_5_LITE, label: '3.5 Flash-Lite (Default)' },
  { value: GEMINI_MODELS.PRO_LATEST, label: 'Pro (accurate)' },
  { value: GEMINI_MODELS.FLASH_LATEST, label: 'Flash Latest' },
  { value: GEMINI_MODELS.FLASH_2_5, label: 'Flash 2.5' },
  { value: GEMINI_MODELS.FLASH_2_0, label: 'Flash 2.0' },
  { value: GEMINI_MODELS.FLASH_LITE, label: 'Flash Lite (fast)' },
  { value: GEMINI_MODELS.GEMMA_3, label: 'Gemma 3' },
];

function getStoredModel(): GeminiModel {
  try {
    const raw = localStorage.getItem(MODEL_STORAGE_KEY);
    if (raw && (Object.values(GEMINI_MODELS) as string[]).includes(raw)) {
      return raw as GeminiModel;
    }
  } catch {
    // ignore
  }
  return DEFAULT_GEMINI_MODEL;
}

// Minimal virtualization renderer; reuse styling ideas from TransactionList.
export const VirtualizedTransactionList: React.FC<VirtualizedTransactionListProps> = ({
  transactions,
  height = 600,
  rowHeight = 48,
  onEdit,
  onDelete,
  filters,
  onFilterChange,
  onRefreshData,
  searchActive = false,
}) => {
  // Persistent header + export even when dataset large
  const totalAmount = React.useMemo(() => transactions.reduce((sum, t) => sum + t.amount, 0), [transactions]);
  const [selectedModel, setSelectedModel] = React.useState<GeminiModel>(getStoredModel);
  const [isPredicting, setIsPredicting] = React.useState(false);
  const [predictionProgress, setPredictionProgress] = React.useState(0);
  // Row selection (by transaction id). Persists across filter changes;
  // bulk actions resolve against rows present in the current view.
  const [selectedIds, setSelectedIds] = React.useState<Set<number>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = React.useState(false);
  const [isClearing, setIsClearing] = React.useState(false);
  const [predictionError, setPredictionError] = React.useState<string | null>(null);
  const headerCheckboxRef = React.useRef<HTMLInputElement | null>(null);

  // A prediction run aborted mid-way: save whatever succeeded, refresh, and
  // tell the user (later batches were NOT attempted).
  const handlePredictionFailure = async (error: unknown, context: string) => {
    if (error instanceof BatchAbortedError) {
      if (error.partialResults.length > 0) {
        try {
          await updateTransactionAICategoriesBatch(error.partialResults);
        } catch (dbError) {
          console.error('Failed to save partial predictions:', dbError);
        }
      }
      if (onRefreshData) {
        await onRefreshData();
      }
      setPredictionError(
        `${context} stopped — ${error.message}. Saved ${error.partialResults.length} earlier prediction(s). Wait a minute, then re-run to continue.`
      );
    } else {
      setPredictionError(
        `${context} failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
    console.error(`${context} failed:`, error);
  };

  const transactionsNeedingAI = React.useMemo(() => transactions.filter((t) => !t.ai_category), [transactions]);

  // Filter-like view (column filters or AI search): rows are selected by default.
  const filterActive = isTransactionFilterActive(filters) || searchActive;

  // When a filter is applied, select all matching rows by default. While a
  // filter stays active, keep selection in sync with the matching rows.
  // When the filter is cleared, reset selection. Manual selection in the
  // unfiltered view is left untouched (stale ids pruned).
  const wasFilterActiveRef = React.useRef(false);
  React.useEffect(() => {
    if (filterActive) {
      setSelectedIds(
        new Set(
          transactions
            .filter((t) => t.id !== undefined && t.id !== null)
            .map((t) => t.id as number)
        )
      );
    } else if (wasFilterActiveRef.current) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds((prev) => {
        if (prev.size === 0) return prev;
        const valid = new Set(
          transactions
            .filter((t) => t.id !== undefined && t.id !== null)
            .map((t) => t.id as number)
        );
        let changed = false;
        const next = new Set<number>();
        for (const id of prev) {
          if (valid.has(id)) {
            next.add(id);
          } else {
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }
    wasFilterActiveRef.current = filterActive;
  }, [filterActive, transactions]);

  const selectableRows = React.useMemo(
    () => transactions.filter((t) => t.id !== undefined && t.id !== null),
    [transactions]
  );
  const selectedInView = React.useMemo(
    () => selectableRows.filter((t) => selectedIds.has(t.id!)),
    [selectableRows, selectedIds]
  );
  const selectedNeedingAI = React.useMemo(
    () => selectedInView.filter((t) => !t.ai_category),
    [selectedInView]
  );
  const selectedWithPredictions = React.useMemo(
    () => selectedInView.filter((t) => t.ai_category),
    [selectedInView]
  );

  // Clear only the selected rows' predictions; other rows keep theirs.
  const handleClearSelectedPredictions = async () => {
    if (isClearing || selectedWithPredictions.length === 0) return;
    if (!window.confirm(`Clear AI predictions for ${selectedWithPredictions.length} selected transaction(s)? Other rows will keep their predictions.`)) return;
    setIsClearing(true);
    try {
      await clearTransactionAICategories(selectedWithPredictions.map((t) => t.id as number));
      if (onRefreshData) await onRefreshData();
    } catch (error) {
      console.error('Failed to clear predictions:', error);
    } finally {
      setIsClearing(false);
    }
  };
  const allSelected = selectableRows.length > 0 && selectedInView.length === selectableRows.length;
  const someSelected = selectedInView.length > 0 && !allSelected;

  React.useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  const toggleRow = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const t of selectableRows) next.delete(t.id!);
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const t of selectableRows) next.add(t.id!);
        return next;
      });
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleDeleteRow = async (id: number) => {
    await onDelete(id);
    setSelectedIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handlePredictSelected = async () => {
    if (selectedNeedingAI.length === 0 || isPredicting) return;
    setIsPredicting(true);
    setPredictionProgress(0);
    setPredictionError(null);
    try {
      try {
        localStorage.setItem(MODEL_STORAGE_KEY, selectedModel);
      } catch {
        // ignore persistence errors
      }
      const CHUNK = 20;
      const allPredictions: { id: number; ai_category: string }[] = [];
      const total = Math.ceil(selectedNeedingAI.length / CHUNK);
      for (let i = 0; i < selectedNeedingAI.length; i += CHUNK) {
        const predictions = await predictTransactionCategoriesBatch(
          selectedNeedingAI.slice(i, i + CHUNK),
          selectedModel
        );
        allPredictions.push(...predictions);
        setPredictionProgress(Math.round(((i / CHUNK + 1) / total) * 100));
      }
      await updateTransactionAICategoriesBatch(allPredictions);
      if (onRefreshData) await onRefreshData();
      setPredictionProgress(0);
    } catch (error) {
      await handlePredictionFailure(error, 'Prediction');
    } finally {
      setIsPredicting(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0 || isBulkDeleting) return;
    if (!window.confirm(`Delete ${selectedIds.size} selected transaction(s)? This cannot be undone.`)) return;
    setIsBulkDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      for (const id of ids) {
        await onDelete(id);
      }
      clearSelection();
      if (onRefreshData) await onRefreshData();
    } catch (error) {
      console.error('Failed to delete selected transactions:', error);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handlePredictCategories = async () => {
    if (transactionsNeedingAI.length === 0 || isPredicting) return;
    setIsPredicting(true);
    setPredictionProgress(0);
    setPredictionError(null);
    try {
      try {
        localStorage.setItem(MODEL_STORAGE_KEY, selectedModel);
      } catch {
        // ignore persistence errors
      }
      const BATCH_SIZE = 20;
      const batches = [];
      for (let i = 0; i < transactionsNeedingAI.length; i += BATCH_SIZE) {
        batches.push(transactionsNeedingAI.slice(i, i + BATCH_SIZE));
      }
      const allPredictions: { id: number; ai_category: string }[] = [];
      for (let i = 0; i < batches.length; i++) {
        const predictions = await predictTransactionCategoriesBatch(batches[i], selectedModel);
        allPredictions.push(...predictions);
        setPredictionProgress(Math.round(((i + 1) / batches.length) * 100));
      }
      await updateTransactionAICategoriesBatch(allPredictions);
      if (onRefreshData) await onRefreshData();
      setPredictionProgress(0);
    } catch (error) {
      await handlePredictionFailure(error, 'Prediction');
    } finally {
      setIsPredicting(false);
    }
  };
  const headerRowHeight = 42; // px height for column headers
  const listHeight = Math.max(0, height - headerRowHeight); // ensure non-negative
  const Row = ({ index, style }: ListChildComponentProps) => {
    const t = transactions[index];
    const formatAmount = (amount: number, type: 'debit' | 'credit') => {
      const formatted = formatCurrency(Math.abs(amount));
      return type === 'debit' ? `-${formatted}` : formatted;
    };
    const isSelected = t.id !== undefined && selectedIds.has(t.id);
    return (
      <div style={style} className={`grid grid-cols-[32px_1fr_2fr_1fr_auto_auto] gap-2 items-center px-3 border-b border-gray-200 dark:border-gray-700 text-sm bg-light-card dark:bg-dark-card ${isSelected ? 'bg-purple-50 dark:bg-purple-950/20' : ''}`}>
        <div>
          {t.id !== undefined ? (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => toggleRow(t.id!)}
              className="h-4 w-4 accent-purple-600 cursor-pointer"
              aria-label={`Select transaction ${t.description}`}
              title={`Select transaction ${t.description}`}
            />
          ) : null}
        </div>
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
            <button onClick={() => handleDeleteRow(t.id!)} className="text-xs px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600">Del</button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="glass-panel animated-border rounded-xl shadow-lg overflow-hidden">
      <div className="flex flex-col gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-light-bg/40 dark:bg-dark-bg/40 backdrop-blur">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
          <h3 className="text-sm sm:text-base font-semibold gradient-text">All Transactions (Virtualized)</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <button
                onClick={handlePredictCategories}
                disabled={isPredicting || transactionsNeedingAI.length === 0}
                className={`px-3 py-1.5 text-xs sm:text-sm rounded-md transition-colors flex items-center gap-1.5 ${isPredicting || transactionsNeedingAI.length === 0
                  ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-purple-600 text-white hover:bg-purple-700'
                  }`}
                title={transactionsNeedingAI.length === 0 ? 'All transactions have AI categories' : `Predict categories using ${selectedModel}`}
                aria-label="Predict AI categories"
              >
                {isPredicting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    {predictionProgress > 0 && <span>{predictionProgress}%</span>}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Predict Categories
                  </>
                )}
              </button>
              <select
                value={selectedModel}
                onChange={(e) => {
                  const next = e.target.value as GeminiModel;
                  setSelectedModel(next);
                  try {
                    localStorage.setItem(MODEL_STORAGE_KEY, next);
                  } catch {
                    // ignore persistence errors
                  }
                }}
                disabled={isPredicting}
                className="bg-light-bg dark:bg-dark-bg border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 text-xs sm:text-sm focus:ring-2 focus:ring-brand-primary max-w-[11rem]"
                title="AI model used for category prediction"
                aria-label="Select AI model for category prediction"
              >
                {MODEL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleClearSelectedPredictions}
              disabled={isClearing || selectedWithPredictions.length === 0}
              className={`px-3 py-1.5 text-xs sm:text-sm rounded-md transition-colors flex items-center gap-1.5 ${isClearing || selectedWithPredictions.length === 0
                ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-800/40'
                }`}
              title={selectedWithPredictions.length === 0 ? 'Select rows with AI predictions to clear them' : `Clear AI predictions for ${selectedWithPredictions.length} selected row(s); other rows keep theirs`}
              aria-label="Clear AI predictions for selected rows"
            >
              {isClearing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Clear Predictions
              {selectedWithPredictions.length > 0 && (
                <span className="px-1.5 py-0.5 text-xs font-mono rounded bg-red-200 dark:bg-red-800/50">
                  {selectedWithPredictions.length}
                </span>
              )}
            </button>
            <button
              onClick={() => exportTransactionsCsv('transactions', transactions)}
              className="px-3 py-1.5 text-xs sm:text-sm rounded-md bg-brand-primary text-white hover:bg-brand-primary/90 transition-colors"
              aria-label="Export transactions to CSV"
            >Export CSV</button>
            <span className="hidden sm:inline text-[11px] font-mono opacity-70">Rows: {transactions.length}</span>
            <span className={`hidden sm:inline text-[11px] font-mono ${totalAmount >= 0 ? 'text-green-600 dark:text-green-300' : 'text-red-600 dark:text-red-400'}`}>{(totalAmount >=0 ? '+' : '')}{formatCurrency(Math.abs(totalAmount))}</span>
          </div>
        </div>
        {filters && onFilterChange && (
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="text"
              name="globalSearch"
              placeholder="Search all..."
              value={filters.globalSearch}
              onChange={(e) => onFilterChange({ [e.target.name]: e.target.value })}
              className="w-full sm:w-48 bg-light-bg dark:bg-dark-bg border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-primary"
            />
            <select
              name="aiCategory"
              value={filters.aiCategory}
              onChange={(e) => onFilterChange({ aiCategory: e.target.value as TransactionFilters['aiCategory'] })}
              className="bg-light-bg dark:bg-dark-bg border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-primary"
              title="Filter by AI category prediction status"
              aria-label="Filter by AI category prediction status"
            >
              <option value="all">AI: All</option>
              <option value="predicted">AI: Predicted</option>
              <option value="not_predicted">AI: Not predicted</option>
            </select>
            <button
              type="button"
              onClick={() => onFilterChange({ aiCategory: filters.aiCategory === 'not_predicted' ? 'all' : 'not_predicted' })}
              aria-pressed={filters.aiCategory === 'not_predicted'}
              title={filters.aiCategory === 'not_predicted' ? 'Show all rows' : 'Show only rows without an AI prediction'}
              aria-label="Toggle not predicted rows filter"
              className={`px-3 py-1.5 text-sm rounded-md border transition-colors flex items-center gap-1.5 ${filters.aiCategory === 'not_predicted'
                ? 'bg-purple-600 text-white border-purple-600'
                : 'bg-light-bg dark:bg-dark-bg border-gray-300 dark:border-gray-600 hover:border-brand-primary dark:hover:border-brand-primary'
                }`}
            >
              <Sparkles className="h-4 w-4" />
              Not predicted
              <span className={`px-1.5 py-0.5 text-xs font-mono rounded ${filters.aiCategory === 'not_predicted' ? 'bg-white/20' : 'bg-gray-200 dark:bg-gray-700'}`}>
                {transactionsNeedingAI.length}
              </span>
            </button>
          </div>
        )}
      </div>
      {selectedIds.size > 0 && (
        <div
          className="flex flex-wrap items-center gap-2 px-4 py-2 text-sm border-b border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/30"
          role="status"
          aria-label={`${selectedIds.size} rows selected`}
        >
          <span className="font-medium">{selectedIds.size} selected</span>
          <button
            onClick={() => exportTransactionsCsv('transactions-selected', selectedInView)}
            disabled={selectedInView.length === 0}
            className="px-3 py-1.5 text-xs sm:text-sm rounded-md bg-brand-primary text-white hover:bg-brand-primary/90 transition-colors disabled:opacity-50"
            title="Download selected rows as CSV"
            aria-label="Export selected rows to CSV"
          >
            Export selected
          </button>
          <button
            onClick={handlePredictSelected}
            disabled={isPredicting || selectedNeedingAI.length === 0}
            className={`px-3 py-1.5 text-xs sm:text-sm rounded-md transition-colors flex items-center gap-1.5 ${isPredicting || selectedNeedingAI.length === 0
              ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            title={selectedNeedingAI.length === 0 ? 'All selected rows already have AI categories' : `Predict ${selectedNeedingAI.length} selected row(s) using ${selectedModel}`}
            aria-label="Predict AI categories for selected rows"
          >
            <Sparkles className="h-4 w-4" />
            Predict selected ({selectedNeedingAI.length})
          </button>
          <button
            onClick={handleDeleteSelected}
            disabled={isBulkDeleting}
            className="px-3 py-1.5 text-xs sm:text-sm rounded-md bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-800/40 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            title="Delete all selected rows"
            aria-label="Delete selected rows"
          >
            {isBulkDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Delete selected
          </button>
          <button
            onClick={clearSelection}
            className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-600 dark:text-gray-400 hover:text-brand-primary dark:hover:text-brand-primary transition-colors"
            title="Clear row selection"
            aria-label="Clear row selection"
          >
            <XCircle className="h-4 w-4" />
            Clear selection
          </button>
        </div>
      )}
      {predictionError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-2 px-4 py-2 text-sm border-b border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300"
        >
          <span>{predictionError}</span>
          <button
            onClick={() => setPredictionError(null)}
            className="flex items-center gap-1 text-xs hover:underline shrink-0"
            aria-label="Dismiss prediction error"
          >
            <XCircle className="h-4 w-4" />
            Dismiss
          </button>
        </div>
      )}
      {/* Column headers (sticky) */}
      <div className="grid grid-cols-[32px_1fr_2fr_1fr_auto_auto] gap-2 px-3 py-2 text-xs sm:text-[13px] font-semibold tracking-wide uppercase sticky top-0 bg-light-bg/70 dark:bg-dark-bg/70 backdrop-blur border-b border-gray-200 dark:border-gray-700 z-10">
        <div>
          <input
            ref={headerCheckboxRef}
            type="checkbox"
            checked={allSelected}
            onChange={toggleSelectAll}
            disabled={selectableRows.length === 0}
            className="h-4 w-4 accent-purple-600 cursor-pointer"
            title={allSelected ? 'Deselect all rows' : 'Select all rows'}
            aria-label={allSelected ? 'Deselect all rows' : 'Select all rows'}
          />
        </div>
        <div>Date</div>
        <div>Description</div>
        <div>Category</div>
        <div className="text-right">Amount</div>
        <div className="text-right">Actions</div>
      </div>
      <List height={listHeight} itemCount={transactions.length} itemSize={rowHeight} width="100%">
        {Row}
      </List>
      {transactions.length === 0 && (
        <EmptyState
          title="No transactions yet"
          description="Upload a bank statement to get started."
        />
      )}
    </div>
  );
};
