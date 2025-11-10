import { describe, it, expect } from 'vitest';
import { buildAnalytics, summarize, aggregateMonthly, aggregateCategories } from './summarize';
import { Transaction } from '../../types';

const sample: Transaction[] = [
  { date: '2025-01-05', description: 'Salary January', amount: 100000, type: 'credit', category: 'SALARY' },
  { date: '2025-01-10', description: 'Groceries', amount: -3500, type: 'debit', category: 'GROCERY SHOPPING' },
  { date: '2025-02-02', description: 'Salary Feb', amount: 100000, type: 'credit', category: 'SALARY' },
  { date: '2025-02-11', description: 'Restaurant', amount: -4200, type: 'debit', category: 'FOOD' },
  { date: '2025-02-15', description: 'Combined Expense', amount: -1000, type: 'debit', category: 'FOOD-GROCERY SHOPPING' },
];

describe('analytics summarization', () => {
  it('summarize totals correctly', () => {
    const summary = summarize(sample);
    expect(summary.totalIncome).toBe(200000);
    expect(summary.totalExpenses).toBe(3500 + 4200 + 1000);
    expect(summary.netSavings).toBe(summary.totalIncome - summary.totalExpenses);
  });

  it('monthly aggregation produces correct months', () => {
    const monthly = aggregateMonthly(sample);
    expect(monthly.length).toBe(2);
    const jan = monthly.find(m => m.monthKey === '2025-01');
    expect(jan?.income).toBe(100000);
    expect(jan?.expense).toBe(3500);
  });

  it('category aggregation splits hyphenated categories', () => {
    const cats = aggregateCategories(sample);
    const food = cats.find(c => c.category === 'FOOD');
    const grocery = cats.find(c => c.category === 'GROCERY SHOPPING');
    expect(food).toBeTruthy();
    expect(grocery).toBeTruthy();
    // Combined expense should contribute 1000 to both FOOD and GROCERY SHOPPING
    expect(food!.expense).toBe(4200 + 1000);
    expect(grocery!.expense).toBe(3500 + 1000);
  });

  it('buildAnalytics returns cohesive structure', () => {
    const full = buildAnalytics(sample);
    expect(full.summary.totalIncome).toBeGreaterThan(0);
    expect(full.monthly.length).toBe(2);
    expect(full.categories.length).toBeGreaterThan(0);
  });
});
