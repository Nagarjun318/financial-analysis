import React, { useState, useMemo } from 'react';
import { Transaction } from '../types';
import { formatCurrency } from '../utils';

interface MonthlySummaryTableProps {
  transactions: Transaction[];
  onCellClick: (monthYear: string | null, transactionType: 'debit' | 'credit' | null, category: string) => void;
}

const MonthlySummaryTable: React.FC<MonthlySummaryTableProps> = ({ transactions, onCellClick }) => {
    const years = useMemo(() => {
        // SAFER: Extract year via string slicing to avoid timezone bugs from `new Date()`.
        const yearSet = new Set(transactions.map(t => {
            return t.date ? parseInt(t.date.substring(0, 4), 10) : NaN;
        }).filter(y => !isNaN(y)));
        
        // Ensure the current year is always an option in the dropdown.
        yearSet.add(new Date().getFullYear());

        return ['All', ...Array.from(yearSet).sort((a, b) => b - a)];
    }, [transactions]);

    // Default the selected year to the current year for a more relevant initial view.
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
    const [selectedCategory, setSelectedCategory] = useState('All');

    const categories = useMemo(() => {
        const categorySet = new Set<string>();
        transactions.forEach(transaction => {
            transaction.category.split('-').forEach(cat => {
                if (cat) {
                    categorySet.add(cat);
                }
            });
        });
        return ['All', ...Array.from(categorySet).sort()];
    }, [transactions]);

    const filteredTransactions = useMemo(() => {
        let filtered = transactions;

        if (selectedYear !== 'All' && !isNaN(parseInt(selectedYear))) {
            // SAFER: Filter by comparing the year part of the date string.
            const yearStr = String(selectedYear);
            filtered = filtered.filter(t => t.date && t.date.startsWith(yearStr));
        }

        if (selectedCategory !== 'All') {
            filtered = filtered.filter(t => t.category.split('-').includes(selectedCategory));
        }
        
        return filtered;
    }, [transactions, selectedYear, selectedCategory]);


    const monthlyData = useMemo(() => {
        const data: { [key: string]: { revenue: number; expense: number } } = {};

        filteredTransactions.forEach(t => {
            // SAFER: Use string slicing to get the month key (e.g., "2025-03").
            // This completely avoids timezone issues that can occur with `new Date(t.date)`.
            if (!t.date || !/^\d{4}-\d{2}-\d{2}$/.test(t.date)) {
                return; // Skip transactions with invalid date formats
            }
            const key = t.date.substring(0, 7); // "YYYY-MM"

            if (!data[key]) {
                data[key] = { revenue: 0, expense: 0 };
            }

            if (t.type === 'credit') {
                data[key].revenue += t.amount;
            } else {
                data[key].expense += Math.abs(t.amount);
            }
        });

        const sortedMonths = Object.keys(data).sort();
        let runningBalance = 0;

        return sortedMonths.map(key => {
            const { revenue, expense } = data[key];
            const savings = revenue - expense;
            runningBalance += savings;

            const [year, monthNum] = key.split('-');
            // This part is safe because it uses Date.UTC which is timezone-agnostic.
            const monthName = new Date(Date.UTC(parseInt(year), parseInt(monthNum) - 1)).toLocaleString('default', { month: 'short', timeZone: 'UTC' });

            return {
                key, // YYYY-MM key for filtering
                month: `${year}-${monthName}`,
                revenue,
                expense,
                savings,
                expenseRatio: revenue > 0 ? expense / revenue : 0,
                savingsRatio: revenue > 0 ? savings / revenue : 0,
                balance: runningBalance,
            };
        });
    }, [filteredTransactions]);

    const grandTotal = useMemo(() => {
        const totalRevenue = monthlyData.reduce((sum, d) => sum + d.revenue, 0);
        const totalExpense = monthlyData.reduce((sum, d) => sum + d.expense, 0);
        const totalSavings = totalRevenue - totalExpense;
        const count = monthlyData.length;
        return {
            revenue: totalRevenue,
            expense: totalExpense,
            savings: totalSavings,
            avgRevenue: count > 0 ? totalRevenue / count : 0,
            avgExpense: count > 0 ? totalExpense / count : 0,
            avgSavings: count > 0 ? totalSavings / count : 0,
        };
    }, [monthlyData]);

    if (transactions.length === 0) {
        return null;
    }

    return (
        <div className="bg-light-card dark:bg-dark-card p-4 sm:p-6 rounded-xl shadow-md">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
                 <h3 className="text-xl font-semibold text-light-text dark:text-dark-text">Monthly Summary</h3>
                 <div className="flex items-center gap-4">
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="bg-light-bg dark:bg-dark-bg border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-primary"
                    >
                        {years.map(year => <option key={year} value={year}>{year}</option>)}
                    </select>
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="bg-light-bg dark:bg-dark-bg border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-primary">
                        {categories.map(cat => <option key={cat} value={cat}>{cat === 'All' ? 'All Categories' : cat}</option>)}
                    </select>
                 </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-4 text-center">
                <div className="p-3 rounded-lg font-bold flex items-center justify-center">Grand Total</div>
                 <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-lg">
                    <div>SUM = {formatCurrency(grandTotal.revenue)}</div>
                    <div className="text-sm font-normal">AVG = {formatCurrency(grandTotal.avgRevenue)}</div>
                </div>
                <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-lg">
                    <div>SUM = {formatCurrency(grandTotal.expense)}</div>
                    <div className="text-sm font-normal">AVG = {formatCurrency(grandTotal.avgExpense)}</div>
                </div>
                <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-lg">
                    <div>SUM = {formatCurrency(grandTotal.savings)}</div>
                    <div className="text-sm font-normal">AVG = {formatCurrency(grandTotal.avgSavings)}</div>
                </div>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-gray-100 dark:bg-gray-700">
                        <tr>
                            <th className="px-3 py-2 font-semibold text-left">Date - Year-Month</th>
                            <th className="px-3 py-2 font-semibold text-right text-green-700 dark:text-green-300">REVENUE</th>
                            <th className="px-3 py-2 font-semibold text-right text-red-700 dark:text-red-300">EXPENSE</th>
                            <th className="px-3 py-2 font-semibold text-right text-emerald-700 dark:text-emerald-300">SAVINGS</th>
                            <th className="px-3 py-2 font-semibold text-right">Expense Ratio</th>
                            <th className="px-3 py-2 font-semibold text-right">Savings Ratio</th>
                            <th className="px-3 py-2 font-semibold text-right">Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        {monthlyData.map((row) => {
                             const savingsClasses = row.savings >= 0 
                                ? 'bg-green-100 dark:bg-green-800/30 text-emerald-700 dark:text-emerald-300' 
                                : 'bg-red-100 dark:bg-red-800/30 text-red-700 dark:text-red-300';
                            
                            const expenseRatioClasses = row.expenseRatio > 0.6 
                                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 font-semibold' 
                                : '';
                                
                            const savingsRatioClasses = row.savingsRatio > 0.4 
                                ? 'bg-green-100 dark:bg-green-800/30 text-green-700 dark:text-green-300 font-semibold' 
                                : '';

                            return (
                                <tr key={row.month} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                                    <td 
                                        className="px-3 py-2 font-medium cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                        onClick={() => onCellClick(row.key, null, selectedCategory)}
                                        title={`Filter transactions for ${row.month}`}
                                    >
                                        {row.month}
                                    </td>
                                    <td 
                                        className="px-3 py-2 text-right font-mono cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                        onClick={() => onCellClick(row.key, 'credit', selectedCategory)}
                                        title={`Filter revenue for ${row.month}`}
                                    >
                                        {formatCurrency(row.revenue)}
                                    </td>
                                    <td 
                                        className="px-3 py-2 text-right font-mono cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                        onClick={() => onCellClick(row.key, 'debit', selectedCategory)}
                                        title={`Filter expenses for ${row.month}`}
                                    >
                                        {formatCurrency(row.expense)}
                                    </td>
                                    <td className={`px-3 py-2 text-right font-mono font-semibold ${savingsClasses}`}>{formatCurrency(row.savings)}</td>
                                    <td className={`px-3 py-2 text-right font-mono ${expenseRatioClasses}`}>{(row.expenseRatio * 100).toFixed(2)}%</td>
                                    <td className={`px-3 py-2 text-right font-mono ${savingsClasses}`}>{(row.savingsRatio * 100).toFixed(2)}%</td>
                                    <td className="px-3 py-2 text-right font-mono">{formatCurrency(row.balance)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default MonthlySummaryTable;