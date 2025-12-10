import React from 'react';
import { Transaction } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../utils';

interface CategoryTrendsAdvancedProps {
    transactions: Transaction[];
}

export const CategoryTrendsAdvanced: React.FC<CategoryTrendsAdvancedProps> = ({ transactions }) => {
    const { chartData, topCategories } = React.useMemo(() => {
        // 1. Find top 5 categories by total spend
        const categoryTotals = new Map<string, number>();
        transactions.forEach(t => {
            if (t.type === 'debit') {
                const cat = t.category.split('-')[0].trim();
                categoryTotals.set(cat, (categoryTotals.get(cat) || 0) + Math.abs(t.amount));
            }
        });

        const topCategories = Array.from(categoryTotals.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(e => e[0]);

        // 2. Group by Month
        const monthlyData = new Map<string, any>();

        transactions.forEach(t => {
            if (t.type === 'debit' && t.date) {
                const d = new Date(t.date);
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM

                if (!monthlyData.has(key)) {
                    monthlyData.set(key, { month: key, timestamp: d.getTime() });
                }

                const entry = monthlyData.get(key);
                const cat = t.category.split('-')[0].trim();

                if (topCategories.includes(cat)) {
                    entry[cat] = (entry[cat] || 0) + Math.abs(t.amount);
                }
            }
        });

        // 3. Convert to array and sort
        const chartData = Array.from(monthlyData.values())
            .sort((a, b) => a.timestamp - b.timestamp)
            .map(entry => {
                const date = new Date(entry.timestamp);
                return {
                    ...entry,
                    displayDate: date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
                };
            });

        return { chartData, topCategories };
    }, [transactions]);

    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
    const LegendAny = Legend as any;

    return (
        <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={chartData}
                    margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis
                        dataKey="displayDate"
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                    />
                    <YAxis
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        tickFormatter={(value) => `₹${value / 1000}k`}
                        tickLine={false}
                        axisLine={false}
                        dx={-10}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                        formatter={(value: number) => [formatCurrency(value), '']}
                        labelStyle={{ color: '#374151', fontWeight: 'bold', marginBottom: '8px' }}
                    />
                    <LegendAny wrapperStyle={{ paddingTop: '20px' }} />
                    {topCategories.map((cat: string, index: number) => (
                        <Line
                            key={cat}
                            type="monotone"
                            dataKey={cat}
                            stroke={colors[index % colors.length]}
                            strokeWidth={3}
                            dot={{ r: 4, strokeWidth: 2 }}
                            activeDot={{ r: 6 }}
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};
