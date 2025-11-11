import React from 'react';
import { AnalysisResult, Transaction } from '../types.ts';
import { VirtualizedTransactionList } from './VirtualizedTransactionList.tsx';
import Summary from './Summary.tsx';
import ForecastSummary from './ForecastSummary.tsx';
import CategoryChart from './CategoryChart.tsx';
import TransactionList from './TransactionList.tsx';
import MonthlySummaryTable from './MonthlySummaryTable.tsx';
import TrendsChart from './TrendsChart.tsx';
import { Upload, CalendarDays, Info } from 'lucide-react';
import { useLastUpload, formatLastUpload } from '../hooks/useLastUpload.ts';

interface DashboardProps {
  analysisResult: AnalysisResult;
  onFileUpload: (file: File) => void;
  isUploading: boolean;
  onEditTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (transactionId: number) => Promise<void>;
  userId: string; // current authenticated user id for budgets
}

export interface TransactionFilters {
  globalSearch: string;
  date: string;
  description: string;
  category: string;
  amount: string;
  type: 'debit' | 'credit' | 'all';
  monthYear: string | null; // YYYY-MM
  year: string | null; // YYYY (from monthly summary filter)
}

const initialFilters: TransactionFilters = {
  globalSearch: '',
  date: '',
  description: '',
  category: '',
  amount: '',
  type: 'all',
  monthYear: null,
  year: null,
};

