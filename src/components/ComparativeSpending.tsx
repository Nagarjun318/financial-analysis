import React from 'react';
import { Transaction } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { formatCurrency } from '../utils';

interface ComparativeSpendingProps {
    transactions: Transaction[];
}

export const ComparativeSpending: React.FC<ComparativeSpendingProps> = ({ transactions }) => {
    const data = React.useMemo(() => {
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        const lastMonthDate = new Date(today);
        lastMonthDate.setMonth(currentMonth - 1);
        const lastMonth = lastMonthDate.getMonth();
        const lastMonthYear = lastMonthDate.getFullYear();

        const sameMonthLastYearDate = new Date(today);
        sameMonthLastYearDate.setFullYear(currentYear - 1);
        const sameMonthLastYear = sameMonthLastYearDate.getMonth();
        const sameMonthLastYearYear = sameMonthLastYearDate.getFullYear();

        let currentMonthSpend = 0;
        let lastMonthSpend = 0;
        let sameMonthLastYearSpend = 0;

        transactions.forEach(t => {
            if (t.type === 'debit' && t.date) {
                const d = new Date(t.date);
                const m = d.getMonth();
                const y = d.getFullYear();
                const amount = Math.abs(t.amount);

                if (m === currentMonth && y === currentYear) {
                    currentMonthSpend += amount;
                } else if (m === lastMonth && y === lastMonthYear) {
                    lastMonthSpend += amount;
                } else if (m === sameMonthLastYear && y === sameMonthLastYearYear) {
                    sameMonthLastYearSpend += amount;
                }
            }
        });

        return [
            {
                name: 'Same Month Last Year',
                amount: sameMonthLastYearSpend,
                label: sameMonthLastYearDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
                color: '#94a3b8' // gray-400
            },
            {
                name: 'Last Month',
                amount: lastMonthSpend,
                label: lastMonthDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
                color: '#60a5fa' // blue-400
            },
            {
                name: 'Current Month',
                amount: currentMonthSpend,
                label: today.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
                color: '#f43f5e' // rose-500
            }
        ];
    }, [transactions]);

    return (
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={data}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
                    <XAxis type="number" hide />
                    <YAxis
                        type="category"
                        dataKey="name"
                        width={140}
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <Tooltip
                        cursor={{ fill: 'transparent' }}
                        content={({ active, payload }: any) => {
                            if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                    <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl">
                                        <p className="font-semibold text-gray-900 dark:text-white mb-1">{data.name}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{data.label}</p>
                                        <p className="text-lg font-bold font-mono text-brand-primary">
                                            {formatCurrency(data.amount)}
                                        </p>
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />
                    <Bar dataKey="amount" radius={[0, 4, 4, 0]} barSize={40}>
                        {data.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};
