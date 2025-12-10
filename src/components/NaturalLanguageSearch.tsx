import React from 'react';
import { Search, Sparkles, Loader2, X, Settings } from 'lucide-react';
import { searchTransactionsWithAI, GEMINI_MODELS, GeminiModel, SearchResult } from '../services/geminiService';
import { Transaction } from '../types';
import AIChart from './AIChart';

interface NaturalLanguageSearchProps {
  allTransactions: Transaction[];
  onSearchResults: (results: Transaction[], query: string) => void;
  onClearSearch: () => void;
}

const NaturalLanguageSearch: React.FC<NaturalLanguageSearchProps> = ({
  allTransactions,
  onSearchResults,
  onClearSearch,
}) => {
  const [query, setQuery] = React.useState('');
  const [isSearching, setIsSearching] = React.useState(false);
  const [error, setError] = React.useState('');
  const [activeSearch, setActiveSearch] = React.useState('');
  const [selectedModel, setSelectedModel] = React.useState(GEMINI_MODELS.PRO_LATEST as GeminiModel);
  const [showModelSelector, setShowModelSelector] = React.useState(false);
  const [fallbackAlert, setFallbackAlert] = React.useState('');
  const [searchResult, setSearchResult] = React.useState(null as SearchResult | null);

  const getModelDisplayName = (model: GeminiModel): string => {
    const names: Record<GeminiModel, string> = {
      [GEMINI_MODELS.PRO_LATEST]: 'Pro',
      [GEMINI_MODELS.FLASH_LATEST]: 'Flash',
      [GEMINI_MODELS.FLASH_2_0]: 'Flash 2.0',
      [GEMINI_MODELS.FLASH_LITE]: 'Flash Lite',
      [GEMINI_MODELS.FLASH_2_5]: 'Flash 2.5',
      [GEMINI_MODELS.GEMMA_3]: 'Gemma 3',
    };
    return names[model] || 'Pro';
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setError('');
    setFallbackAlert('');

    try {
      const result = await searchTransactionsWithAI(query, allTransactions, selectedModel);
      setActiveSearch(query);
      setSearchResult(result);
      
      if (result.usedFallback) {
        setFallbackAlert(`⚠️ ${result.fallbackReason} on ${getModelDisplayName(selectedModel)} model. Automatically switched to ${getModelDisplayName(GEMINI_MODELS.FLASH_LATEST)} model.`);
      }
      
      onSearchResults(result.transactions, query);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      console.error('Natural language search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const runSearch = async (q: string) => {
    if (!q.trim()) return;
    setQuery(q);
    setIsSearching(true);
    setError('');
    setFallbackAlert('');

    try {
      const result = await searchTransactionsWithAI(q, allTransactions, selectedModel);
      setActiveSearch(q);
      setSearchResult(result);

      if (result.usedFallback) {
        setFallbackAlert(`⚠️ ${result.fallbackReason} on ${getModelDisplayName(selectedModel)} model. Automatically switched to ${getModelDisplayName(GEMINI_MODELS.FLASH_LATEST)} model.`);
      }

      onSearchResults(result.transactions, q);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      console.error('Natural language search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setActiveSearch('');
    setError('');
    setFallbackAlert('');
    setSearchResult(null);
    onClearSearch();
  };

  return (
    <div className="glass-panel p-4 rounded-xl space-y-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="font-semibold text-gray-900 dark:text-white">
            AI-Powered Search
          </h3>
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowModelSelector(!showModelSelector)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition font-medium"
          >
            <Settings className="h-3 w-3" />
            {getModelDisplayName(selectedModel)}
          </button>
          
          {showModelSelector && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 p-2">
              <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 px-2">Select AI Model</div>
              {Object.entries(GEMINI_MODELS).map(([key, value]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setSelectedModel(value);
                    setShowModelSelector(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs rounded transition ${
                    selectedModel === value
                      ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-semibold'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {value}
                  {value === GEMINI_MODELS.PRO_LATEST && (
                    <span className="ml-2 text-[10px] text-green-600 dark:text-green-400">(Default)</span>
                  )}
                  {value === GEMINI_MODELS.FLASH_LATEST && (
                    <span className="ml-2 text-[10px] text-blue-600 dark:text-blue-400">(Fallback)</span>
                  )}
                </button>
              ))}
              <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 px-2">
                <p className="text-[10px] text-gray-500 dark:text-gray-400">
                  Pro model auto-switches to Flash on rate limit
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSearch} className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask anything... e.g., 'Show shopping expenses over ₹5000 last month'"
            className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            disabled={isSearching}
          />
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isSearching || !query.trim()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSearching ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Search with AI
              </>
            )}
          </button>

          {activeSearch && (
            <button
              type="button"
              onClick={handleClear}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-semibold transition"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </form>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {fallbackAlert && (
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="text-sm text-amber-700 dark:text-amber-300">{fallbackAlert}</p>
        </div>
      )}

      {activeSearch && (
        <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg">
          <p className="text-sm text-indigo-700 dark:text-indigo-300">
            <span className="font-semibold">Search:</span> "{activeSearch}"
          </p>
        </div>
      )}

      <div className="text-xs text-gray-500 dark:text-gray-400 space-y-2">
        <p className="font-semibold">Try asking:</p>
        <div className="flex flex-wrap gap-2">
          {[
            'Show all shopping expenses over ₹5000',
            'What did I spend on groceries in October?',
            'Find all UPI transactions from last month',
            'Generate a chart for my top 10 expenses in 2025',
            'Show pie chart of expenses by category'
          ].map((sugg) => (
            <button
              key={sugg}
              type="button"
              onClick={() => runSearch(sugg)}
              disabled={isSearching}
              className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md text-gray-700 dark:text-gray-200 transition"
            >
              {sugg}
            </button>
          ))}
        </div>
      </div>

      {/* AI Generated Chart */}
      {searchResult && searchResult.visualize && searchResult.transactions.length > 0 && (
        <AIChart
          transactions={searchResult.transactions}
          chartType={searchResult.chartType || 'bar'}
          title={searchResult.chartTitle || 'Transaction Analysis'}
          onClose={() => setSearchResult(null)}
        />
      )}
    </div>
  );
};

export default NaturalLanguageSearch;
