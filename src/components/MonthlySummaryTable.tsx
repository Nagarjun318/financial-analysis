import React from 'react';
import { Transaction } from '../types.ts';
import { formatCurrency } from '../utils.ts';
// Replaced localStorage budgets with Supabase-backed category budgets
import { useCategoryBudgets, computeCategoryBudgetVariance } from '../hooks/useCategoryBudgets.ts';

interface MonthlySummaryTableProps {
    userId: string;
    transactions: Transaction[];
    onCellClick: (monthYear: string | null, transactionType: 'debit' | 'credit' | null, category: string) => void;
    onFiltersChange?: (filters: { year: string; category: string }) => void;
}

const MonthlySummaryTable: React.FC<MonthlySummaryTableProps> = ({ userId, transactions, onCellClick, onFiltersChange }) => {
    const years = React.useMemo((): (string|number)[] => {
        // SAFER: Extract year via string slicing to avoid timezone bugs from `new Date()`.
        const yearSet = new Set<number>(transactions.map((t: Transaction) => {
            return t.date ? parseInt(t.date.substring(0, 4), 10) : NaN;
        }).filter((y: number) => !isNaN(y)));
        
        // Ensure the current year is always an option in the dropdown.
        yearSet.add(new Date().getFullYear());

        // FIX: The TypeScript compiler was struggling to infer the types correctly in the original
        // complex one-liner. Sorting the array of numbers before spreading it into the
        // final array helps the compiler resolve the types correctly and fixes the arithmetic error.
        // Fix: Explicitly type `a` and `b` as numbers to prevent arithmetic operation errors with stricter TypeScript configurations.
        const sortedYears = Array.from(yearSet).sort((a: number, b: number) => b - a);
        return ['All', ...sortedYears];
    }, [transactions]);

    // Default the selected year to the current year for a more relevant initial view.
    const [selectedYear, setSelectedYear] = React.useState(new Date().getFullYear().toString());
    const [selectedCategory, setSelectedCategory] = React.useState('All');
    // Supabase-backed budgets
    const sessionUserId = null; // Placeholder: supply actual user id from higher-level context or props if needed
    const { budgets, saveBudget, removeBudget, loading: budgetsLoading } = useCategoryBudgets(userId);
    const [budgetInput, setBudgetInput] = React.useState('');

    const categories = React.useMemo((): string[] => {
        const categorySet = new Set<string>();
        transactions.forEach((transaction: Transaction) => {
            const rawCategory = typeof transaction.category === 'string' ? transaction.category : '';
            rawCategory.split('-').forEach((cat: string) => {
                if (cat) categorySet.add(cat);
            });
        });
        return ['All', ...Array.from(categorySet).sort()];
    }, [transactions]);

    const filteredTransactions = React.useMemo(() => {
        let filtered = transactions;

        if (selectedYear !== 'All' && !isNaN(parseInt(selectedYear))) {
            // SAFER: Filter by comparing the year part of the date string.
            const yearStr = String(selectedYear);
            filtered = filtered.filter((t: Transaction) => t.date && t.date.startsWith(yearStr));
        }

        if (selectedCategory !== 'All') {
            filtered = filtered.filter((t: Transaction) => {
                const rawCategory = typeof t.category === 'string' ? t.category : '';
                return rawCategory.split('-').includes(selectedCategory);
            });
        }
        
        return filtered;
    }, [transactions, selectedYear, selectedCategory]);


    const monthlyData = React.useMemo(() => {
        const data: { [key: string]: { revenue: number; expense: number } } = {};

    filteredTransactions.forEach((t: Transaction) => {
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

    const grandTotal = React.useMemo(() => {
    const totalRevenue = monthlyData.reduce((sum: number, d: any) => sum + d.revenue, 0);
    const totalExpense = monthlyData.reduce((sum: number, d: any) => sum + d.expense, 0);
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

    // Infinite scroll state for monthly table
    const BATCH_SIZE = 24; // up to 2 years of months in one go
    const [visibleCount, setVisibleCount] = React.useState(BATCH_SIZE);
    React.useEffect(() => { setVisibleCount(BATCH_SIZE); }, [monthlyData]);
    const visibleMonths = React.useMemo(() => monthlyData.slice(0, visibleCount), [monthlyData, visibleCount]);
    const handleScrollLoadMore = (e: React.UIEvent<HTMLDivElement>) => {
        const el = e.currentTarget;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 32) {
            if (visibleCount < monthlyData.length) {
                setVisibleCount((c: number) => Math.min(c + BATCH_SIZE, monthlyData.length));
            }
        }
    };

    // IMPORTANT: Removed early return that skipped this effect when transactions was empty.
    // Returning early after some hooks but before others caused a hook order change once data arrived,
    // triggering the "Rendered more hooks" error. All hooks must run every render.

    // Initialize parent dashboard filters on first mount so charts reflect current year immediately.
    React.useEffect(() => {
        if (onFiltersChange) onFiltersChange({ year: selectedYear, category: selectedCategory });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="bg-light-card dark:bg-dark-card p-4 sm:p-6 rounded-xl shadow-md">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
                 <h3 className="text-xl font-semibold text-light-text dark:text-dark-text">Monthly Summary</h3>
                            <div className="flex items-center gap-4 flex-wrap">
                                        <select
                                                value={selectedYear}
                                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                                    const val = e.target.value;
                                                    setSelectedYear(val);
                                                    if (onFiltersChange) onFiltersChange({ year: val, category: selectedCategory });
                                                }}
                        className="bg-light-bg dark:bg-dark-bg border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-primary"
                    >
                        {years.map((year: string | number) => <option key={String(year)} value={year}>{year}</option>)}
                    </select>
                                        <select
                                                value={selectedCategory}
                                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                                    const val = e.target.value;
                                                    setSelectedCategory(val);
                                                    if (onFiltersChange) onFiltersChange({ year: selectedYear, category: val });
                                                }}
                        className="bg-light-bg dark:bg-dark-bg border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-primary">
                        {categories.map((cat: string) => <option key={cat} value={cat}>{cat === 'All' ? 'All Categories' : cat}</option>)}
                    </select>
                                        {selectedCategory !== 'All' && (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    id="budget-input"
                                                    name="budget-input"
                                                    type="number"
                                                    placeholder="Budget (₹)"
                                                    value={budgetInput}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBudgetInput(e.target.value)}
                                                    className="w-28 bg-light-bg dark:bg-dark-bg border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-xs focus:ring-2 focus:ring-brand-primary"
                                                />
                                                                        <button
                                                    type="button"
                                                                            disabled={!userId || budgetsLoading}
                                                                            onClick={() => { const v = parseFloat(budgetInput); if (!isNaN(v) && userId) { saveBudget({ category: selectedCategory, budget: v }); }}}
                                                                            className="px-2 py-1 text-xs rounded bg-brand-primary text-white hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                        >{budgetsLoading ? 'Saving...' : 'Save Budget'}</button>
                                                <button
                                                    type="button"
                                                    onClick={() => { removeBudget(selectedCategory); setBudgetInput(''); }}
                                                    className="px-2 py-1 text-xs rounded bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-100 hover:bg-gray-400 dark:hover:bg-gray-500"
                                                >Clear</button>
                                            </div>
                                        )}
                 </div>
            </div>

            {/* Removed grand total header cards; footer now provides totals */}
            
            <div className="overflow-x-auto max-h-[420px] overflow-y-auto" onScroll={handleScrollLoadMore}>
                <table className="w-full text-sm table-fixed">
                    <colgroup>
                        <col style={{ width: 150 }} />
                        <col style={{ width: 120 }} />
                        <col style={{ width: 120 }} />
                        <col style={{ width: 120 }} />
                        <col style={{ width: 130 }} />
                        <col style={{ width: 130 }} />
                        <col style={{ width: 130 }} />
                        {selectedCategory !== 'All' && <col style={{ width: 120 }} />}
                        {selectedCategory !== 'All' && <col style={{ width: 120 }} />}
                    </colgroup>
                    <thead className="sticky top-0 z-10 bg-light-bg dark:bg-dark-bg shadow-sm">
                        <tr>
                            <th className="px-3 py-2 font-semibold text-left">Date - Year-Month</th>
                            <th className="px-3 py-2 font-semibold text-right text-green-700 dark:text-green-300">REVENUE</th>
                            <th className="px-3 py-2 font-semibold text-right text-red-700 dark:text-red-300">EXPENSE</th>
                            <th className="px-3 py-2 font-semibold text-right text-emerald-700 dark:text-emerald-300">SAVINGS</th>
                            <th className="px-3 py-2 font-semibold text-right">Expense Ratio</th>
                            <th className="px-3 py-2 font-semibold text-right">Savings Ratio</th>
                            <th className="px-3 py-2 font-semibold text-right">Balance</th>
                            {selectedCategory !== 'All' && <th className="px-3 py-2 font-semibold text-right">Budget</th>}
                            {selectedCategory !== 'All' && <th className="px-3 py-2 font-semibold text-right">Variance</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {visibleMonths.map((row: any) => {
                            const savingsClasses = row.savings >= 0 
                                ? 'text-emerald-700 dark:text-emerald-300' 
                                : 'text-red-700 dark:text-red-300';

                            const expenseRatioClasses = row.expenseRatio > 0.6 
                                ? 'text-red-700 dark:text-red-400 font-semibold' 
                                : '';

                            const savingsRatioClasses = row.savingsRatio > 0.4 
                                ? 'text-green-700 dark:text-green-300 font-semibold' 
                                : '';

                            const variance = selectedCategory !== 'All' ? computeCategoryBudgetVariance(row.key, selectedCategory, filteredTransactions, budgets) : null;
                            const varianceClasses = variance && variance.variance !== undefined && variance.variance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-300';
                            return (
                                <tr key={row.month} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                                    <td 
                                        className="px-3 py-2 font-medium cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                        onClick={() => onCellClick(row.key, null, selectedCategory)}
                                        title={`Filter transactions for ${row.month}`}
                                    >
                                        {row.month}
                                    </td>
                                    <td 
                                        className="px-3 py-2 text-right font-mono cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                        onClick={() => onCellClick(row.key, 'credit', selectedCategory)}
                                        title={`Filter revenue for ${row.month}`}
                                    >
                                        {formatCurrency(row.revenue)}
                                    </td>
                                    <td 
                                        className="px-3 py-2 text-right font-mono cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                        onClick={() => onCellClick(row.key, 'debit', selectedCategory)}
                                        title={`Filter expenses for ${row.month}`}
                                    >
                                        {formatCurrency(row.expense)}
                                    </td>
                                    <td className={`px-3 py-2 text-right font-mono font-semibold ${savingsClasses}`}>{formatCurrency(row.savings)}</td>
                                    <td className={`px-3 py-2 text-right font-mono ${expenseRatioClasses}`}>{(row.expenseRatio * 100).toFixed(2)}%</td>
                                    <td className={`px-3 py-2 text-right font-mono ${savingsClasses}`}>{(row.savingsRatio * 100).toFixed(2)}%</td>
                                    <td className="px-3 py-2 text-right font-mono">{formatCurrency(row.balance)}</td>
                                    {selectedCategory !== 'All' && <td className="px-3 py-2 text-right font-mono text-indigo-600 dark:text-indigo-300">{(() => { const b = budgets.find((b: any) => b.category === selectedCategory); return b ? formatCurrency(b.budget) : '-'; })()}</td>}
                                    {selectedCategory !== 'All' && <td className={`px-3 py-2 text-right font-mono ${variance ? varianceClasses : ''}`}>{variance ? (variance.variance && variance.target ? `${variance.variance > 0 ? '+' : ''}${formatCurrency(variance.variance)}` : '-') : '-'}</td>}
                                </tr>
                            );
                        })}
                        {visibleMonths.length === 0 && (
                            <tr>
                                <td colSpan={selectedCategory !== 'All' ? 9 : 7} className="text-center py-8 text-light-text-secondary dark:text-dark-text-secondary">No data</td>
                            </tr>
                        )}
                    </tbody>
                    <tfoot className="sticky bottom-0 z-10 bg-light-bg dark:bg-dark-bg shadow-inner">
                        <tr>
                            <td className="px-3 py-2 font-semibold text-left">Totals</td>
                            <td className="px-3 py-2 font-mono text-right text-green-700 dark:text-green-300">{formatCurrency(grandTotal.revenue)}</td>
                            <td className="px-3 py-2 font-mono text-right text-red-700 dark:text-red-300">{formatCurrency(grandTotal.expense)}</td>
                            <td className={`px-3 py-2 font-mono text-right font-semibold ${grandTotal.savings >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>{formatCurrency(grandTotal.savings)}</td>
                            <td className="px-3 py-2" colSpan={selectedCategory !== 'All' ?  (selectedCategory !== 'All' ? 5 : 3) : 3}></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};

export default MonthlySummaryTable;