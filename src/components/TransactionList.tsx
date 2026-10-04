import React from 'react';
import { Transaction, AnomalyResult } from '../types.ts';
import { TransactionFilters } from './Dashboard.tsx';
// Fix: Imported Loader2 to show a loading spinner on delete.
import { XCircle, ArrowUp, ArrowDown, Pencil, Trash2, Loader2, Sparkles, RefreshCw } from 'lucide-react';
import { formatCurrency, formatDisplayDate } from '../utils.ts';
import { exportTransactionsCsv } from '../utils/exportCsv.ts';
import { predictTransactionCategoriesBatch, BatchAbortedError, GEMINI_MODELS, DEFAULT_GEMINI_MODEL, type GeminiModel } from '../services/geminiService';
import { updateTransactionAICategoriesBatch, clearTransactionAICategories } from '../services/neonClient';
import { isTransactionFilterActive } from './transactionFilterUtils.ts';

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
    // private-mode quota — fall through to default
  }
  return DEFAULT_GEMINI_MODEL;
}

interface TransactionListProps {
  transactions: Transaction[];
  filters: TransactionFilters;
  anomalies?: AnomalyResult[];
  onFilterChange: (newFilters: Partial<TransactionFilters>) => void;
  onResetFilters: () => void;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transactionId: number) => Promise<void>;
  onRefreshData: () => void;
  /** True when AI natural-language search results are shown (a filter-like view). */
  searchActive?: boolean;
}

// Removed pagination; using incremental infinite scroll
const BATCH_SIZE = 50;

type SortKey = keyof Transaction;

