import React from 'react';
import { TrendingUp, AlertCircle, Loader2, MapPin } from 'lucide-react';
import { estimateMarketValue, MarketValueEstimate } from '../services/netWorthAI';
import { GEMINI_MODELS, GeminiModel } from '../services/geminiService';

interface AIMarketValueProps {
    assetName: string;
    assetType: string;
    currentValue: number;
}

export const AIMarketValue: React.FC<AIMarketValueProps> = ({
    assetName,
    assetType,
    currentValue
}) => {
    const [marketData, setMarketData] = React.useState(null as MarketValueEstimate | null);
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState(false);
    const [selectedModel, setSelectedModel] = React.useState(GEMINI_MODELS.FLASH_LATEST as GeminiModel);

    const fetchMarketValue = React.useCallback(async (force = false) => {
        // Check cache first if not forced
        const cacheKey = `market_value_${assetName}_${assetType}_${currentValue}_${selectedModel}`;
        if (!force) {
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                try {
                    const parsed = JSON.parse(cached);
                    // Check if cache is less than 24 hours old
                    if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
                        setMarketData(parsed.data);
                        return;
                    }
                } catch (e) {
                    localStorage.removeItem(cacheKey);
                }
            }
        }

        setIsLoading(true);
        setError(false);
        try {
            const result = await estimateMarketValue(assetName, assetType, currentValue, selectedModel);
            setMarketData(result);
            // Cache the result
            localStorage.setItem(cacheKey, JSON.stringify({
                data: result,
                timestamp: Date.now()
            }));
        } catch (err) {
            console.error('Failed to fetch market value:', err);
            setError(true);
        } finally {
            setIsLoading(false);
        }
    }, [assetName, assetType, currentValue, selectedModel]);

    React.useEffect(() => {
        fetchMarketValue();
    }, [fetchMarketValue]);

    if (isLoading) {
        return (
            <div className="mt-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800 animate-pulse">
                <div className="flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>AI analyzing Chennai market trends...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
                        <AlertCircle className="w-3 h-3" />
                        <span>Failed to load estimate</span>
                    </div>
                    <button
                        onClick={() => fetchMarketValue(true)}
                        className="text-xs text-red-600 hover:text-red-700 underline"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (!marketData) return null;

    const difference = marketData.estimatedValue - currentValue;
    const percentChange = (difference / currentValue) * 100;
    const isPositive = difference >= 0;

    return (
        <div className="mt-3 p-3 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800 group/card relative">
            <div className="absolute top-2 right-2 opacity-0 group-hover/card:opacity-100 transition-opacity flex items-center gap-2 bg-white/80 dark:bg-black/50 backdrop-blur-sm p-1 rounded-lg shadow-sm">
                <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value as GeminiModel)}
                    className="text-[10px] bg-transparent border-none outline-none text-gray-600 dark:text-gray-300 cursor-pointer"
                >
                    <option value={GEMINI_MODELS.FLASH_LITE}>Flash Lite</option>
                    <option value={GEMINI_MODELS.FLASH_LATEST}>Flash Latest</option>
                    <option value={GEMINI_MODELS.PRO_LATEST}>Pro</option>
                </select>
                <button
                    onClick={() => fetchMarketValue(true)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                    title="Recalculate"
                >
                    <Loader2 className={`w-3 h-3 text-indigo-600 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                    <div className="p-1 bg-indigo-100 dark:bg-indigo-900/40 rounded-full">
                        <TrendingUp className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <span className="text-xs font-semibold text-indigo-900 dark:text-indigo-100">AI Market Estimate</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-700 mr-16 group-hover/card:mr-24 transition-all">
                    <MapPin className="w-2.5 h-2.5" />
                    Chennai
                </div>
            </div>

            <div className="flex items-baseline gap-2 mb-1">
                <span className="text-sm font-bold text-gray-900 dark:text-white">
                    ₹{marketData.estimatedValue.toLocaleString()}
                </span>
                {Math.abs(percentChange) > 0.1 && (
                    <span className={`text-xs font-medium ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {isPositive ? '+' : ''}{percentChange.toFixed(1)}%
                    </span>
                )}
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed mb-2">
                {marketData.marketTrends}
            </p>

            <div className="flex items-center justify-between pt-2 border-t border-indigo-100 dark:border-indigo-800/50">
                <div className="flex items-center gap-1">
                    <span className="text-[10px] text-gray-500 dark:text-gray-400">Confidence:</span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${marketData.confidence.toLowerCase() === 'high'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                        : marketData.confidence.toLowerCase() === 'medium'
                            ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                        }`}>
                        {marketData.confidence}
                    </span>
                </div>
            </div>
        </div>
    );
};
