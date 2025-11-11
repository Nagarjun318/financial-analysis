import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Transaction } from '../types.ts';
import { formatCurrency } from '../utils.ts';

interface TrendsChartProps {
  transactions: Transaction[];
}

const TrendsChart: React.FC<TrendsChartProps> = ({ transactions }) => {
  const chartData = React.useMemo(() => {
    // Assume incoming transactions are already filtered by year/month/category in parent if needed.
    // We aggregate all distinct YYYY-MM present in the provided list.
    const monthlySummary: Record<string, { income: number; expense: number }> = {};
    transactions.forEach(t => {
      if (!t.date || t.date.length < 7) return; // guard invalid date string
      const monthKey = t.date.substring(0, 7); // YYYY-MM
      if (!monthlySummary[monthKey]) monthlySummary[monthKey] = { income: 0, expense: 0 };
      if (t.type === 'credit') monthlySummary[monthKey].income += t.amount; else if (t.type === 'debit') monthlySummary[monthKey].expense += Math.abs(t.amount);
    });
    return Object.entries(monthlySummary)
      .map(([key, vals]) => {
        const [year, month] = key.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        const monthName = date.toLocaleString('default', { month: 'short' });
        return { month: `${monthName} '${year.substring(2)}`, key, income: vals.income, expense: vals.expense };
      })
      .sort((a, b) => a.key.localeCompare(b.key));
  }, [transactions]);

  return (
    <div className="glass-panel animated-border p-6 rounded-xl shadow-lg h-full">
      <h3 className="text-xl font-semibold mb-4 rainbow-text">Income vs. Expense Trends</h3>
      {chartData.length > 1 ? (
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} stroke="#9ca3af" />
            <XAxis dataKey="month" stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 12 }} />
            <YAxis 
              tickFormatter={(value) => `₹${Number(value / 1000).toFixed(0)}k`}
              stroke="#9ca3af"
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              width={50}
            />
            <Tooltip
              formatter={(value: number, name: string) => [formatCurrency(value), name.charAt(0).toUpperCase() + name.slice(1)]}
              contentStyle={{
                backgroundColor: 'rgba(31, 41, 55, 0.8)',
                borderColor: '#4b5563',
                borderRadius: '0.5rem',
              }}
              labelStyle={{ color: '#f9fafb' }}
              itemStyle={{ textTransform: 'capitalize' }}
            />
            {/* Legend removed due to TypeScript JSX typing issue; can be re-added once recharts types are adjusted */}
            <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={3} activeDot={{ r: 9 }} dot={{ r: 5 }} />
            <Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={3} activeDot={{ r: 9 }} dot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-[350px]">
          <p className="text-light-text-secondary dark:text-dark-text-secondary">Not enough monthly data to display a trend.</p>
        </div>
      )}
    </div>
  );
};

export default TrendsChart;