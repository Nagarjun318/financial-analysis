import React from 'react';
import { Sparkles, TrendingUp, AlertCircle, Lightbulb } from 'lucide-react';
import { Transaction } from '../types';
import { generateDashboardInsights } from '../services/geminiService';

interface AIInsightsWidgetProps {
    transactions: Transaction[];
}

export const AIInsightsWidget: React.FC<AIInsightsWidgetProps> = ({ transactions }) => {
    const [insights, setInsights] = React.useState([] as string[]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchInsights = async () => {
            if (transactions.length === 0) return;
            setLoading(true);
            try {
                const data = await generateDashboardInsights(transactions);
                setInsights(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };

        fetchInsights();
    }, [transactions]);

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm animate-pulse">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/2"></div>
                    </div>
                ))}
            </div>
        );
    }

    const icons = [TrendingUp, AlertCircle, Lightbulb];
    const colors = ['text-green-500', 'text-amber-500', 'text-purple-500'];
    const bgColors = ['bg-green-50 dark:bg-green-900/20', 'bg-amber-50 dark:bg-amber-900/20', 'bg-purple-50 dark:bg-purple-900/20'];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {insights.map((insight: string, idx: number) => {
                const Icon = icons[idx % icons.length];
                return (
                    <div key={idx} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-start gap-3 hover:shadow-md transition-shadow">
                        <div className={`p-2 rounded-lg ${bgColors[idx % bgColors.length]}`}>
                            <Icon className={`w-5 h-5 ${colors[idx % colors.length]}`} />
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">AI Insight</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-300 leading-snug">{insight}</p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
