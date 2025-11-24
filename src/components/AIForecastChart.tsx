import React from 'react';
import { TrendingUp, Calendar, AlertCircle } from 'lucide-react';
import { forecastNetWorth, NetWorthForecast } from '../services/netWorthAI';
import { NetWorthSnapshot, Liability } from '../domain/networth/calculateNetWorth';

import { GEMINI_MODELS, GeminiModel } from '../services/geminiService';

interface Props {
  timeline: NetWorthSnapshot[];
  liabilities: Liability[];
}

export const AIForecastChart: React.FC<Props> = ({ timeline, liabilities }) => {
  const [forecast, setForecast] = React.useState(null as NetWorthForecast | null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [monthsAhead, setMonthsAhead] = React.useState(12);
  const [isUsingCache, setIsUsingCache] = React.useState(false);
  const [selectedModel, setSelectedModel] = React.useState(GEMINI_MODELS.FLASH_LATEST as GeminiModel);
  const lastCacheKeyRef = React.useRef('');

  // Create stable cache key based on actual data content, not references
  const cacheKey = React.useMemo(() => {
    const timelineData = timeline.map(t => `${t.month}-${t.netWorth}`).join('|');
    const liabilitiesData = liabilities.map(l => `${l.id}-${l.principal}`).join('|');
    return `${timelineData}-${liabilitiesData}-${monthsAhead}-${selectedModel}`;
  }, [timeline, liabilities, monthsAhead, selectedModel]);

  const generateForecast = React.useCallback(async (force = false) => {
    // Check if we already have data for this key in memory
    if (!force && lastCacheKeyRef.current === cacheKey && forecast) {
      console.log('✅ Using cached forecast (memory)');
      setIsUsingCache(true);
      setTimeout(() => setIsUsingCache(false), 2000);
      return;
    }

    const storageKey = `ai_forecast_${cacheKey}`;
    const cachedData = localStorage.getItem(storageKey);

    if (!force && cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        setForecast(parsed);
        lastCacheKeyRef.current = cacheKey; // Mark as loaded
        console.log('✅ Using cached forecast from storage');
        setIsUsingCache(true);
        setTimeout(() => setIsUsingCache(false), 2000);
        return;
      } catch (e) {
        console.error('Failed to parse cached forecast', e);
        localStorage.removeItem(storageKey);
      }
    }

    setIsUsingCache(false);
    setIsLoading(true);
    try {
      const result = await forecastNetWorth(timeline, liabilities, monthsAhead, selectedModel);
      setForecast(result);
      localStorage.setItem(storageKey, JSON.stringify(result));
      lastCacheKeyRef.current = cacheKey;
      console.log('🔄 Fetched new forecast from API');
    } catch (error) {
      console.error('Failed to generate forecast:', error);
    } finally {
      setIsLoading(false);
    }
  }, [cacheKey, timeline, liabilities, monthsAhead, selectedModel]);

  React.useEffect(() => {
    if (timeline.length >= 3) {
      generateForecast();
    }
  }, [cacheKey, generateForecast, timeline.length]);

  if (timeline.length < 3) {
    return (
      <div className="glass-panel p-6 rounded-xl">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          <h3 className="text-lg font-semibold">AI Net Worth Forecast</h3>
        </div>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-400" />
          <p>Need at least 3 months of data to generate forecasts</p>
        </div>
      </div>
    );
  }

  const getConfidenceColor = (confidence: string) => {
    if (confidence === 'High') return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    if (confidence === 'Medium') return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
  };

  const maxValue = forecast
    ? Math.max(...forecast.periods.map((p: any) => Math.max(p.predictedNetWorth, p.predictedAssets, p.predictedLiabilities)))
    : 0;

  return (
    <div className="glass-panel p-6 rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          <h3 className="text-lg font-semibold">AI Net Worth Forecast</h3>
          {isUsingCache && (
            <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full font-medium animate-pulse">
              ⚡ Using Cache
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedModel}
            onChange={e => setSelectedModel(e.target.value as GeminiModel)}
            className="text-sm px-3 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg"
          >
            <option value={GEMINI_MODELS.FLASH_LITE}>Flash Lite</option>
            <option value={GEMINI_MODELS.FLASH_LATEST}>Flash Latest</option>
            <option value={GEMINI_MODELS.PRO_LATEST}>Pro</option>
          </select>
          <select
            value={monthsAhead}
            onChange={e => setMonthsAhead(Number(e.target.value))}
            className="text-sm px-3 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg"
          >
            <option value={6}>6 months</option>
            <option value={12}>12 months</option>
            <option value={24}>24 months</option>
          </select>
          <button
            onClick={() => generateForecast(true)}
            disabled={isLoading}
            className="text-sm px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Generating...' : 'Refresh'}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">Generating forecast...</span>
        </div>
      ) : forecast ? (
        <div className="space-y-6">
          {/* Chart */}
          <div className="relative h-64 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg p-4">
            <div className="flex h-full gap-1">
              {forecast.periods.map((period: any, idx: number) => {
                const netWorthHeight = (period.predictedNetWorth / maxValue) * 100;
                const assetsHeight = (period.predictedAssets / maxValue) * 100;
                const liabilitiesHeight = (period.predictedLiabilities / maxValue) * 100;

                return (
                  <div key={idx} className="flex-1 flex flex-col justify-end group relative">
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                      <div className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg p-2 whitespace-nowrap">
                        <div className="font-medium mb-1">
                          {(() => {
                            try {
                              if (/^\d{4}-\d{2}$/.test(period.month)) {
                                const [year, month] = period.month.split('-').map(Number);
                                const date = new Date(year, month - 1);
                                return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                              }
                              return period.month;
                            } catch (e) {
                              return period.month;
                            }
                          })()}
                        </div>
                        <div>Net Worth: ₹{period.predictedNetWorth.toLocaleString('en-IN')}</div>
                        <div>Assets: ₹{period.predictedAssets.toLocaleString('en-IN')}</div>
                        <div>Liabilities: ₹{period.predictedLiabilities.toLocaleString('en-IN')}</div>
                        <div className={`mt-1 text-xs px-1 py-0.5 rounded ${getConfidenceColor(period.confidence)}`}>
                          {period.confidence} confidence
                        </div>
                      </div>
                    </div>
                    <div
                      className="bg-gradient-to-t from-purple-600 to-purple-400 rounded-t transition-all hover:opacity-80"
                      style={{ height: `${netWorthHeight}%` }}
                    />
                    <div className="text-xs text-center mt-1 text-gray-600 dark:text-gray-400 truncate">
                      {(() => {
                        try {
                          // Handle YYYY-MM format safely without timezone issues
                          if (/^\d{4}-\d{2}$/.test(period.month)) {
                            const [year, month] = period.month.split('-').map(Number);
                            const date = new Date(year, month - 1);
                            return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                          }
                          // Fallback for other formats
                          return period.month.split(' ')[0].slice(0, 3);
                        } catch (e) {
                          return period.month;
                        }
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gradient-to-r from-purple-600 to-purple-400 rounded"></div>
              <span>Net Worth</span>
            </div>
          </div>

          {/* Key Insights */}
          {forecast.insights && forecast.insights.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                Key Insights
              </h4>
              <ul className="space-y-2">
                {forecast.insights.map((insight: string, idx: number) => (
                  <li key={idx} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2 p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <span className="text-purple-500 mt-0.5">•</span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Assumptions */}
          {forecast.assumptions && forecast.assumptions.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2 text-gray-600 dark:text-gray-400">
                Forecast Assumptions
              </h4>
              <ul className="space-y-1">
                {forecast.assumptions.map((assumption: string, idx: number) => (
                  <li key={idx} className="text-xs text-gray-500 dark:text-gray-500 flex items-start gap-2">
                    <span>•</span>
                    <span>{assumption}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>Click Refresh to generate forecast</p>
        </div>
      )}
    </div>
  );
};
