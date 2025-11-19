import React from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Transaction } from '../types';
import { X } from 'lucide-react';

interface AIChartProps {
  transactions: Transaction[];
  chartType: 'bar' | 'pie' | 'line';
  title: string;
  onClose: () => void;
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#14b8a6', '#f97316', '#06b6d4'];

const AIChart: React.FC<AIChartProps> = ({ transactions, chartType, title, onClose }) => {
  const prepareChartData = () => {
    if (chartType === 'pie') {
      // Group by category for pie chart
      const categoryTotals = transactions.reduce((acc, t) => {
        const amount = Math.abs(t.amount);
        const category = t.ai_category || t.category;
        acc[category] = (acc[category] || 0) + amount;
        return acc;
      }, {} as Record<string, number>);

      return Object.entries(categoryTotals)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10); // Top 10 for pie chart
    } else if (chartType === 'line') {
      // Group by month for line chart
      const monthlyTotals = transactions.reduce((acc, t) => {
        const month = t.date.substring(0, 7); // YYYY-MM
        const amount = Math.abs(t.amount);
        acc[month] = (acc[month] || 0) + amount;
        return acc;
      }, {} as Record<string, number>);

      return Object.entries(monthlyTotals)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => a.name.localeCompare(b.name));
    } else {
      // Bar chart - use transactions as is (already limited/sorted by AI)
      return transactions.map(t => ({
        name: t.description.substring(0, 30) + (t.description.length > 30 ? '...' : ''),
        value: Math.abs(t.amount),
        fullName: t.description,
        date: t.date,
      }));
    }
  };

  const data = prepareChartData();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
  };

  return (
    <div className="glass-panel p-6 rounded-xl mt-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h3>
        <button
          onClick={onClose}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        {chartType === 'bar' && (
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
            <XAxis
              dataKey="name"
              angle={-45}
              textAnchor="end"
              height={100}
              tick={{ fill: '#6b7280', fontSize: 12 }}
            />
            <YAxis
              tickFormatter={formatCurrency}
              tick={{ fill: '#6b7280', fontSize: 12 }}
            />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
              labelStyle={{ color: '#f3f4f6' }}
            />
            <Bar dataKey="value" fill="#6366f1" radius={[8, 8, 0, 0]} />
          </BarChart>
        )}

        {chartType === 'pie' && (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={(entry: any) => `${entry.name}: ${(entry.percent * 100).toFixed(0)}%`}
              outerRadius={120}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
              labelStyle={{ color: '#f3f4f6' }}
            />
          </PieChart>
        )}

        {chartType === 'line' && (
          <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
            <XAxis
              dataKey="name"
              tick={{ fill: '#6b7280', fontSize: 12 }}
            />
            <YAxis
              tickFormatter={formatCurrency}
              tick={{ fill: '#6b7280', fontSize: 12 }}
            />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
              labelStyle={{ color: '#f3f4f6' }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#6366f1"
              strokeWidth={2}
              dot={{ fill: '#6366f1', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        )}
      </ResponsiveContainer>

      <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
        <p>Based on {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}</p>
        <p className="mt-1">
          Total: {formatCurrency(transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0))}
        </p>
      </div>
    </div>
  );
};

export default AIChart;
