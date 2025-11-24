import React from 'react';
import { Sparkles, TrendingUp } from 'lucide-react';
import { suggestAssetType, estimateMarketValue, AssetSuggestion, MarketValueEstimate } from '../services/netWorthAI';

interface Props {
  assetName: string;
  assetType: string;
  currentValue: number;
  onSuggestionApplied: (type: string) => void;
}

export const AIAssetHelper: React.FC<Props> = ({ assetName, assetType, currentValue, onSuggestionApplied }) => {
  const [typeSuggestion, setTypeSuggestion] = React.useState(null as AssetSuggestion | null);
  const [marketEstimate, setMarketEstimate] = React.useState(null as MarketValueEstimate | null);
  const [isLoadingType, setIsLoadingType] = React.useState(false);
  const [isLoadingValue, setIsLoadingValue] = React.useState(false);

  const getSuggestion = async () => {
    if (!assetName || assetName.length < 3) return;
    setIsLoadingType(true);
    try {
      const suggestion = await suggestAssetType(assetName);
      setTypeSuggestion(suggestion);
    } catch (error) {
      console.error('Failed to get type suggestion:', error);
    } finally {
      setIsLoadingType(false);
    }
  };

  const getMarketEstimate = async () => {
    if (!assetName || !assetType || !currentValue) return;
    setIsLoadingValue(true);
    try {
      const estimate = await estimateMarketValue(assetName, assetType, currentValue);
      setMarketEstimate(estimate);
    } catch (error) {
      console.error('Failed to get market estimate:', error);
    } finally {
      setIsLoadingValue(false);
    }
  };

  const applyTypeSuggestion = () => {
    if (typeSuggestion) {
      onSuggestionApplied(typeSuggestion.type);
      setTypeSuggestion(null);
    }
  };

  const getConfidenceColor = (confidence: string) => {
    if (confidence === 'High') return 'text-green-600 dark:text-green-400';
    if (confidence === 'Medium') return 'text-blue-600 dark:text-blue-400';
    return 'text-orange-600 dark:text-orange-400';
  };

  return (
    <div className="space-y-3 mt-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
      <div className="flex items-center gap-2 text-sm font-semibold text-purple-700 dark:text-purple-300">
        <Sparkles className="h-4 w-4" />
        AI Assistance
      </div>

      {/* Type Suggestion */}
      <div>
        <button
          onClick={getSuggestion}
          disabled={isLoadingType || !assetName || assetName.length < 3}
          className="text-sm px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isLoadingType ? (
            <>
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="h-3 w-3" />
              Suggest Asset Type
            </>
          )}
        </button>

        {typeSuggestion && (
          <div className="mt-2 p-3 bg-white dark:bg-gray-800 rounded-lg border border-purple-300 dark:border-purple-700">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Suggested: {typeSuggestion.type}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 ${getConfidenceColor(typeSuggestion.confidence)}`}>
                  {typeSuggestion.confidence} confidence
                </span>
              </div>
              <button
                onClick={applyTypeSuggestion}
                className="text-xs px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
              >
                Apply
              </button>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">{typeSuggestion.reasoning}</p>
          </div>
        )}
      </div>

      {/* Market Value Estimate */}
      <div>
        <button
          onClick={getMarketEstimate}
          disabled={isLoadingValue || !assetName || !assetType || !currentValue}
          className="text-sm px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isLoadingValue ? (
            <>
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
              Estimating...
            </>
          ) : (
            <>
              <TrendingUp className="h-3 w-3" />
              Get Market Value
            </>
          )}
        </button>

        {marketEstimate && (
          <div className="mt-2 p-3 bg-white dark:bg-gray-800 rounded-lg border border-indigo-300 dark:border-indigo-700">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-sm font-medium">
                  Estimated: ₹{marketEstimate.estimatedValue.toLocaleString('en-IN')}
                </div>
                <div className={`text-xs ${getConfidenceColor(marketEstimate.confidence)}`}>
                  {marketEstimate.confidence} confidence
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500 dark:text-gray-400">Current</div>
                <div className="text-sm font-medium">₹{currentValue.toLocaleString('en-IN')}</div>
              </div>
            </div>
            {marketEstimate.marketTrends && (
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                <strong>Trends:</strong> {marketEstimate.marketTrends}
              </div>
            )}
            {marketEstimate.source && (
              <div className="text-xs text-gray-500 dark:text-gray-500">
                Source: {marketEstimate.source}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