const TransactionList: React.FC<TransactionListProps> = ({ transactions, filters, anomalies = [], onFilterChange, onResetFilters, onEdit, onDelete, onRefreshData, searchActive = false }) => {
  // Infinite scroll visible count
  const [visibleCount, setVisibleCount] = React.useState(BATCH_SIZE);
  // Row selection (by transaction id). Persists across sort/scroll/filter;
  // bulk actions resolve against rows present in the current view.
  const [selectedIds, setSelectedIds] = React.useState<Set<number>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = React.useState(false);
  const headerCheckboxRef = React.useRef<HTMLInputElement | null>(null);
  // Column widths with user resizable state
  const [colWidths, setColWidths] = React.useState({
    select: 44,
    date: 140,
    type: 80,
    description: 280,
    category: 150,
    ai_category: 150,
    amount: 120,
    actions: 110,
  } as { [k: string]: number });

  // AI prediction state
  const [isPredicting, setIsPredicting] = React.useState(false);
  const [isClearing, setIsClearing] = React.useState(false);
  const [predictionProgress, setPredictionProgress] = React.useState(0);
  const [selectedModel, setSelectedModel] = React.useState<GeminiModel>(getStoredModel);
  const [predictionError, setPredictionError] = React.useState<string | null>(null);

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
    const sortableItems: Transaction[] = [...transactions];
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

  // Calculate transactions that need AI categorization
  const transactionsNeedingAI = React.useMemo(() => {
    return transactions.filter(t => !t.ai_category);
  }, [transactions]);

  const allHaveAICategories = transactionsNeedingAI.length === 0;

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
      setSelectedIds((prev) => {
        if (!prev.has(transactionId)) return prev;
        const next = new Set(prev);
        next.delete(transactionId);
        return next;
      });
    } finally {
      setDeletingId(null);
    }
  };

  // Filter-like view (column filters or AI search): rows are selected by default.
  const filterActive = isTransactionFilterActive(filters) || searchActive;

  const selectableTransactions = React.useMemo(
    () => transactions.filter((t) => t.id !== undefined && t.id !== null),
    [transactions]
  );

  const selectedTransactions = React.useMemo(
    () => selectableTransactions.filter((t) => selectedIds.has(t.id!)),
    [selectableTransactions, selectedIds]
  );

  const allSelected =
    selectableTransactions.length > 0 && selectedTransactions.length === selectableTransactions.length;
  const someSelected = selectedTransactions.length > 0 && !allSelected;

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
      setSelectedIds(new Set());
    } else {
      setSelectedIds(
        new Set(
          selectableTransactions.map((t) => t.id as number)
        )
      );
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  const selectedNeedingAI = React.useMemo(
    () => selectedTransactions.filter((t) => !t.ai_category),
    [selectedTransactions]
  );

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

  const handleLocalFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
      if (a.transactionId !== undefined) {
        map.set(a.transactionId, a);
      }
    }
    return map;
  }, [anomalies]);

  const selectedWithPredictions = React.useMemo(
    () => selectedTransactions.filter((t) => t.ai_category),
    [selectedTransactions]
  );

  // Clear only the selected rows' predictions; other rows keep theirs.
  const handleClearPredictions = async () => {
    if (isClearing || selectedWithPredictions.length === 0) return;
    if (!window.confirm(`Clear AI predictions for ${selectedWithPredictions.length} selected transaction(s)? Other rows will keep their predictions.`)) return;

    setIsClearing(true);
    try {
      await clearTransactionAICategories(selectedWithPredictions.map((t) => t.id as number));
      if (onRefreshData) {
        await onRefreshData();
      }
    } catch (error) {
      console.error('Failed to clear predictions:', error);
    } finally {
      setIsClearing(false);
    }
  };

  // Predict AI categories handler
  const handlePredictCategories = async () => {
    if (transactionsNeedingAI.length === 0 || isPredicting) return;

    setIsPredicting(true);
    setPredictionProgress(0);
    setPredictionError(null);

    try {
      const BATCH_SIZE = 20;
      const batches = [];
      for (let i = 0; i < transactionsNeedingAI.length; i += BATCH_SIZE) {
        batches.push(transactionsNeedingAI.slice(i, i + BATCH_SIZE));
      }

      const allPredictions: { id: number; ai_category: string }[] = [];

      try {
        localStorage.setItem(MODEL_STORAGE_KEY, selectedModel);
      } catch {
        // ignore persistence errors
      }

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const predictions = await predictTransactionCategoriesBatch(batch, selectedModel);
        allPredictions.push(...predictions);
        setPredictionProgress(Math.round(((i + 1) / batches.length) * 100));
      }

      // Update database
      await updateTransactionAICategoriesBatch(allPredictions);

      // Refresh data
      if (onRefreshData) {
        await onRefreshData();
      }

      setPredictionProgress(0);
    } catch (error) {
      await handlePredictionFailure(error, 'Prediction');
    } finally {
      setIsPredicting(false);
    }
  };

  // Treat the auto-applied current year from summary as baseline (not a user filter).
  const isFiltered = isTransactionFilterActive(filters);
  return (
    <div className="glass-panel animated-border p-4 sm:p-6 rounded-xl shadow-lg">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
        <div className="flex flex-col">
          <h3 className="text-xl font-semibold rainbow-text drop-shadow-sm">All Transactions</h3>
          <span className="text-xs font-medium tracking-wide opacity-80 mt-0.5">Rows: {transactions.length}{isFiltered && <span className="ml-2 px-2 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary">Filtered</span>}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePredictCategories}
              disabled={isPredicting || allHaveAICategories}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5 ${isPredicting || allHaveAICategories
                ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
              title={allHaveAICategories ? 'All transactions have AI categories' : `Predict categories using ${selectedModel}`}
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
              className="bg-light-bg dark:bg-dark-bg border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 text-sm focus:ring-2 focus:ring-brand-primary max-w-[11rem]"
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
            onClick={handleClearPredictions}
            disabled={isClearing || selectedWithPredictions.length === 0}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5 ${isClearing || selectedWithPredictions.length === 0
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
          <select
            name="aiCategory"
            value={filters.aiCategory}
            onChange={handleLocalFilterChange}
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
      {selectedIds.size > 0 && (
        <div
          className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/30 px-3 py-2 text-sm"
          role="status"
          aria-label={`${selectedIds.size} rows selected`}
        >
          <span className="font-medium">{selectedIds.size} selected</span>
          <button
            onClick={() => exportTransactionsCsv('transactions-selected', selectedTransactions)}
            disabled={selectedTransactions.length === 0}
            className="px-3 py-1.5 text-sm rounded-md bg-brand-primary text-white hover:bg-brand-primary/90 transition-colors disabled:opacity-50"
            title="Download selected rows as CSV"
            aria-label="Export selected rows to CSV"
          >
            Export selected
          </button>
          <button
            onClick={handlePredictSelected}
            disabled={isPredicting || selectedNeedingAI.length === 0}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5 ${isPredicting || selectedNeedingAI.length === 0
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
            className="px-3 py-1.5 text-sm rounded-md bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-800/40 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            title="Delete all selected rows"
            aria-label="Delete selected rows"
          >
            {isBulkDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Delete selected
          </button>
          <button
            onClick={clearSelection}
            className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-brand-primary dark:hover:text-brand-primary transition-colors"
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
          className="mb-3 flex items-center justify-between gap-2 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm text-red-700 dark:text-red-300"
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
      <div className="overflow-x-auto max-h-[480px] overflow-y-auto" onScroll={handleScrollLoadMore}>
        <table className="w-full text-sm text-left table-fixed">
          <colgroup>
            <col style={{ width: colWidths.select }} />
            <col style={{ width: colWidths.date }} />
            <col style={{ width: colWidths.type }} />
            <col style={{ width: colWidths.description }} />
            <col style={{ width: colWidths.category }} />
            <col style={{ width: colWidths.ai_category }} />
            <col style={{ width: colWidths.amount }} />
            <col style={{ width: colWidths.actions }} />
          </colgroup>
          <thead className="sticky top-0 z-10 bg-gray-100 dark:bg-gray-700/50 shadow-sm">
            <tr>
              <th className="px-4 py-3 w-11" onClick={(e) => e.stopPropagation()}>
                <input
                  ref={headerCheckboxRef}
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  disabled={selectableTransactions.length === 0}
                  className="h-4 w-4 accent-purple-600 cursor-pointer"
                  title={allSelected ? 'Deselect all rows' : 'Select all rows'}
                  aria-label={allSelected ? 'Deselect all rows' : 'Select all rows'}
                />
              </th>
              {['date', 'type', 'description', 'category', 'ai_category', 'amount', 'actions'].map((key) => (
                <th
                  key={key}
                  className={`px-4 py-3 font-semibold ${key === 'actions' ? 'text-right' : ''} text-light-text-secondary dark:text-dark-text-secondary cursor-pointer group relative select-none`}
                  onClick={() => key !== 'actions' && requestSort(key as SortKey)}
                >
                  <div className="flex items-center">
                    <span>{key === 'ai_category' ? 'AI Category' : key.charAt(0).toUpperCase() + key.slice(1)}</span>
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
              const isSelected = t.id !== undefined && selectedIds.has(t.id);
              return (
                <tr key={t.id} className={`gradient-table-row border-b border-gray-200 dark:border-gray-700 last:border-b-0 transition-colors ${anomalyClass} ${isSelected ? 'bg-purple-50 dark:bg-purple-950/20' : ''}`}>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
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
                  </td>
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
                  <td className="px-4 py-3">
                    {t.ai_category ? (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 whitespace-nowrap inline-flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        {t.ai_category}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 dark:text-gray-500 italic">Not predicted</span>
                    )}
                  </td>
                  <td className={`px-4 py-3 font-mono text-right ${t.type === 'credit' ? 'text-green-500' : 'text-red-500'}`}>
                    {formatAmount(t.amount, t.type)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => onEdit(t)} title="Edit" aria-label={`Edit transaction ${t.description}`} className="p-1.5 text-gray-500 hover:text-brand-primary hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => t.id && handleDeleteClick(t.id)} disabled={deletingId === t.id} title="Delete" aria-label={`Delete transaction ${t.description}`} className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors disabled:opacity-50">
                        {deletingId === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {visibleRows.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-8 text-light-text-secondary dark:text-dark-text-secondary">
                  No transactions found.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot className="sticky bottom-0 z-10 bg-gray-100 dark:bg-gray-700/50 shadow-inner">
            <tr className="font-semibold">
              <td></td>
              <td colSpan={5} className="px-4 py-3 text-right">Total</td>
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