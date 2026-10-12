import React from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Transaction } from '../types';
import type { ChartGroupBy } from '../services/geminiService';
import { X } from 'lucide-react';

interface AIChartProps {
  transactions: Transaction[];
  chartType: 'bar' | 'pie' | 'line';
  title: string;
  onClose: () => void;
  /** How to bucket the data. When null, each chart type uses its default
   * (pie → AI category, line → month, bar → individual transactions). */
  groupBy?: ChartGroupBy | null;
}

export interface AIChartDatum {
  name: string;
  value: number;
  count: number;
  fullName?: string;
  date?: string;
  // Index signature required by recharts' ChartDataInput type.
  [key: string]: string | number | undefined;
}

/**
 * Pure aggregation for AI search charts (unit-tested). An explicit `groupBy`
 * from the AI ("grouped by AI category") always wins; otherwise each chart
 * type keeps its historical default so existing queries render unchanged.
 */
export function prepareAIChartData(
  transactions: Transaction[],
  chartType: 'bar' | 'pie' | 'line',
  groupBy?: ChartGroupBy | null
): AIChartDatum[] {
  const grouping: ChartGroupBy =
    groupBy ?? (chartType === 'pie' ? 'ai_category' : chartType === 'line' ? 'month' : 'transaction');

  if (grouping === 'month') {
    const monthlyTotals = new Map<string, { value: number; count: number }>();
    for (const t of transactions) {
      const month = t.date.substring(0, 7); // YYYY-MM
      const entry = monthlyTotals.get(month) ?? { value: 0, count: 0 };
      entry.value += Math.abs(t.amount);
      entry.count += 1;
      monthlyTotals.set(month, entry);
    }
    return [...monthlyTotals.entries()]
      .map(([name, { value, count }]) => ({ name, value, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  if (grouping === 'ai_category' || grouping === 'category') {
    const totals = new Map<string, { value: number; count: number }>();
    for (const t of transactions) {
      const key =
        grouping === 'ai_category'
          ? t.ai_category || t.category || 'Uncategorized'
          : t.category || 'Uncategorized';
      const entry = totals.get(key) ?? { value: 0, count: 0 };
      entry.value += Math.abs(t.amount);
      entry.count += 1;
      totals.set(key, entry);
    }
    const rows = [...totals.entries()]
      .map(([name, { value, count }]) => ({ name, value, count }))
      .sort((a, b) => b.value - a.value);
    return chartType === 'pie' ? rows.slice(0, 10) : rows;
  }

  // 'transaction': one bar per transaction (top-N / individual rankings).
  return transactions.map(t => ({
    name: t.description.substring(0, 30) + (t.description.length > 30 ? '...' : ''),
    value: Math.abs(t.amount),
    count: 1,
    fullName: t.description,
    date: t.date,
  }));
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#14b8a6', '#f97316', '#06b6d4'];

const AIChart: React.FC<AIChartProps> = ({ transactions, chartType, title, onClose, groupBy }) => {
  const data = prepareAIChartData(transactions, chartType, groupBy);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
  };

  const renderTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const datum = payload[0].payload as AIChartDatum;
    return (
      <div style={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', padding: '8px 12px' }}>
        <p style={{ color: '#f3f4f6', fontWeight: 600 }}>{datum.fullName ?? label ?? datum.name}</p>
        <p style={{ color: '#c4b5fd' }}>{formatCurrency(datum.value)}</p>
        {datum.count > 1 && (
          <p style={{ color: '#9ca3af', fontSize: 12 }}>{datum.count} transactions</p>
        )}
      </div>
    );
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

      <div style={{ width: '100%', height: '400px' }}>
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
            <Tooltip content={renderTooltip} />
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
            <Tooltip content={renderTooltip} />
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
            <Tooltip content={renderTooltip} />
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
      </div>

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
