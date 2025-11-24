import React from 'react';
import { AnalysisResult, Transaction, ForecastResult } from '../types.ts';
import { VirtualizedTransactionList } from './VirtualizedTransactionList.tsx';
import Summary from './Summary.tsx';
import ForecastSummary from './ForecastSummary.tsx';
import CategoryChart from './CategoryChart.tsx';
import TransactionList from './TransactionList.tsx';
import MonthlySummaryTable from './MonthlySummaryTable.tsx';
import TrendsChart from './TrendsChart.tsx';
import NaturalLanguageSearch from './NaturalLanguageSearch.tsx';
import { FinancialAdvisorChat } from './FinancialAdvisorChat.tsx';
import { Upload, CalendarDays, Info, Brain, BarChart3, RefreshCw, AlertTriangle, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { useLastUpload, formatLastUpload } from '../hooks/useLastUpload.ts';
import { generateAIForecast, GEMINI_MODELS, type GeminiModel } from '../services/geminiService.ts';
import { buildForecast } from '../domain/analytics/forecast.ts';

interface DashboardProps {
  analysisResult: AnalysisResult;
  onFileUpload: (file: File) => void;
  isUploading: boolean;
  onEditTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (transactionId: number) => Promise<void>;
  onRefreshData: () => void; // Callback to refresh transaction data
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
  onRefreshData,
  userId,
}) => {
  const { summary, transactions: allTransactions, forecast, anomalies } = analysisResult;
  // Local UI state hooks first for stable ordering
  const [popoverOpen, setPopoverOpen] = React.useState(false);
  const [filters, setFilters] = React.useState(initialFilters);
  const [aiSearchResults, setAiSearchResults] = React.useState(null as Transaction[] | null);
  const [aiSearchQuery, setAiSearchQuery] = React.useState('');
  const [chatPanelWidth, setChatPanelWidth] = React.useState(0);
  const [enhancedForecast, setEnhancedForecast] = React.useState(forecast as ForecastResult | undefined);
  const [isGeneratingForecast, setIsGeneratingForecast] = React.useState(false);
  const [forecastError, setForecastError] = React.useState(null as string | null);
  const [useAIForecast, setUseAIForecast] = React.useState(true);
  const [selectedForecastModel, setSelectedForecastModel] = React.useState(GEMINI_MODELS.FLASH_LITE as GeminiModel);
  const [showForecastModelSelector, setShowForecastModelSelector] = React.useState(false);
  const [forecastCacheKey, setForecastCacheKey] = React.useState('');
  const [hasCachedForecast, setHasCachedForecast] = React.useState(false);
  const [isForecastExpanded, setIsForecastExpanded] = React.useState(false);
  const reducedMotion = React.useMemo((): boolean => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);
  const fileInputRef = React.useRef(null);
  // Data hooks after UI state to avoid accidental ordering changes when adding new state hooks
  const { lastUpload, setLastUpload, loadingLastUpload } = useLastUpload(userId);

  // Helper function to get friendly model name
  const getForecastModelDisplayName = (model: GeminiModel): string => {
    switch (model) {
      case GEMINI_MODELS.PRO_LATEST:
        return 'Pro';
      case GEMINI_MODELS.FLASH_LATEST:
        return 'Flash';
      case GEMINI_MODELS.FLASH_2_0:
        return 'Flash 2.0';
      case GEMINI_MODELS.FLASH_LITE:
        return 'Flash Lite';
      case GEMINI_MODELS.FLASH_2_5:
        return 'Flash 2.5';
      default:
        return 'Flash Lite';
    }
  };

  // Generate cache key based on transaction data and model
  const generateCacheKey = React.useCallback((transactions: Transaction[], model: GeminiModel): string => {
    // Create a hash-like key from transaction count, last transaction date, and model
    const count = transactions.length;
    const lastDate = transactions.length > 0 ? transactions[transactions.length - 1].date : '';
    const totalAmount = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    return `forecast_${userId}_${count}_${lastDate}_${model}_${totalAmount.toFixed(0)}`;
  }, [userId]);

  // Load cached forecast from localStorage
  const loadCachedForecast = React.useCallback((cacheKey: string): ForecastResult | null => {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        // Check if cache is still valid (less than 24 hours old)
        const cacheTime = new Date(parsed.timestamp).getTime();
        const now = new Date().getTime();
        const hoursDiff = (now - cacheTime) / (1000 * 60 * 60);

        if (hoursDiff < 24) {
          return parsed.forecast;
        } else {
          // Cache expired, remove it
          localStorage.removeItem(cacheKey);
        }
      }
    } catch (error) {
      console.error('Error loading cached forecast:', error);
    }
    return null;
  }, []);

  // Save forecast to localStorage
  const saveForecastToCache = React.useCallback((cacheKey: string, forecast: ForecastResult) => {
    try {
      const cacheData = {
        forecast,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error saving forecast to cache:', error);
    }
  }, []);

  // Generate AI forecast on mount and when transactions change
  React.useEffect(() => {
    const generateForecast = async () => {
      if (!useAIForecast || allTransactions.length === 0) {
        setEnhancedForecast(forecast);
        setHasCachedForecast(false);
        return;
      }

      // Generate cache key
      const cacheKey = generateCacheKey(allTransactions, selectedForecastModel);

      // Check if cache key changed
      if (cacheKey === forecastCacheKey && hasCachedForecast) {
        // Cache is still valid, don't regenerate
        return;
      }

      // Try to load from cache first
      const cachedForecast = loadCachedForecast(cacheKey);
      if (cachedForecast) {
        setEnhancedForecast(cachedForecast);
        setForecastCacheKey(cacheKey);
        setHasCachedForecast(true);
        setForecastError(null);
        return;
      }

      // No valid cache, generate new forecast
      setIsGeneratingForecast(true);
      setForecastError(null);

      try {
        const aiForecastData = await generateAIForecast(allTransactions, selectedForecastModel);
        const enhancedResult = buildForecast(allTransactions, 3, aiForecastData);
        setEnhancedForecast(enhancedResult);

        // Save to cache
        saveForecastToCache(cacheKey, enhancedResult);
        setForecastCacheKey(cacheKey);
        setHasCachedForecast(true);
      } catch (error) {
        console.error('Failed to generate AI forecast:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to generate AI forecast';

        // Check if it's a temporary service issue
        const isTemporaryError = errorMessage.includes('temporarily unavailable') ||
          errorMessage.includes('overloaded') ||
          errorMessage.includes('503');

        if (isTemporaryError) {
          setForecastError('AI service temporarily unavailable. Showing traditional forecast. Please try regenerating in a few minutes.');
        } else {
          setForecastError(errorMessage);
        }

        // Fallback to traditional forecast
        setEnhancedForecast(forecast);
        setHasCachedForecast(false);

        // Auto-clear error after 10 seconds for temporary issues
        if (isTemporaryError) {
          setTimeout(() => setForecastError(null), 10000);
        }
      } finally {
        setIsGeneratingForecast(false);
      }
    };

    generateForecast();
  }, [allTransactions, forecast, useAIForecast, selectedForecastModel, generateCacheKey, loadCachedForecast, saveForecastToCache, forecastCacheKey, hasCachedForecast]);

  const handleRegenerateForecast = async () => {
    if (allTransactions.length === 0) return;

    // Clear cache to force regeneration
    setHasCachedForecast(false);
    setForecastCacheKey('');

    setIsGeneratingForecast(true);
    setForecastError(null);

    try {
      const aiForecastData = await generateAIForecast(allTransactions, selectedForecastModel);
      const enhancedResult = buildForecast(allTransactions, 3, aiForecastData);
      setEnhancedForecast(enhancedResult);

      // Save to cache
      const cacheKey = generateCacheKey(allTransactions, selectedForecastModel);
      saveForecastToCache(cacheKey, enhancedResult);
      setForecastCacheKey(cacheKey);
      setHasCachedForecast(true);
    } catch (error) {
      console.error('Failed to regenerate AI forecast:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to regenerate AI forecast';

      // Check if it's a temporary service issue
      const isTemporaryError = errorMessage.includes('temporarily unavailable') ||
        errorMessage.includes('overloaded') ||
        errorMessage.includes('503');

      if (isTemporaryError) {
        setForecastError('AI service temporarily unavailable. Please try again in a few minutes.');
      } else {
        setForecastError(errorMessage);
      }

      // Auto-clear error after 10 seconds for temporary issues
      if (isTemporaryError) {
        setTimeout(() => setForecastError(null), 10000);
      }
    } finally {
      setIsGeneratingForecast(false);
    }
  };

  const toggleForecastMode = () => {
    setUseAIForecast(!useAIForecast);
    if (useAIForecast) {
      // Switching to traditional
      setEnhancedForecast(forecast);
    }
  };

  // Close model selector when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showForecastModelSelector) {
        const target = event.target as HTMLElement;
        if (!target.closest('.forecast-model-selector-container')) {
          setShowForecastModelSelector(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showForecastModelSelector]);

  const handleUploadClick = () => {
    (fileInputRef.current as HTMLInputElement | null)?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileUpload(file);
      // Reset file input to allow re-uploading the same file
      if (event.target) event.target.value = '';
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
      year: monthYear ? monthYear.substring(0, 4) : null,
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

  const handleAISearchResults = React.useCallback((results: Transaction[], query: string) => {
    setAiSearchResults(results);
    setAiSearchQuery(query);
    // Scroll to transaction list
    setTimeout(() => {
      document.getElementById('transaction-list')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, []);

  const handleClearAISearch = React.useCallback(() => {
    setAiSearchResults(null);
    setAiSearchQuery('');
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
    // If AI search is active, use those results instead
    if (aiSearchResults !== null) {
      return aiSearchResults;
    }

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
  }, [allTransactions, filters, aiSearchResults]);


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
    : `Next data upload window opens on ${nextMonthFirst.toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Kolkata' })}`;

  return (
    <div className="space-y-6" style={{ marginRight: `${chatPanelWidth}px`, transition: 'margin-right 0.3s ease-in-out' }}>
      <div className="relative z-20 flex flex-col sm:flex-row justify-between items-center gap-4">
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
                  <p className="mb-1">Next window: <strong>{nextMonthFirst.toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Kolkata' })}</strong></p>
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
            <span className="sr-only" aria-live="polite">{daysLeft === 0 ? 'Upload day has arrived.' : `${countdownLabel}. Next upload on ${nextMonthFirst.toLocaleDateString('en-IN', { weekday: 'short', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata' })}.`}</span>
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

      {/* Enhanced Forecast with AI Toggle */}
      <div className="space-y-2">
        {forecastError && (
          <div className={`p-3 rounded-lg text-sm border ${forecastError.includes('temporarily unavailable')
            ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
            }`}>
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <strong className="font-semibold">
                  {forecastError.includes('temporarily unavailable') ? 'Service Notice:' : 'Forecast Error:'}
                </strong>
                {' '}{forecastError}
              </div>
            </div>
          </div>
        )}

        {/* Cached indicator */}
        {hasCachedForecast && useAIForecast && !isGeneratingForecast && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-2 rounded-lg text-xs text-blue-800 dark:text-blue-200">
            📦 Using cached forecast (valid for 24 hours) • Click "Regenerate" to refresh
          </div>
        )}

        <div
          className="flex items-center justify-between mb-2 cursor-pointer p-3 rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 hover:from-indigo-100 hover:to-purple-100 dark:hover:from-indigo-900/30 dark:hover:to-purple-900/30 transition-colors"
          onClick={() => setIsForecastExpanded(!isForecastExpanded)}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleForecastMode();
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${useAIForecast
                ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
            >
              {useAIForecast ? (
                <>
                  <Brain className="w-4 h-4" />
                  AI Forecast
                </>
              ) : (
                <>
                  <BarChart3 className="w-4 h-4" />
                  Traditional Forecast
                </>
              )}
            </button>

            {useAIForecast && isForecastExpanded && (
              <>
                {/* Model Selector */}
                <div className="relative forecast-model-selector-container">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowForecastModelSelector(!showForecastModelSelector);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    {getForecastModelDisplayName(selectedForecastModel)}
                  </button>

                  {showForecastModelSelector && (
                    <div className="absolute top-full mt-1 left-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 min-w-[200px]">
                      <div className="p-2">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 px-2">Select AI Model</div>
                        {Object.entries(GEMINI_MODELS).map(([key, modelValue]) => (
                          <button
                            key={key}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedForecastModel(modelValue);
                              setShowForecastModelSelector(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${selectedForecastModel === modelValue
                              ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                              : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                              }`}
                          >
                            {getForecastModelDisplayName(modelValue)}
                            {modelValue === GEMINI_MODELS.FLASH_LITE && ' (Default)'}
                            {modelValue === GEMINI_MODELS.FLASH_LATEST && ' (Fallback)'}
                          </button>
                        ))}
                      </div>
                      <div className="border-t border-gray-200 dark:border-gray-700 p-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400 px-2">
                          Flash Lite is fast and efficient. Pro models provide deeper insights but use more tokens.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRegenerateForecast();
                  }}
                  disabled={isGeneratingForecast}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isGeneratingForecast ? 'animate-spin' : ''}`} />
                  {isGeneratingForecast ? 'Generating...' : 'Regenerate'}
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {isForecastExpanded ? 'Click to minimize' : 'Click to expand'}
            </span>
            {isForecastExpanded ? (
              <ChevronUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            )}
          </div>
        </div>

        {isForecastExpanded && <ForecastSummary forecast={enhancedForecast} />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <CategoryChart transactions={chartFilteredTransactions} />
        <TrendsChart transactions={chartFilteredTransactions} />
      </div>

      <MonthlySummaryTable userId={userId} transactions={allTransactions} onCellClick={handleMonthlyCellClick} onFiltersChange={handleSummaryFiltersChange} />

      {/* Natural Language AI Search */}
      <NaturalLanguageSearch
        allTransactions={allTransactions}
        onSearchResults={handleAISearchResults}
        onClearSearch={handleClearAISearch}
      />

      <div id="transaction-list" className="mt-4">
        {/* Unified transactions table styling: always use full feature TransactionList */}
        <TransactionList
          transactions={filteredTransactions}
          filters={filters}
          anomalies={anomalies}
          onFilterChange={handleFilterChange}
          onResetFilters={handleResetFilters}
          onEdit={onEditTransaction}
          onDelete={onDeleteTransaction}
          onRefreshData={onRefreshData}
        />
      </div>

      {/* Financial Advisor Chatbot */}
      <FinancialAdvisorChat transactions={allTransactions} onOpenChange={setChatPanelWidth} />
    </div >
  );
};


export default Dashboard;