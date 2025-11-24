import React from 'react';
import { FinancialGoal } from '../types';
import { analyzeGoal, GoalInsight } from '../services/netWorthAI';
import { GEMINI_MODELS, GeminiModel } from '../services/geminiService';
import { Loader2, Target, TrendingUp, AlertCircle, CheckCircle2, RefreshCw, Settings } from 'lucide-react';

interface Props {
    goal: FinancialGoal;
}

export const AIGoalAdvisor: React.FC<Props> = ({ goal }) => {
    const [insight, setInsight] = React.useState(null as GoalInsight | null);
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState(false);
    const [selectedModel, setSelectedModel] = React.useState(GEMINI_MODELS.FLASH_LATEST as GeminiModel);
    const [showModelSelector, setShowModelSelector] = React.useState(false);

    const fetchInsight = React.useCallback(async (force = false) => {
        const cacheKey = `goal_insight_${goal.id}_${goal.target_amount}_${goal.deadline}_${selectedModel}`;

        if (!force) {
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                try {
                    const parsed = JSON.parse(cached);
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
            const result = await analyzeGoal(
                goal.name,
                goal.target_amount,
                goal.current_amount,
                goal.deadline,
                selectedModel
            );
            setInsight(result);
            localStorage.setItem(cacheKey, JSON.stringify({
                data: result,
                timestamp: Date.now()
            }));
        } catch (err) {
            console.error('Failed to analyze goal:', err);
            setError(true);
        } finally {
            setIsLoading(false);
        }
    }, [goal, selectedModel]);

    React.useEffect(() => {
        fetchInsight();
    }, [fetchInsight]);

    if (isLoading) {
        return (
            <div className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800 animate-pulse">
                <div className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>AI calculating optimal strategy...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                        <AlertCircle className="w-4 h-4" />
                        <span>Failed to generate insights</span>
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
        <div className="mt-4 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800 overflow-hidden group/card relative">
            {/* Controls */}
            <div className="absolute top-3 right-3 opacity-0 group-hover/card:opacity-100 transition-opacity flex items-center gap-2 bg-white/80 dark:bg-black/50 backdrop-blur-sm p-1.5 rounded-lg shadow-sm z-10">
                <div className="relative">
                    <button
                        onClick={() => setShowModelSelector(!showModelSelector)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                        title="Select Model"
                    >
                        <Settings className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
                    </button>
                    {showModelSelector && (
                        <div className="absolute top-full right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[120px]">
                            {Object.values(GEMINI_MODELS).map((model) => (
                                <button
                                    key={model}
                                    onClick={() => {
                                        setSelectedModel(model);
                                        setShowModelSelector(false);
                                    }}
                                    className={`w-full text-left px-3 py-1.5 text-xs ${selectedModel === model ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                                >
                                    {model.split('-')[1] || 'Default'}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <button
                    onClick={() => fetchInsight(true)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                    title="Recalculate"
                >
                    <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />
                </button>
            </div>

            <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/40 rounded-full">
                        <Target className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <h4 className="font-semibold text-gray-900 dark:text-white text-sm">AI Strategy</h4>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${insight.feasibility === 'High' ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' :
                        insight.feasibility === 'Medium' ? 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800' :
                            'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
                        }`}>
                        {insight.feasibility} Feasibility
                    </span>
                </div>

                <div className="space-y-3">
                    <div className="flex items-start gap-3 bg-white dark:bg-gray-800/50 p-3 rounded-lg border border-indigo-100 dark:border-indigo-800/50">
                        <TrendingUp className="w-4 h-4 text-green-500 mt-0.5" />
                        <div>
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Recommended Monthly Savings</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">₹{insight.monthlySavingsRequired.toLocaleString()}</p>
                        </div>
                    </div>

                    <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Investment Strategy</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed bg-white/50 dark:bg-black/20 p-2 rounded border border-indigo-50 dark:border-indigo-900/30">
                            {insight.investmentStrategy}
                        </p>
                    </div>

                    <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Action Plan</p>
                        <ul className="space-y-1.5">
                            {insight.recommendations.map((rec, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-300">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 mt-0.5 flex-shrink-0" />
                                    <span>{rec}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};
