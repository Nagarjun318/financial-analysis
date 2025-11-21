import React from 'react';
import { Brain, TrendingDown, Wrench, AlertCircle, Calendar, Loader2, RefreshCw } from 'lucide-react';
import { HomeService } from '../types';
import { generateServiceInsights } from '../services/geminiService';

interface ServiceInsightsDashboardProps {
  services: HomeService[];
}

export function ServiceInsightsDashboard({ services }: ServiceInsightsDashboardProps) {
  const [insights, setInsights] = React.useState(null as any);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [cacheKey, setCacheKey] = React.useState('');

  // Generate cache key based on service data
  const generateCacheKey = React.useCallback((servicesList: HomeService[]) => {
    const sortedServices = servicesList
      .map(s => `${s.id}-${s.next_service_due}-${s.cost}`)
      .sort()
      .join('|');
    return `service-insights-${sortedServices}`;
  }, []);

  // Load insights from cache or generate new
  const loadInsights = React.useCallback(async (forceRefresh = false) => {
    if (services.length === 0) return;
    
    const key = generateCacheKey(services);
    
    // Check cache first (unless forcing refresh)
    if (!forceRefresh) {
      try {
        const cached = localStorage.getItem(key);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          const ageHours = (Date.now() - timestamp) / (1000 * 60 * 60);
          
          // Use cache if less than 24 hours old
          if (ageHours < 24) {
            setInsights(data);
            setCacheKey(key);
            // Keep minimized by default
            return;
          }
        }
      } catch (error) {
        console.error('Cache read error:', error);
      }
    }
    
    // Generate new insights
    setIsLoading(true);
    try {
      const result = await generateServiceInsights(services);
      setInsights(result);
      setCacheKey(key);
      // Keep minimized by default
      
      // Save to cache
      try {
        localStorage.setItem(key, JSON.stringify({
          data: result,
          timestamp: Date.now()
        }));
      } catch (error) {
        console.error('Cache write error:', error);
      }
    } catch (error) {
      console.error('Failed to generate insights:', error);
    } finally {
      setIsLoading(false);
    }
  }, [services, generateCacheKey]);

  React.useEffect(() => {
    const key = generateCacheKey(services);
    if (services.length > 0 && (!insights || key !== cacheKey)) {
      loadInsights();
    }
  }, [services, insights, cacheKey, generateCacheKey, loadInsights]);
  if (services.length === 0) {
    return null;
  }

  if (!insights && !isLoading) {
    return (
      <div className="glass-panel p-6 rounded-xl border-l-4 border-indigo-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-100">AI Service Insights</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Get intelligent recommendations</p>
            </div>
          </div>
          <button
            onClick={() => loadInsights(false)}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg transition-all"
          >
            Generate Insights
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="glass-panel p-6 rounded-xl border-l-4 border-indigo-500">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          <p className="text-gray-600 dark:text-gray-400">AI is analyzing your services...</p>
        </div>
      </div>
    );
  }

  const healthColor = insights.overallHealth >= 80 ? 'text-green-600' : insights.overallHealth >= 50 ? 'text-yellow-600' : 'text-red-600';
  const healthBg = insights.overallHealth >= 80 ? 'bg-green-50 dark:bg-green-900/20' : insights.overallHealth >= 50 ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'bg-red-50 dark:bg-red-900/20';

  return (
    <div className="glass-panel rounded-xl border-l-4 border-indigo-500 overflow-hidden">
      {/* Header */}
      <div
        className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 cursor-pointer hover:from-indigo-100 hover:to-purple-100 dark:hover:from-indigo-900/30 dark:hover:to-purple-900/30 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-100 flex items-center gap-2">
                AI Service Insights
                <span className={`text-xs px-2 py-1 rounded-full ${healthBg} ${healthColor} font-bold`}>
                  {insights.overallHealth}% Health
                </span>
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Click to {isExpanded ? 'collapse' : 'expand'}</p>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              loadInsights(true);
            }}
            className="p-2 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Refresh insights (bypass cache)"
          >
            <RefreshCw className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-6 space-y-6">
          {/* Cost Optimization */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown className="w-5 h-5 text-emerald-600" />
              <h4 className="font-semibold text-gray-800 dark:text-gray-100">Cost Optimization</h4>
            </div>
            <ul className="space-y-2">
              {insights.costOptimization.map((tip: string, index: number) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <span className="text-emerald-600 mt-0.5">💰</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Maintenance Recommendations */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Wrench className="w-5 h-5 text-blue-600" />
              <h4 className="font-semibold text-gray-800 dark:text-gray-100">Maintenance Recommendations</h4>
            </div>
            <ul className="space-y-2">
              {insights.maintenanceRecommendations.map((rec: string, index: number) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <span className="text-blue-600 mt-0.5">🔧</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Upcoming Priorities */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              <h4 className="font-semibold text-gray-800 dark:text-gray-100">Upcoming Priorities</h4>
            </div>
            <ul className="space-y-2">
              {insights.upcomingPriorities.map((priority: string, index: number) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <span className="text-orange-600 mt-0.5">⚠️</span>
                  <span>{priority}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Cost Forecast */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-5 h-5 text-purple-600" />
              <h4 className="font-semibold text-gray-800 dark:text-gray-100">3-Month Cost Forecast</h4>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {insights.costForecast.map((forecast: any, index: number) => (
                <div key={index} className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-3 rounded-lg border border-purple-200 dark:border-purple-700">
                  <p className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-1">{forecast.month}</p>
                  <p className="text-lg font-bold text-gray-800 dark:text-gray-100">
                    ₹{forecast.estimatedCost.toLocaleString('en-IN')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ServiceInsightsDashboard;
