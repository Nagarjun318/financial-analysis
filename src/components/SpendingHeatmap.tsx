import React from 'react';
import { Transaction } from '../types';
import { formatCurrency } from '../utils';

interface SpendingHeatmapProps {
    transactions: Transaction[];
}

export const SpendingHeatmap: React.FC<SpendingHeatmapProps> = ({ transactions }) => {
    // 1. Process data: Group daily spending for the last 365 days (or available range)
    const heatmapData = React.useMemo(() => {
        const dailySpending = new Map<string, number>();
        let maxSpend = 0;

        transactions.forEach(t => {
            if (t.type === 'debit' && t.date) {
                // Normalize date to YYYY-MM-DD
                const dateKey = t.date.split('T')[0];
                const current = dailySpending.get(dateKey) || 0;
                const newVal = current + Math.abs(t.amount);
                dailySpending.set(dateKey, newVal);
                if (newVal > maxSpend) maxSpend = newVal;
            }
        });

        return { dailySpending, maxSpend };
    }, [transactions]);

    // 2. Generate calendar grid (last 52 weeks)
    const calendarGrid = React.useMemo(() => {
        const today = new Date();
        const weeks = [];
        // Start from 52 weeks ago (approx 1 year)
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - 364);

        // Adjust to start on Sunday
        const dayOfWeek = startDate.getDay();
        startDate.setDate(startDate.getDate() - dayOfWeek);

        let currentDate = new Date(startDate);

        // Generate 53 weeks to cover the full year view
        for (let w = 0; w < 53; w++) {
            const week = [];
            for (let d = 0; d < 7; d++) {
                const dateStr = currentDate.toISOString().split('T')[0];
                const spend = heatmapData.dailySpending.get(dateStr) || 0;

                week.push({
                    date: new Date(currentDate),
                    dateStr,
                    spend,
                    intensity: heatmapData.maxSpend > 0 ? Math.min(1, spend / (heatmapData.maxSpend * 0.6)) : 0 // Cap intensity at 60% of max for better visibility
                });

                currentDate.setDate(currentDate.getDate() + 1);
            }
            weeks.push(week);
        }
        return weeks;
    }, [heatmapData]);

    // Helper for tooltip
    const getTooltip = (dateStr: string, spend: number) => {
        const date = new Date(dateStr).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
        return `${date}: ${formatCurrency(spend)}`;
    };

    // Helper for color class
    const getColorClass = (intensity: number) => {
        if (intensity === 0) return 'bg-gray-100 dark:bg-gray-800';
        if (intensity < 0.2) return 'bg-emerald-100 dark:bg-emerald-900/40';
        if (intensity < 0.4) return 'bg-emerald-300 dark:bg-emerald-700/60';
        if (intensity < 0.6) return 'bg-emerald-500 dark:bg-emerald-600';
        if (intensity < 0.8) return 'bg-emerald-600 dark:bg-emerald-500';
        return 'bg-emerald-800 dark:bg-emerald-400';
    };

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return (
        <div className="w-full overflow-x-auto pb-2">
            <div className="min-w-[700px]">
                {/* Month Labels */}
                <div className="flex mb-2 text-xs text-gray-500 dark:text-gray-400 pl-8">
                    {calendarGrid.map((week: any[], i: number) => {
                        const firstDay = week[0].date;
                        // Show month label only if it's the first week of the month
                        if (firstDay.getDate() <= 7 && (i === 0 || calendarGrid[i - 1][0].date.getMonth() !== firstDay.getMonth())) {
                            return <div key={i} className="flex-1">{months[firstDay.getMonth()]}</div>;
                        }
                        return <div key={i} className="flex-1"></div>;
                    })}
                </div>

                <div className="flex gap-1">
                    {/* Day Labels */}
                    <div className="flex flex-col gap-1 text-[10px] text-gray-400 dark:text-gray-500 pt-1 pr-2">
                        <div className="h-3">Sun</div>
                        <div className="h-3"></div>
                        <div className="h-3">Tue</div>
                        <div className="h-3"></div>
                        <div className="h-3">Thu</div>
                        <div className="h-3"></div>
                        <div className="h-3">Sat</div>
                    </div>

                    {/* Heatmap Grid */}
                    <div className="flex gap-1 flex-1">
                        {calendarGrid.map((week: any[], wIndex: number) => (
                            <div key={wIndex} className="flex flex-col gap-1 flex-1">
                                {week.map((day: any, dIndex: number) => (
                                    <div
                                        key={`${wIndex}-${dIndex}`}
                                        className={`h-3 w-3 rounded-sm transition-all hover:scale-125 hover:ring-2 ring-offset-1 ring-brand-primary cursor-pointer ${getColorClass(day.intensity)}`}
                                        title={getTooltip(day.dateStr, day.spend)}
                                    />
                                ))}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Legend */}
                <div className="flex items-center justify-end gap-2 mt-4 text-xs text-gray-500 dark:text-gray-400">
                    <span>Less</span>
                    <div className="flex gap-1">
                        <div className="w-3 h-3 rounded-sm bg-gray-100 dark:bg-gray-800"></div>
                        <div className="w-3 h-3 rounded-sm bg-emerald-100 dark:bg-emerald-900/40"></div>
                        <div className="w-3 h-3 rounded-sm bg-emerald-300 dark:bg-emerald-700/60"></div>
                        <div className="w-3 h-3 rounded-sm bg-emerald-500 dark:bg-emerald-600"></div>
                        <div className="w-3 h-3 rounded-sm bg-emerald-800 dark:bg-emerald-400"></div>
                    </div>
                    <span>More</span>
                </div>
            </div>
        </div>
    );
};
