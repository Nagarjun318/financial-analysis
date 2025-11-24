import React from 'react';
import { Sparkles, TrendingUp, TrendingDown, AlertCircle, CheckCircle, Lightbulb } from 'lucide-react';
import { analyzeFinancialHealth, FinancialHealthScore } from '../services/netWorthAI';
import { Asset, Liability, NetWorthSnapshot } from '../domain/networth/calculateNetWorth';

interface Props {
  assets: Asset[];
  liabilities: Liability[];
  timeline: NetWorthSnapshot[];
}

export const AIInsightsPanel: React.FC<Props> = ({ assets, liabilities, timeline }) => {
  const [healthScore, setHealthScore] = React.useState(null as FinancialHealthScore | null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isExpanded, setIsExpanded] = React.useState(false); // Default minimized
  const [isUsingCache, setIsUsingCache] = React.useState(false);
  const lastCacheKeyRef = React.useRef('');

  // Create stable cache key based on actual data content
  const cacheKey = React.useMemo(() => {
    const assetsData = assets.map(a => `${a.id}-${a.currentValue}`).join('|');
    const liabilitiesData = liabilities.map(l => `${l.id}-${l.principal}`).join('|');
    const timelineData = timeline.map(t => `${t.month}-${t.netWorth}`).join('|');
    return `${assetsData}-${liabilitiesData}-${timelineData}`;
  }, [assets, liabilities, timeline]);

  const analyzeHealth = React.useCallback(async (force = false) => {
    // Check if we already have data for this key in memory (to prevent re-processing)
    if (!force && lastCacheKeyRef.current === cacheKey) {
      console.log('✅ Using cached health score (memory)');
      return;
    }

    const storageKey = `ai_insights_${cacheKey}`;
    const cachedData = localStorage.getItem(storageKey);

    if (!force && cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        setHealthScore(parsed);
        lastCacheKeyRef.current = cacheKey; // Mark as loaded
        console.log('✅ Using cached health score from storage');
        setIsUsingCache(true);
        setTimeout(() => setIsUsingCache(false), 2000);
        return;
      } catch (e) {
        console.error('Failed to parse cached insights', e);
        localStorage.removeItem(storageKey);
      }
    }

    setIsUsingCache(false);
    setIsLoading(true);
    try {
      const score = await analyzeFinancialHealth(assets, liabilities, timeline);
      setHealthScore(score);
      localStorage.setItem(storageKey, JSON.stringify(score));
      lastCacheKeyRef.current = cacheKey;
      console.log('🔄 Fetched new health score from API');
    } catch (error) {
      console.error('Failed to analyze financial health:', error);
    } finally {
      setIsLoading(false);
    }
  }, [cacheKey, assets, liabilities, timeline]);

  React.useEffect(() => {
    if ((assets.length > 0 || liabilities.length > 0) && isExpanded) {
      analyzeHealth();
    }
  }, [cacheKey, isExpanded, analyzeHealth]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-blue-600 dark:text-blue-400';
    if (score >= 40) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getRatingColor = (rating: string) => {
    if (rating === 'Excellent') return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    if (rating === 'Good') return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    if (rating === 'Fair') return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
    return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
  };

  if (!isExpanded) {
    return (
      <div className="glass-panel p-4 rounded-xl mb-8">
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            <span className="font-semibold">AI Financial Insights</span>
            {healthScore && (
              <span className={`text-sm px-2 py-1 rounded-full ${getRatingColor(healthScore.rating)}`}>
                {healthScore.rating}
              </span>
            )}
          </div>
          <TrendingUp className="h-5 w-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="glass-panel p-6 rounded-xl mb-8 border-2 border-purple-200 dark:border-purple-800">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-purple-500 animate-pulse" />
          <h3 className="text-xl font-semibold">AI Financial Insights</h3>
          {isUsingCache && (
            <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full font-medium animate-pulse">
              ⚡ Using Cache
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => analyzeHealth(true)}
            disabled={isLoading}
            className="p-2 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh Analysis"
          >
            <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </button>
          <button
            onClick={() => setIsExpanded(false)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <TrendingDown className="h-5 w-5" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">Analyzing your financial health...</span>
        </div>
      ) : healthScore ? (
        <div className="space-y-6">
          {/* Health Score */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Financial Health Score</div>
              <div className="flex items-center gap-3">
                <span className={`text-4xl font-bold ${getScoreColor(healthScore.score)}`}>
                  {healthScore.score}
                </span>
                <span className={`text-sm px-3 py-1 rounded-full font-medium ${getRatingColor(healthScore.rating)}`}>
                  {healthScore.rating}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl">
                {healthScore.score >= 80 ? '🌟' : healthScore.score >= 60 ? '✨' : healthScore.score >= 40 ? '⚠️' : '🚨'}
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <p className="text-sm text-gray-700 dark:text-gray-300">{healthScore.summary}</p>
            </div>
          </div>

          {/* Strengths */}
          {healthScore.strengths.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                Strengths
              </h4>
              <ul className="space-y-2">
                {healthScore.strengths.map((strength: string, idx: number) => (
                  <li key={idx} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                    <span className="text-green-500 mt-1">✓</span>
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Concerns */}
          {healthScore.concerns.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                Areas of Concern
              </h4>
              <ul className="space-y-2">
                {healthScore.concerns.map((concern: string, idx: number) => (
                  <li key={idx} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                    <span className="text-orange-500 mt-1">⚠</span>
                    <span>{concern}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {healthScore.recommendations.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                AI Recommendations
              </h4>
              <ul className="space-y-2">
                {healthScore.recommendations.map((rec: string, idx: number) => (
                  <li key={idx} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <span className="text-purple-500 mt-0.5">💡</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Sparkles className="h-12 w-12 mx-auto mb-3 text-purple-400" />
          <p>Add assets and liabilities to get AI-powered insights</p>
        </div>
      )}
    </div>
  );
};
