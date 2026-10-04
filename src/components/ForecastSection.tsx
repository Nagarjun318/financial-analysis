import React from 'react';
import { AlertTriangle, Brain, BarChart3, Settings, RefreshCw, ChevronUp, ChevronDown } from 'lucide-react';
import ForecastSummary from './ForecastSummary.tsx';
import { GEMINI_MODELS, type GeminiModel } from '../services/geminiService.ts';
import type { ForecastViewModel } from '../hooks/useForecast.ts';

/** Friendly model names for the forecast model picker. */
export function getForecastModelDisplayName(model: GeminiModel): string {
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
    case GEMINI_MODELS.FLASH_3_5_LITE:
      return '3.5 Flash-Lite';
    default:
      return '3.5 Flash-Lite';
  }
}

/**
 * Forecast block (extracted from Dashboard). Purely presentational — all
 * state comes from `useForecast` as a single view-model prop.
 */
const ForecastSection: React.FC<{ forecast: ForecastViewModel }> = ({ forecast }) => {
  const {
    enhancedForecast,
    isGeneratingForecast,
    forecastError,
    useAIForecast,
    selectedForecastModel,
    showForecastModelSelector,
    hasCachedForecast,
    isForecastExpanded,
    toggleForecastMode,
    handleRegenerateForecast,
    setSelectedForecastModel,
    setShowForecastModelSelector,
    setIsForecastExpanded,
  } = forecast;

  return (
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
          📦 Using cached forecast (valid for 24 hours) • Click &quot;Regenerate&quot; to refresh
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
                          {modelValue === GEMINI_MODELS.FLASH_3_5_LITE && ' (Default)'}
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
  );
};

export default ForecastSection;
