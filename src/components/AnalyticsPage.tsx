import React from 'react';
import { Transaction } from '../types';
import { BarChart3, Calendar, ArrowRightLeft, TrendingUp, PieChart, Activity, Sparkles } from 'lucide-react';
import { SpendingHeatmap } from './SpendingHeatmap';
import { FinancialSankey } from './FinancialSankey';
import { ComparativeSpending } from './ComparativeSpending';
import { CategoryTrendsAdvanced } from './CategoryTrendsAdvanced';
import { AnalyticsAdvisorChat } from './AnalyticsAdvisorChat';
import { AIInsightsWidget } from './AIInsightsWidget';
import { ChartSuggestionWidget } from './ChartSuggestionWidget';

interface AnalyticsPageProps {
    transactions: Transaction[];
    userId: string;
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ transactions, userId }) => {
    const [dateRange, setDateRange] = React.useState('1y' as '1y' | '6m' | '3m' | 'all');
    const [chatPanelWidth, setChatPanelWidth] = React.useState(0);
    const [triggerMessage, setTriggerMessage] = React.useState(null as string | null);

    // Filter transactions based on selected range
    const filteredTransactions = React.useMemo(() => {
        if (dateRange === 'all') return transactions;

        const now = new Date();
        const cutoff = new Date();

        if (dateRange === '1y') cutoff.setFullYear(now.getFullYear() - 1);
        if (dateRange === '6m') cutoff.setMonth(now.getMonth() - 6);
        if (dateRange === '3m') cutoff.setMonth(now.getMonth() - 3);

        return transactions.filter(t => new Date(t.date) >= cutoff);
    }, [transactions, dateRange]);

    const handleAskAI = (context: string) => {
        setTriggerMessage(`Analyze the ${context} chart for me. What are the key takeaways?`);
    };

    return (
        <div
            className="space-y-8 pb-20 animate-fadeIn"
            style={{ marginRight: `${chatPanelWidth}px`, transition: 'margin-right 0.3s ease-in-out' }}
        >
            <AnalyticsAdvisorChat
                transactions={filteredTransactions}
                onOpenChange={setChatPanelWidth}
                externalTrigger={triggerMessage}
                onTriggerHandled={() => setTriggerMessage(null)}
            />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold gradient-text">Advanced Analytics</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        Deep dive into your financial patterns and trends
                    </p>
                </div>

                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                    {(['3m', '6m', '1y', 'all'] as const).map((range) => (
                        <button
                            key={range}
                            onClick={() => setDateRange(range)}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${dateRange === range
                                ? 'bg-white dark:bg-gray-700 text-brand-primary shadow-sm'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                }`}
                        >
                            {range === '3m' ? '3 Months' : range === '6m' ? '6 Months' : range === '1y' ? '1 Year' : 'All Time'}
                        </button>
                    ))}
                </div>
            </div>

            {/* AI Insights Widget */}
            <AIInsightsWidget transactions={filteredTransactions} />

            {/* AI Chart Suggestion */}
            <ChartSuggestionWidget transactions={filteredTransactions} />

            {/* Top Row: Heatmap & Sankey */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="glass-panel p-6 rounded-2xl border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-brand-primary" />
                            <h2 className="text-xl font-bold">Spending Intensity Heatmap</h2>
                        </div>
                        <button
                            onClick={() => handleAskAI('Spending Heatmap')}
                            className="p-2 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors group"
                            title="Analyze with AI"
                        >
                            <Sparkles className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        </button>
                    </div>
                    <SpendingHeatmap transactions={filteredTransactions} />
                </div>

                <div className="glass-panel p-6 rounded-2xl border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <ArrowRightLeft className="w-5 h-5 text-purple-500" />
                            <h2 className="text-xl font-bold">Income & Expense Flow</h2>
                        </div>
                        <button
                            onClick={() => handleAskAI('Income Flow (Sankey)')}
                            className="p-2 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors group"
                            title="Analyze with AI"
                        >
                            <Sparkles className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        </button>
                    </div>
                    <div className="h-[300px] flex items-center justify-center">
                        <FinancialSankey transactions={filteredTransactions} />
                    </div>
                </div>
            </div>

            {/* Middle Row: Comparative Analysis */}
            <div className="glass-panel p-6 rounded-2xl border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-emerald-500" />
                        <h2 className="text-xl font-bold">Period Comparison (YoY & MoM)</h2>
                    </div>
                    <button
                        onClick={() => handleAskAI('Period Comparison')}
                        className="p-2 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors group"
                        title="Analyze with AI"
                    >
                        <Sparkles className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    </button>
                </div>
                <ComparativeSpending transactions={transactions} />
            </div>

            {/* Bottom Row: Advanced Trends */}
            <div className="glass-panel p-6 rounded-2xl border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-orange-500" />
                        <h2 className="text-xl font-bold">Category Trends Over Time</h2>
                    </div>
                    <button
                        onClick={() => handleAskAI('Category Trends')}
                        className="p-2 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors group"
                        title="Analyze with AI"
                    >
                        <Sparkles className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    </button>
                </div>
                <CategoryTrendsAdvanced transactions={filteredTransactions} />
            </div>
        </div>
    );
};
