import React from 'react';
import { Transaction } from '../types';
import { Sankey, Tooltip, ResponsiveContainer, Layer, Rectangle } from 'recharts';
import { formatCurrency } from '../utils';

interface FinancialSankeyProps {
    transactions: Transaction[];
}

export const FinancialSankey: React.FC<FinancialSankeyProps> = ({ transactions }) => {
    const data = React.useMemo(() => {
        let totalIncome = 0;
        let totalExpense = 0;
        const categoryExpenses = new Map<string, number>();

        transactions.forEach(t => {
            if (t.type === 'credit') {
                totalIncome += t.amount;
            } else {
                const amount = Math.abs(t.amount);
                totalExpense += amount;
                const cat = t.category.split('-')[0].trim() || 'Uncategorized';
                categoryExpenses.set(cat, (categoryExpenses.get(cat) || 0) + amount);
            }
        });

        const savings = Math.max(0, totalIncome - totalExpense);

        // 1. Sort and Select Top Categories
        const sortedCategories = Array.from(categoryExpenses.entries())
            .sort((a, b) => b[1] - a[1]);

        const topCategories = sortedCategories.slice(0, 8);
        const otherCategories = sortedCategories.slice(8);
        const otherAmount = otherCategories.reduce((sum, [, amt]) => sum + amt, 0);

        // 2. Construct Nodes Array
        const nodes: { name: string }[] = [{ name: 'Total Income' }]; // Index 0

        // Add Top Category Nodes
        topCategories.forEach(([name]) => nodes.push({ name }));

        // Add Other Node if needed
        if (otherAmount > 0) {
            nodes.push({ name: 'Other Expenses' });
        }

        // Add Savings Node if needed
        if (savings > 0) {
            nodes.push({ name: 'Savings' });
        }

        // 3. Construct Links
        const links: { source: number; target: number; value: number }[] = [];

        // Link Income -> Top Categories
        topCategories.forEach(([name, amount]) => {
            const targetIndex = nodes.findIndex(n => n.name === name);
            links.push({ source: 0, target: targetIndex, value: amount });
        });

        // Link Income -> Other
        if (otherAmount > 0) {
            const targetIndex = nodes.findIndex(n => n.name === 'Other Expenses');
            links.push({ source: 0, target: targetIndex, value: otherAmount });
        }

        // Link Income -> Savings
        if (savings > 0) {
            const targetIndex = nodes.findIndex(n => n.name === 'Savings');
            links.push({ source: 0, target: targetIndex, value: savings });
        }

        return { nodes, links };
    }, [transactions]);

    if (data.nodes.length <= 1 || data.links.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <p>Not enough data to visualize flow.</p>
            </div>
        );
    }

    // Custom Node Content
    const renderNode = (props: any) => {
        const { x, y, width, height, index, payload, containerWidth } = props;
        const isOut = x + width + 6 > containerWidth;

        return (
            <Layer key={`node-${index}`}>
                <Rectangle
                    x={x} y={y} width={width} height={height}
                    fill={payload.name === 'Total Income' ? '#6366f1' : payload.name === 'Savings' ? '#10b981' : '#f43f5e'}
                    fillOpacity="0.8"
                />
                <text
                    x={x + width / 2}
                    y={y + height / 2}
                    textAnchor="middle"
                    alignmentBaseline="middle"
                    fontSize="12"
                    fill="#fff"
                    style={{ pointerEvents: 'none', fontWeight: 'bold' }}
                >
                    {payload.name.substring(0, 3).toUpperCase()}
                </text>
                <text
                    x={x + width / 2}
                    y={y - 6}
                    textAnchor="middle"
                    fill="#666"
                    fontSize="10"
                >
                    {payload.name}
                </text>
            </Layer>
        );
    };

    return (
        <ResponsiveContainer width="100%" height="100%">
            <Sankey
                data={data}
                node={{ width: 15, colors: ['#8884d8'] }}
                nodePadding={50}
                margin={{ left: 20, right: 20, top: 20, bottom: 20 }}
                link={{ stroke: '#777', strokeOpacity: 0.3 }}
            >
                <Tooltip
                    content={({ payload }: any) => {
                        if (!payload || !payload.length) return null;
                        const data = payload[0];
                        return (
                            <div className="bg-white dark:bg-gray-800 p-2 border border-gray-200 dark:border-gray-700 rounded shadow-lg text-xs">
                                <p className="font-semibold">{data.name}</p>
                                <p className="font-mono">{formatCurrency(data.value as number)}</p>
                            </div>
                        );
                    }}
                />
            </Sankey>
        </ResponsiveContainer>
    );
};
