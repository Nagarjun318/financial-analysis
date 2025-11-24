import React from 'react';
import { Zap, TrendingDown, Award, ArrowRight, Loader2, Percent } from 'lucide-react';
import { analyzeDebtOptimization, DebtOptimizationInsight } from '../services/netWorthAI';

import { GEMINI_MODELS, GeminiModel } from '../services/geminiService';

interface AIDebtOptimizerProps {
    liabilityName: string;
    liabilityType: string;
    principal: number;
    interestRate: number;
    monthlyEMI: number;
}

export const AIDebtOptimizer: React.FC<AIDebtOptimizerProps> = ({
    liabilityName,
    liabilityType,
    principal,
    interestRate,
    monthlyEMI
}) => {
    const [insight, setInsight] = React.useState(null as DebtOptimizationInsight | null);
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState(false);
    const [selectedModel, setSelectedModel] = React.useState(GEMINI_MODELS.FLASH_LATEST as GeminiModel);

    const fetchInsight = React.useCallback(async (force = false) => {
        // Check cache first if not forced
        const cacheKey = `debt_opt_${liabilityName}_${principal}_${interestRate}_${selectedModel}`;
        if (!force) {
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                try {
                    const parsed = JSON.parse(cached);
                    // Check if cache is less than 24 hours old
                    if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
                        setInsight(parsed.data);
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
            const result = await analyzeDebtOptimization(
                liabilityName,
                liabilityType,
                principal,
                interestRate,
                monthlyEMI,
                selectedModel
            );
            setInsight(result);
            // Cache the result
            localStorage.setItem(cacheKey, JSON.stringify({
                data: result,
                timestamp: Date.now()
            }));
        } catch (err) {
            console.error('Failed to analyze debt:', err);
            setError(true);
        } finally {
            setIsLoading(false);
        }
    }, [liabilityName, liabilityType, principal, interestRate, monthlyEMI, selectedModel]);

    React.useEffect(() => {
        fetchInsight();
    }, [fetchInsight]);

    if (isLoading) {
        return (
            <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-100 dark:border-purple-800 animate-pulse">
                <div className="flex items-center gap-2 text-xs text-purple-600 dark:text-purple-400">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>AI analyzing debt optimization strategies...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
                        <Loader2 className="w-3 h-3" />
                        <span>Failed to analyze debt</span>
                    </div>
                    <button
                        onClick={() => fetchInsight(true)}
                        className="text-xs text-red-600 hover:text-red-700 underline"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (!insight) return null;

    return (
        <div className="mt-3 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg border border-purple-100 dark:border-purple-800 overflow-hidden group/card relative">
            <div className="absolute top-2 right-2 opacity-0 group-hover/card:opacity-100 transition-opacity flex items-center gap-2 bg-white/80 dark:bg-black/50 backdrop-blur-sm p-1 rounded-lg shadow-sm z-10">
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
                    onClick={() => fetchInsight(true)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                    title="Recalculate"
                >
                    <Loader2 className={`w-3 h-3 text-indigo-600 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Header */}
            <div className="px-3 py-2 border-b border-purple-100 dark:border-purple-800/50 flex items-center justify-between bg-white/50 dark:bg-black/20">
                <div className="flex items-center gap-1.5">
                    <div className="p-1 bg-purple-100 dark:bg-purple-900/40 rounded-full">
                        <Zap className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                    </div>
                    <span className="text-xs font-semibold text-purple-900 dark:text-purple-100">AI Debt Optimizer</span>
                </div>
                <div className={`text-[10px] font-medium px-2 py-0.5 rounded-full border mr-16 group-hover/card:mr-24 transition-all ${insight.debtQuality.score === 'Excellent' || insight.debtQuality.score === 'Good'
                    ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800'
                    : 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800'
                    }`}>
                    {insight.debtQuality.score} Debt
                </div>
            </div>

            <div className="p-3 space-y-3">
                {/* Refinancing Opportunity */}
                {insight.refinanceOpportunity.isAvailable && (
                    <div className="bg-white dark:bg-gray-800 rounded p-2 border border-purple-100 dark:border-purple-800/50 shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                            <Percent className="w-3 h-3 text-green-500" />
                            <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">Refinance Opportunity</span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-300 mb-1.5 leading-relaxed">
                            {insight.refinanceOpportunity.recommendation}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 p-1.5 rounded">
                            <span>Current: {interestRate}%</span>
                            <ArrowRight className="w-3 h-3" />
                            <span className="font-bold text-green-600 dark:text-green-400">Market: {insight.refinanceOpportunity.currentMarketRate}%</span>
                        </div>
                    </div>
                )}

                {/* Smart Prepayment */}
                <div className="flex items-start gap-2">
                    <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded mt-0.5">
                        <TrendingDown className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <div className="text-xs font-medium text-gray-900 dark:text-gray-100 mb-0.5">Smart Prepayment</div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                            Pay <strong className="text-indigo-600 dark:text-indigo-400">₹{insight.prepaymentStrategy.suggestedExtraPayment.toLocaleString()}</strong> extra/month to save <strong className="text-green-600 dark:text-green-400">{insight.prepaymentStrategy.interestSaved}</strong> in interest and finish <strong className="text-green-600 dark:text-green-400">{insight.prepaymentStrategy.timeSaved}</strong> early.
                        </p>
                    </div>
                </div>

                {/* Quality Reasoning */}
                <div className="flex items-start gap-2">
                    <div className="p-1 bg-orange-100 dark:bg-orange-900/30 rounded mt-0.5">
                        <Award className="w-3 h-3 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                        <div className="text-xs font-medium text-gray-900 dark:text-gray-100 mb-0.5">Debt Quality</div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                            {insight.debtQuality.reasoning}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
