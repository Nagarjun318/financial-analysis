import React from 'react';
import { Transaction } from '../types.ts';
import { formatCurrency } from '../utils.ts';

interface CategoryWiseMonthlyTableProps {
    transactions: Transaction[];
    monthYear?: string | null; // External month filter from MonthlySummaryTable (YYYY-MM format)
}

interface CategoryData {
    category: string;
    debitSum: number;
    creditSum: number;
}

type FieldOption = 'category' | 'ai_category' | 'description' | 'type';

interface FieldConfig {
    key: FieldOption;
    label: string;
}

const FIELD_OPTIONS: FieldConfig[] = [
    { key: 'category', label: 'Category' },
    { key: 'ai_category', label: 'AI Category' },
    { key: 'description', label: 'Description' },
    { key: 'type', label: 'Type (Debit/Credit)' },
];

const CategoryWiseMonthlyTable: React.FC<CategoryWiseMonthlyTableProps> = ({ transactions, monthYear }) => {
    // Get previous month as default (current month - 1)
    const currentDate = new Date();
    const previousMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    const defaultMonth = `${previousMonthDate.getFullYear()}-${String(previousMonthDate.getMonth() + 1).padStart(2, '0')}`;

    const [selectedMonth, setSelectedMonth] = React.useState(monthYear || defaultMonth);
    const [selectedField, setSelectedField] = React.useState('category' as FieldOption);

    // Sync with external month filter
    React.useEffect(() => {
        if (monthYear) {
            setSelectedMonth(monthYear);
        }
    }, [monthYear]);

    // Get unique months from transactions
    const availableMonths = React.useMemo(() => {
        const monthSet = new Set<string>();
        transactions.forEach((t: Transaction) => {
            if (t.date && /^\d{4}-\d{2}-\d{2}$/.test(t.date)) {
                const monthKey = t.date.substring(0, 7); // YYYY-MM
                monthSet.add(monthKey);
            }
        });
        // Add current month if not present
        monthSet.add(defaultMonth);

        // Sort months in descending order (most recent first)
        return Array.from(monthSet).sort().reverse();
    }, [transactions, defaultMonth]);

    // Get field value from transaction
    const getFieldValue = (transaction: Transaction, field: FieldOption): string => {
        switch (field) {
            case 'category':
                return typeof transaction.category === 'string' ? transaction.category : '';
            case 'ai_category':
                return transaction.ai_category || 'Uncategorized';
            case 'description':
                return transaction.description || 'No Description';
            case 'type':
                return transaction.type === 'debit' ? 'Debit' : 'Credit';
            default:
                return '';
        }
    };

    // Calculate data for selected field and month
    const categoryData = React.useMemo((): CategoryData[] => {
        const categoryMap = new Map<string, { debitSum: number; creditSum: number }>();

        // Filter transactions for selected month
        const monthTransactions = transactions.filter((t: Transaction) =>
            t.date && t.date.startsWith(selectedMonth)
        );

        // Aggregate by selected field
        monthTransactions.forEach((t: Transaction) => {
            const fieldValue = getFieldValue(t, selectedField);

            // Don't split hyphenated values to avoid double counting
            // Keep the full value as a single entry
            const trimmedVal = fieldValue.trim();
            if (trimmedVal) {
                const current = categoryMap.get(trimmedVal) || { debitSum: 0, creditSum: 0 };

                // Track debit and credit separately
                if (t.type === 'debit') {
                    current.debitSum += Math.abs(t.amount);
                } else {
                    current.creditSum += Math.abs(t.amount);
                }

                categoryMap.set(trimmedVal, current);
            }
        });

        // Convert to array and sort by total amount (debit + credit) descending
        return Array.from(categoryMap.entries())
            .map(([category, { debitSum, creditSum }]) => ({ category, debitSum, creditSum }))
            .sort((a, b) => (b.debitSum + b.creditSum) - (a.debitSum + a.creditSum));
    }, [transactions, selectedMonth, selectedField]);

    // Calculate totals
    const totals = React.useMemo(() => {
        return categoryData.reduce((acc: { debitSum: number; creditSum: number }, item: CategoryData) => {
            acc.debitSum += item.debitSum;
            acc.creditSum += item.creditSum;
            return acc;
        }, { debitSum: 0, creditSum: 0 });
    }, [categoryData]);

    // Format month for display
    const formatMonthDisplay = (monthKey: string): string => {
        const [year, monthNum] = monthKey.split('-');
        const monthName = new Date(Date.UTC(parseInt(year), parseInt(monthNum) - 1)).toLocaleString('default', { month: 'short', timeZone: 'UTC' });
        return `${year}-${monthName}`;
    };

    // Get current field label
    const currentFieldLabel = FIELD_OPTIONS.find(f => f.key === selectedField)?.label || 'Category';

    return (
        <div className="glass-panel animated-border p-4 sm:p-6 rounded-xl shadow-lg">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
                <div>
                    <h3 className="text-2xl font-bold gradient-text drop-shadow-sm mb-1">Category Summary</h3>
                    <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                        Breakdown by {currentFieldLabel.toLowerCase()}
                    </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                        <label htmlFor="field-select" className="text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wide">
                            Group By
                        </label>
                        <select
                            id="field-select"
                            value={selectedField}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedField(e.target.value as FieldOption)}
                            className="bg-light-bg dark:bg-dark-bg border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all"
                        >
                            {FIELD_OPTIONS.map((option: FieldConfig) => (
                                <option key={option.key} value={option.key}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <label htmlFor="month-select" className="text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wide">
                            Month
                        </label>
                        <select
                            id="month-select"
                            value={selectedMonth}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedMonth(e.target.value)}
                            className="bg-light-bg dark:bg-dark-bg border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all"
                        >
                            {availableMonths.map((month: string) => (
                                <option key={month} value={month}>
                                    {formatMonthDisplay(month)}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
                    <div className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide mb-1">Total Expenses</div>
                    <div className="text-2xl font-bold text-red-700 dark:text-red-300">
                        {formatCurrency(totals.debitSum)}
                    </div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                    <div className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide mb-1">Total Income</div>
                    <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                        {formatCurrency(totals.creditSum)}
                    </div>
                </div>
                <div className="bg-gradient-to-br from-indigo-50 to-purple-100 dark:from-indigo-900/20 dark:to-purple-800/20 rounded-lg p-4 border border-indigo-200 dark:border-purple-800">
                    <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide mb-1">Net Amount</div>
                    <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
                        {formatCurrency(totals.creditSum - totals.debitSum)}
                    </div>
                </div>
            </div>

            {/* Category List */}
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {categoryData.length > 0 ? (
                    categoryData.map((item: CategoryData, index: number) => {
                        const hasDebit = item.debitSum > 0;
                        const hasCredit = item.creditSum > 0;
                        const netAmount = item.creditSum - item.debitSum;
                        const totalAmount = item.debitSum + item.creditSum;

                        return (
                            <div
                                key={item.category}
                                className="group relative bg-light-card dark:bg-dark-card rounded-lg p-4 border border-gray-200 dark:border-gray-700 hover:border-brand-primary dark:hover:border-brand-primary transition-all hover:shadow-md"
                            >
                                {/* Rank Badge */}
                                <div className="absolute -left-2 -top-2 w-8 h-8 rounded-full bg-gradient-to-br from-brand-primary to-purple-600 text-white flex items-center justify-center text-xs font-bold shadow-lg">
                                    {index + 1}
                                </div>

                                <div className="flex items-start justify-between gap-4">
                                    {/* Category Name */}
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-light-text dark:text-dark-text truncate mb-2">
                                            {item.category}
                                        </h4>

                                        {/* Amount Details */}
                                        <div className="flex flex-wrap gap-3 text-sm">
                                            {hasDebit && (
                                                <div className="flex items-center gap-1.5 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-md border border-red-200 dark:border-red-800">
                                                    <span className="text-red-600 dark:text-red-400 font-medium">Expenses</span>
                                                    <span className="text-red-700 dark:text-red-300 font-bold">
                                                        {formatCurrency(item.debitSum)}
                                                    </span>
                                                </div>
                                            )}
                                            {hasCredit && (
                                                <div className="flex items-center gap-1.5 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-md border border-green-200 dark:border-green-800">
                                                    <span className="text-green-600 dark:text-green-400 font-medium">Income</span>
                                                    <span className="text-green-700 dark:text-green-300 font-bold">
                                                        {formatCurrency(item.creditSum)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Net Amount (Large Display) */}
                                    <div className="text-right">
                                        <div className="text-xs text-light-text-secondary dark:text-dark-text-secondary mb-1">Net</div>
                                        <div className={`text-xl font-bold ${netAmount > 0
                                            ? 'text-green-600 dark:text-green-400'
                                            : netAmount < 0
                                                ? 'text-red-600 dark:text-red-400'
                                                : 'text-gray-600 dark:text-gray-400'
                                            }`}>
                                            {netAmount > 0 ? '+' : ''}{formatCurrency(netAmount)}
                                        </div>
                                    </div>
                                </div>

                                {/* Visual Indicator Bar */}
                                {(hasDebit || hasCredit) && totalAmount > 0 && (
                                    <div className="flex gap-1 mt-3 h-1.5 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                                        {hasDebit && (
                                            <div
                                                className="bg-gradient-to-r from-red-500 to-red-600 transition-all"
                                                style={{
                                                    width: `${(item.debitSum / totalAmount) * 100}%`
                                                }}
                                            />
                                        )}
                                        {hasCredit && (
                                            <div
                                                className="bg-gradient-to-r from-green-500 to-green-600 transition-all"
                                                style={{
                                                    width: `${(item.creditSum / totalAmount) * 100}%`
                                                }}
                                            />
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                ) : (
                    <div className="text-center py-16">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                            </svg>
                        </div>
                        <p className="text-light-text-secondary dark:text-dark-text-secondary text-lg">
                            No data for {formatMonthDisplay(selectedMonth)}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CategoryWiseMonthlyTable;
