import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Transaction } from '../src/types.ts';
import { formatCurrency } from '../utils.ts';

interface CategoryChartProps {
  transactions: Transaction[];
}

const COLORS = [
  '#0ea5e9', '#10b981', '#f97316', '#eab308', '#8b5cf6', 
  '#ec4899', '#64748b', '#ef4444', '#22c55e', '#3b82f6'
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
    <div className="bg-light-card dark:bg-dark-card p-6 rounded-xl shadow-md h-full">
      <h3 className="text-xl font-semibold mb-4 text-light-text dark:text-dark-text">Expense Breakdown</h3>
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
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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