import React from 'react';
import { Lightbulb, RefreshCw, Sparkles } from 'lucide-react';
import { Transaction } from '../types';
import { suggestNewChart } from '../services/geminiService';
import { DynamicChart } from './DynamicChart';

interface ChartSuggestionWidgetProps {
    transactions: Transaction[];
}

export const ChartSuggestionWidget: React.FC<ChartSuggestionWidgetProps> = ({ transactions }) => {
    const [suggestion, setSuggestion] = React.useState(null as {
        chartType: string;
        title: string;
        description: string;
        rationale: string;
        dataPoints: string[];
    } | null);
    const [loading, setLoading] = React.useState(false);
    const [previousSuggestions, setPreviousSuggestions] = React.useState([] as string[]);

    const fetchSuggestion = async () => {
        if (transactions.length === 0) return;
        setLoading(true);
        try {
            const data = await suggestNewChart(transactions, previousSuggestions);
            setSuggestion(data);
            // Track this suggestion
            setPreviousSuggestions((prev: string[]) => [...prev, data.title]);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchSuggestion();
    }, [transactions]);

    if (loading) {
        return (
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 p-6 rounded-2xl border border-purple-200 dark:border-purple-700 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                        <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400 animate-pulse" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">AI Chart Suggestion</h3>
                </div>
                <div className="space-y-3">
                    <div className="h-4 bg-purple-200/50 dark:bg-purple-800/30 rounded w-3/4 animate-pulse"></div>
                    <div className="h-3 bg-purple-200/50 dark:bg-purple-800/30 rounded w-full animate-pulse"></div>
                    <div className="h-3 bg-purple-200/50 dark:bg-purple-800/30 rounded w-5/6 animate-pulse"></div>
                </div>
            </div>
        );
    }

    if (!suggestion) {
        return null;
    }

    return (
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 p-6 rounded-2xl border border-purple-200 dark:border-purple-700 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                        <Lightbulb className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">AI Chart Suggestion</h3>
                        <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">{suggestion.chartType}</p>
                    </div>
                </div>
                <button
                    onClick={fetchSuggestion}
                    disabled={loading}
                    className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-700 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors disabled:opacity-50"
                    title="Get new suggestion"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="space-y-3">
                <div>
                    <h4 className="text-base font-bold text-gray-900 dark:text-white mb-1">{suggestion.title}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{suggestion.description}</p>
                </div>

                <div className="bg-white/50 dark:bg-gray-800/50 p-3 rounded-lg border border-purple-100 dark:border-purple-800">
                    <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 mb-1">Why this matters:</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{suggestion.rationale}</p>
                </div>

                {suggestion.dataPoints && suggestion.dataPoints.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {suggestion.dataPoints.map((point: string, idx: number) => (
                            <span
                                key={idx}
                                className="px-3 py-1 text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full"
                            >
                                {point}
                            </span>
                        ))}
                    </div>
                )}

                {/* Auto-Generated Chart */}
                <DynamicChart suggestion={suggestion} transactions={transactions} />
            </div>
        </div>
    );
};
