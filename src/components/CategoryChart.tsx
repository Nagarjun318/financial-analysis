import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Transaction } from '../types.ts';
import { formatCurrency } from '../utils.ts';

interface CategoryChartProps {
  transactions: Transaction[];
}

const COLORS = [
  '#06b6d4', // Vibrant cyan - modern and energetic
  '#10b981', // Emerald green - fresh and positive
  '#f59e0b', // Golden amber - warm and inviting
  '#8b5cf6', // Purple - luxurious and creative
  '#ef4444', // Bright red - strong and attention-grabbing
  '#ec4899', // Hot pink - bold and contemporary
  '#84cc16', // Lime green - fresh and modern
  '#f97316', // Orange - energetic and warm
  '#06b6d4', // Electric blue - tech and trust
  '#d946ef', // Fuchsia - vibrant and playful
  '#14b8a6', // Teal - balanced and professional
  '#f59e0b', // Bright yellow - optimistic and clear
  '#6366f1', // Indigo - deep and sophisticated
  '#fb7185', // Rose - gentle yet vibrant
  '#22d3ee', // Sky blue - light and airy
  '#a3e635', // Light green - growth and prosperity
];

const CategoryChart: React.FC<CategoryChartProps> = ({ transactions }) => {
  const expenseData = transactions
    .filter(t => t.type === 'debit')
    .reduce((acc, t) => {
      const category = t.category || 'Other';
      const existing = acc.find(item => item.name === category);
      const amount = Math.abs(t.amount);
      if (existing) {
        existing.value += amount;
      } else {
        acc.push({ name: category, value: amount });
      }
      return acc;
    }, [] as { name: string; value: number }[]);

  return (
    <div className="glass-panel animated-border p-6 rounded-xl shadow-lg h-full">
      <h3 className="text-xl font-semibold mb-4 gradient-text">Expense Breakdown</h3>
      {expenseData.length > 0 ? (
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Pie
              data={expenseData}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={130}
              fill="#8884d8"
              dataKey="value"
              nameKey="name"
            >
              {expenseData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="#ffffff" strokeWidth={1} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{
                backgroundColor: 'rgba(31, 41, 55, 0.8)',
                borderColor: '#4b5563',
                borderRadius: '0.5rem',
              }}
              labelStyle={{ color: '#f9fafb' }}
              itemStyle={{ color: '#f9fafb' }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      ) : (
         <div className="flex items-center justify-center h-[350px]">
            <p className="text-light-text-secondary dark:text-dark-text-secondary">No expense data to display.</p>
        </div>
      )}
    </div>
  );
};

export default CategoryChart;