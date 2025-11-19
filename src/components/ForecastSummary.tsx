import React from 'react';
import { ForecastResult } from '../types';
import { formatCurrency } from '../utils';
import { Sparkles, TrendingUp, TrendingDown, Minus, AlertTriangle, Lightbulb, Brain, BarChart3 } from 'lucide-react';

interface ForecastSummaryProps {
  forecast?: ForecastResult;
}

export const ForecastSummary: React.FC<ForecastSummaryProps> = ({ forecast }) => {
  if (!forecast || !forecast.nextMonth) return null;
  
  const f = forecast.nextMonth;
  const isAI = forecast.isAIGenerated;
  const hasInsights = isAI && (f.insights || f.recommendations?.length || f.trends?.length || f.warnings?.length);

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-indigo-900/30 p-6 rounded-xl shadow-lg border border-indigo-100 dark:border-indigo-800">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {isAI ? (
            <>
              <Brain className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-xl font-bold text-indigo-900 dark:text-indigo-100">AI-Powered Forecast</h3>
            </>
          ) : (
            <>
              <BarChart3 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-xl font-bold text-indigo-900 dark:text-indigo-100">Next Month Forecast</h3>
            </>
          )}
        </div>
        {isAI && f.confidence !== undefined && (
          <div className="flex items-center gap-2 bg-white/50 dark:bg-gray-700/50 px-3 py-1 rounded-full">
            <Sparkles className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
              {f.confidence}% Confidence
            </span>
          </div>
        )}
      </div>

      {/* Projections */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Projected Income</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(f.projectedIncome)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Projected Expense</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(f.projectedExpense)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Projected Savings</p>
          <p className={`text-2xl font-bold ${f.projectedSavings >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>
            {formatCurrency(f.projectedSavings)}
          </p>
        </div>
      </div>

      {/* AI Insights Section */}
      {hasInsights && (
        <div className="space-y-4 mt-6">
          {/* Insights */}
          {f.insights && (
            <div className="bg-white/70 dark:bg-gray-800/70 p-4 rounded-lg">
              <div className="flex items-start gap-2">
                <Sparkles className="w-5 h-5 text-indigo-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">AI Insights</h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{f.insights}</p>
                </div>
              </div>
            </div>
          )}

          {/* Category Trends */}
          {f.trends && f.trends.length > 0 && (
            <div className="bg-white/70 dark:bg-gray-800/70 p-4 rounded-lg">
              <div className="flex items-start gap-2 mb-3">
                <TrendingUp className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" />
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">Category Trends</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {f.trends.map((trend, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    {trend.trend === 'increasing' && <TrendingUp className="w-4 h-4 text-red-500" />}
                    {trend.trend === 'decreasing' && <TrendingDown className="w-4 h-4 text-green-500" />}
                    {trend.trend === 'stable' && <Minus className="w-4 h-4 text-gray-500" />}
                    <span className="text-gray-700 dark:text-gray-300">
                      <span className="font-medium">{trend.category}</span>
                      <span className={`ml-1 ${trend.change > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                        {trend.change > 0 ? '+' : ''}{trend.change.toFixed(0)}%
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {f.warnings && f.warnings.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-lg">
              <div className="flex items-start gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <h4 className="font-semibold text-amber-900 dark:text-amber-100">Warnings</h4>
              </div>
              <ul className="space-y-1 ml-7">
                {f.warnings.map((warning, idx) => (
                  <li key={idx} className="text-sm text-amber-800 dark:text-amber-200">• {warning}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {f.recommendations && f.recommendations.length > 0 && (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-4 rounded-lg">
              <div className="flex items-start gap-2 mb-2">
                <Lightbulb className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                <h4 className="font-semibold text-emerald-900 dark:text-emerald-100">Recommendations</h4>
              </div>
              <ul className="space-y-1 ml-7">
                {f.recommendations.map((rec, idx) => (
                  <li key={idx} className="text-sm text-emerald-800 dark:text-emerald-200">• {rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-indigo-200 dark:border-indigo-700">
        <p className="text-xs text-gray-600 dark:text-gray-400">
          {isAI ? (
            <>Generated using AI ({f.method}) • For {f.month}</>
          ) : (
            <>Method: {f.method} • For {f.month}</>
          )}
        </p>
      </div>
    </div>
  );
};

export default ForecastSummary;