const Dashboard: React.FC<DashboardProps> = ({ 
  analysisResult, 
  onFileUpload, 
  isUploading,
  onEditTransaction,
  onDeleteTransaction,
  userId,
}) => {
  const { summary, transactions: allTransactions, forecast, anomalies } = analysisResult;
  // Local UI state hooks first for stable ordering
  const [popoverOpen, setPopoverOpen] = React.useState(false);
  const [filters, setFilters] = React.useState(initialFilters);
  const reducedMotion = React.useMemo((): boolean => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);
  const fileInputRef = React.useRef(null);
  // Data hooks after UI state to avoid accidental ordering changes when adding new state hooks
  const { lastUpload, setLastUpload, loadingLastUpload } = useLastUpload(userId);

  const handleUploadClick = () => {
    (fileInputRef.current as HTMLInputElement | null)?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
          onFileUpload(file);
          // Reset file input to allow re-uploading the same file
          if(event.target) event.target.value = '';
      const nowIso = new Date().toISOString();
      // Persist to Supabase (shared across devices)
      setLastUpload(nowIso);
      }
  };

  const handleFilterChange = React.useCallback((newFilters: Partial<TransactionFilters>) => {
    setFilters((prev: TransactionFilters) => ({ ...prev, ...newFilters }));
  }, []);
  
  const handleResetFilters = React.useCallback(() => {
    setFilters(initialFilters);
  }, []);

  const handleMonthlyCellClick = React.useCallback((monthYear: string | null, transactionType: 'debit' | 'credit' | null, category: string) => {
    setFilters({
      ...initialFilters,
      monthYear,
      year: monthYear ? monthYear.substring(0,4) : null,
      type: transactionType || 'all',
      category: category === 'All' ? '' : category,
    });
    document.getElementById('transaction-list')?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleSummaryFiltersChange = React.useCallback(({ year, category }: { year: string; category: string }) => {
    setFilters((prev: TransactionFilters) => ({
      ...prev,
      year: year === 'All' ? null : year,
      category: category === 'All' ? '' : category,
      // Reset month-year when changing high-level year/category to avoid stale narrow filter
      monthYear: null,
    }));
  }, []);

  // Derived filtered dataset used by charts and transaction list.
  const chartFilteredTransactions = React.useMemo(() => {
    return allTransactions.filter(t => {
      const matchYear = filters.year ? t.date.startsWith(filters.year) : true;
      const matchMonthYear = filters.monthYear ? t.date.startsWith(filters.monthYear) : true;
      const matchCategory = filters.category ? t.category.toLowerCase().includes(filters.category.toLowerCase()) : true;
      return matchYear && matchMonthYear && matchCategory;
    });
  }, [allTransactions, filters.year, filters.monthYear, filters.category]);

  const filteredTransactions = React.useMemo(() => {
    return allTransactions.filter(t => {
      const matchGlobal = filters.globalSearch
        ? Object.values(t).some(val => String(val).toLowerCase().includes(filters.globalSearch.toLowerCase()))
        : true;

      const matchDate = filters.date ? t.date.includes(filters.date) : true;
      const matchDescription = filters.description ? t.description.toLowerCase().includes(filters.description.toLowerCase()) : true;
      const matchCategory = filters.category ? t.category.toLowerCase().includes(filters.category.toLowerCase()) : true;
      
      const matchAmount = filters.amount ? String(Math.abs(t.amount)).includes(filters.amount) : true;
      
      const matchType = filters.type === 'all' || t.type === filters.type;
      
      const matchMonthYear = filters.monthYear
        ? t.date.startsWith(filters.monthYear)
        : true;
        
      return matchGlobal && matchDate && matchDescription && matchCategory && matchAmount && matchType && matchMonthYear;
    });
  }, [allTransactions, filters]);


  // Days left until next month's 1st (data upload day)
  const today = new Date();
  const nextMonthFirst = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const msInDay = 1000 * 60 * 60 * 24;
  const rawDaysLeft = (nextMonthFirst.getTime() - today.getTime()) / msInDay;
  const daysLeft = Math.max(0, Math.ceil(rawDaysLeft));

  const currentMonthFirst = new Date(today.getFullYear(), today.getMonth(), 1);
  const totalCycleDays = Math.round((nextMonthFirst.getTime() - currentMonthFirst.getTime()) / msInDay);
  const daysElapsed = totalCycleDays - daysLeft;
  const progressPct = Math.min(100, Math.max(0, (daysElapsed / totalCycleDays) * 100));

  // Styling thresholds:
  // >7 days: calm gradient (success state)
  // 4-7 days: warning gradient (gentle attention)
  // 1-3 days: high warning solid amber
  // 0 days: action pulse primary
  let baseClass = 'relative isolate text-white transition-colors duration-500 rounded-xl';
  let bgClass = '';
  let ringClass = '';
  if (daysLeft === 0) {
    bgClass = reducedMotion ? 'bg-brand-primary' : 'bg-brand-primary animate-pulse';
    ringClass = 'ring-2 ring-brand-primary/60 shadow-[0_0_0.5rem_-0.1rem_rgba(255,255,255,0.6)]';
  } else if (daysLeft <= 3) {
    bgClass = 'bg-amber-600';
    ringClass = 'ring-2 ring-amber-400/70 shadow-[0_0_0.75rem_-0.15rem_rgba(255,193,7,0.5)]';
  } else if (daysLeft <= 7) {
    bgClass = 'bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-600';
    ringClass = 'ring-2 ring-amber-300/60 shadow-[0_0_0.75rem_-0.15rem_rgba(255,170,0,0.45)]';
  } else {
    bgClass = 'bg-gradient-to-r from-emerald-500 via-teal-600 to-blue-600';
    ringClass = 'ring-2 ring-teal-300/50 shadow-[0_0_0.75rem_-0.2rem_rgba(0,200,170,0.45)]';
  }

  const countdownLabel = daysLeft === 0
    ? 'Upload today!'
    : daysLeft === 1
      ? 'Tomorrow'
      : `${daysLeft} days left`;
  const tooltip = daysLeft === 0
    ? 'Monthly data upload window is open (1st of month).'
    : `Next data upload window opens on ${nextMonthFirst.toLocaleDateString(undefined,{ weekday:'short', year:'numeric', month:'short', day:'numeric'})}`;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h2 className="text-3xl font-bold text-light-text dark:text-dark-text">Financial Overview</h2>
        <div className="flex items-center gap-3">
          {/* Countdown pill next to upload */}
          <div
            className={`group flex items-center gap-3 pl-4 pr-5 py-2 text-sm font-semibold ${baseClass} ${bgClass} ${ringClass} shadow-lg cursor-pointer select-none`}
            aria-label={tooltip}
            title={tooltip}
            onClick={() => setPopoverOpen((open: boolean) => !open)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPopoverOpen((open: boolean) => !open); } }}
            role="button"
            tabIndex={0}
          >
            {/* Radial progress ring */}
            <div className="relative flex items-center justify-center">
              <svg width="42" height="42" className="-ml-1">
                <circle cx="21" cy="21" r="18" stroke="rgba(255,255,255,0.25)" strokeWidth="4" fill="none" />
                <circle
                  cx="21" cy="21" r="18"
                  stroke="rgba(255,255,255,0.85)"
                  strokeWidth="4"
                  fill="none"
                  strokeLinecap="round"
                  style={{
                    strokeDasharray: 2 * Math.PI * 18,
                    strokeDashoffset: (1 - progressPct / 100) * 2 * Math.PI * 18,
                    transition: 'stroke-dashoffset 0.8s ease'
                  }}
                />
              </svg>
              <CalendarDays className="h-5 w-5 absolute text-white/90" />
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] uppercase tracking-wide opacity-80">Next Upload</span>
              <span className="leading-tight">{countdownLabel}</span>
            </div>
            {/* Info trigger */}
            <div className="relative flex items-center">
              <Info className="h-4 w-4 opacity-80 group-hover:opacity-100 transition-opacity" />
              {/* Clickable Popover */}
              {popoverOpen && (
                <div className="animate-fadeIn absolute left-1/2 -translate-x-1/2 top-full mt-2 min-w-[240px] z-10 p-3 rounded-lg bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border shadow-xl text-[11px] text-light-text dark:text-dark-text">
                  <p className="font-medium mb-1 flex items-center gap-1">Monthly Upload Cycle</p>
                  <p className="mb-1">Next window: <strong>{nextMonthFirst.toLocaleDateString(undefined,{ weekday:'short', year:'numeric', month:'short', day:'numeric'})}</strong></p>
                  <p className="mb-1">Days elapsed: {daysElapsed} / {totalCycleDays}</p>
                  <p className="mb-1">Progress: {progressPct.toFixed(0)}%</p>
                  <p className="mb-1">Last upload: {loadingLastUpload ? 'Loading…' : formatLastUpload(lastUpload)}</p>
                  <p className="italic opacity-70">Upload on the 1st to keep analytics current.</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); setPopoverOpen(false); }}
                    className="mt-2 px-2 py-1 rounded bg-brand-primary text-white text-[10px] hover:bg-brand-primary/90"
                  >Close</button>
                </div>
              )}
            </div>
            {/* Animated gradient overlay for >7 days */}
            {daysLeft > 7 && !reducedMotion && (
              <div className="absolute inset-0 rounded-xl mix-blend-overlay pointer-events-none animate-[gradientShift_12s_linear_infinite]" style={{ background: 'linear-gradient(120deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02), rgba(255,255,255,0.10))' }} />
            )}
            {/* aria-live region */}
            <span className="sr-only" aria-live="polite">{daysLeft === 0 ? 'Upload day has arrived.' : `${countdownLabel}. Next upload on ${nextMonthFirst.toLocaleDateString(undefined,{ weekday:'short', month:'long', day:'numeric'})}.`}</span>
          </div>
          <input 
            id="file-upload"
            name="file-upload"
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept=".xls,.xlsx"
          />
          <button
            onClick={handleUploadClick}
            disabled={isUploading}
            className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 transition-colors disabled:opacity-50 disabled:cursor-wait"
          >
            <Upload className="h-5 w-5" />
            {isUploading ? 'Processing...' : 'Upload XLS File'}
          </button>
        </div>
      </div>

      {/* Removed standalone countdown block now that pill sits beside upload button */}

  <Summary summary={summary} />
  <ForecastSummary forecast={forecast} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <CategoryChart transactions={chartFilteredTransactions} />
        <TrendsChart transactions={chartFilteredTransactions} />
      </div>
      
  <MonthlySummaryTable userId={userId} transactions={allTransactions} onCellClick={handleMonthlyCellClick} onFiltersChange={handleSummaryFiltersChange} />

      <div id="transaction-list" className="mt-4">
        {filteredTransactions.length > 800 ? (
          <div className="space-y-3">
            <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">Showing virtualized list for performance (total {filteredTransactions.length}).</p>
            <VirtualizedTransactionList
              transactions={filteredTransactions}
              onEdit={onEditTransaction}
              onDelete={onDeleteTransaction}
              height={640}
              rowHeight={50}
            />
          </div>
        ) : (
          <TransactionList 
            transactions={filteredTransactions} 
            filters={filters}
            anomalies={anomalies}
            onFilterChange={handleFilterChange}
            onResetFilters={handleResetFilters}
            onEdit={onEditTransaction}
            onDelete={onDeleteTransaction}
          />
        )}
      </div>
    </div>
  );
};

export default Dashboard;