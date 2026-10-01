import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Transaction } from '../types.ts';
import { formatCurrency } from '../utils.ts';
import { paletteColor, useChartTheme } from './charts/chartTheme.ts';

interface CategoryChartProps {
  transactions: Transaction[];
}

const CategoryChart: React.FC<CategoryChartProps> = ({ transactions }) => {
  const theme = useChartTheme();
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
                <Cell key={`cell-${index}`} fill={paletteColor(index)} stroke="#ffffff" strokeWidth={1} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={theme.tooltip.contentStyle}
              labelStyle={theme.tooltip.labelStyle}
              itemStyle={theme.tooltip.itemStyle}
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