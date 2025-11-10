import { Transaction, Summary } from '../../types';
import { detectRecurring } from './recurring';

export interface CategorySummary {
  category: string;
  expense: number; // positive number (absolute of debits)
  income: number;  // positive number (credits)
}

export interface MonthlyAggregate {
  monthKey: string; // YYYY-MM
  income: number;
  expense: number; // positive
  savings: number; // income - expense
}

export interface FullAnalyticsResult {
  summary: Summary;
  monthly: MonthlyAggregate[];
  categories: CategorySummary[];
  recurring: { patterns: ReturnType<typeof detectRecurring>['patterns']; count: number };
}

/**
 * Compute overall summary (income, expenses, net savings)
 */
export function summarize(transactions: Transaction[]): Summary {
  let totalIncome = 0;
  let totalExpenses = 0; // stored as positive

  for (const t of transactions) {
    if (t.type === 'credit') totalIncome += t.amount;
    else totalExpenses += Math.abs(t.amount);
  }

  return {
    totalIncome,
    totalExpenses,
    netSavings: totalIncome - totalExpenses,
  };
}

/**
 * Aggregate by month (YYYY-MM)
 */
export function aggregateMonthly(transactions: Transaction[]): MonthlyAggregate[] {
  const map = new Map<string, MonthlyAggregate>();
  for (const t of transactions) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(t.date)) continue; // skip invalid
    const key = t.date.substring(0, 7);
    let entry = map.get(key);
    if (!entry) {
      entry = { monthKey: key, income: 0, expense: 0, savings: 0 };
      map.set(key, entry);
    }
    if (t.type === 'credit') entry.income += t.amount; else entry.expense += Math.abs(t.amount);
  }
  const arr = Array.from(map.values())
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  for (const e of arr) e.savings = e.income - e.expense;
  return arr;
}

/**
 * Aggregate by category (split hyphen-combined categories into individual ones but also keep original string count)
 * Strategy: treat multi-category strings like FOOD-GROCERY as contributing fully to each subcategory.
 */
export function aggregateCategories(transactions: Transaction[]): CategorySummary[] {
  const catMap = new Map<string, CategorySummary>();
  for (const t of transactions) {
    const raw = t.category || 'Other';
    const categories = raw.split('-').filter(Boolean);
    if (categories.length === 0) categories.push('Other');
    for (const c of categories) {
      let entry = catMap.get(c);
      if (!entry) { entry = { category: c, expense: 0, income: 0 }; catMap.set(c, entry); }
      if (t.type === 'credit') entry.income += t.amount; else entry.expense += Math.abs(t.amount);
    }
  }
  return Array.from(catMap.values()).sort((a, b) => b.expense - a.expense);
}

/**
 * Build complete analytics result (can be expanded later with anomalies, forecasts, etc.)
 */
export function buildAnalytics(transactions: Transaction[]): FullAnalyticsResult {
  const { patterns, recurringIds } = detectRecurring(transactions);
  // annotate transactions (mutate safe if we assume caller created array)
  for (const t of transactions) {
    if (t.id != null && recurringIds.has(t.id)) t.recurring = true;
  }
  return {
    summary: summarize(transactions),
    monthly: aggregateMonthly(transactions),
    categories: aggregateCategories(transactions),
    recurring: { patterns, count: patterns.length },
  };
}
