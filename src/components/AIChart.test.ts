import { describe, it, expect } from 'vitest';
import { prepareAIChartData } from './AIChart';
import type { Transaction } from '../types';

function tx(overrides: Partial<Transaction> & Pick<Transaction, 'description' | 'amount' | 'date'>): Transaction {
  return { type: 'debit', category: 'Others', ...overrides };
}

describe('prepareAIChartData', () => {
  it('groups bar data by AI category when groupBy is ai_category', () => {
    const transactions = [
      tx({ description: 'SWIGGY order', amount: -450, date: '2026-09-05', category: 'Food', ai_category: 'Food' }),
      tx({ description: 'ZOMATO dinner', amount: -800, date: '2026-09-06', category: 'Food', ai_category: 'Food' }),
      tx({ description: 'ZUDIO shirt', amount: -1200, date: '2026-09-07', category: 'Shopping', ai_category: 'Shopping' }),
      // No AI prediction → falls back to the plain category.
      tx({ description: 'mystery xyz', amount: -100, date: '2026-09-08', category: 'Travel', ai_category: null }),
    ];
    const data = prepareAIChartData(transactions, 'bar', 'ai_category');
    expect(data).toEqual([
      { name: 'Food', value: 1250, count: 2 },
      { name: 'Shopping', value: 1200, count: 1 },
      { name: 'Travel', value: 100, count: 1 },
    ]);
  });

  it('keeps per-transaction bars when groupBy is null (top-N rankings)', () => {
    const transactions = [
      tx({ description: 'BIG PURCHASE AT STORE NUMBER ONE EXTRA LONG NAME HERE', amount: -5000, date: '2026-09-05', category: 'Shopping' }),
      tx({ description: 'chai', amount: -50, date: '2026-09-06', category: 'Food' }),
    ];
    const data = prepareAIChartData(transactions, 'bar', null);
    expect(data).toHaveLength(2);
    expect(data[0]).toMatchObject({ value: 5000, count: 1 });
    expect(data[0].name.length).toBeLessThanOrEqual(33); // truncated label
    expect(data[0].fullName).toBe('BIG PURCHASE AT STORE NUMBER ONE EXTRA LONG NAME HERE');
    expect(data[1]).toMatchObject({ name: 'chai', value: 50, count: 1 });
  });

  it('groups bar data by plain category when groupBy is category', () => {
    const transactions = [
      tx({ description: 'a', amount: -100, date: '2026-09-01', category: 'Food', ai_category: 'Shopping' }),
      tx({ description: 'b', amount: -200, date: '2026-09-02', category: 'Food', ai_category: 'Food' }),
    ];
    const data = prepareAIChartData(transactions, 'bar', 'category');
    expect(data).toEqual([{ name: 'Food', value: 300, count: 2 }]);
  });

  it('groups bar data by month when groupBy is month', () => {
    const transactions = [
      tx({ description: 'b', amount: -200, date: '2026-10-02', category: 'Food' }),
      tx({ description: 'a', amount: -100, date: '2026-09-01', category: 'Food' }),
    ];
    const data = prepareAIChartData(transactions, 'bar', 'month');
    expect(data).toEqual([
      { name: '2026-09', value: 100, count: 1 },
      { name: '2026-10', value: 200, count: 1 },
    ]);
  });

  it('pie defaults to AI-category grouping capped at 10 slices', () => {
    const transactions = Array.from({ length: 12 }, (_, i) =>
      tx({ description: `item ${i}`, amount: -(i + 1) * 10, date: '2026-09-01', category: `Cat${i}`, ai_category: `Cat${i}` })
    );
    const data = prepareAIChartData(transactions, 'pie', null);
    expect(data).toHaveLength(10);
    expect(data[0]).toEqual({ name: 'Cat11', value: 120, count: 1 });
  });

  it('line defaults to month grouping in chronological order', () => {
    const transactions = [
      tx({ description: 'b', amount: -200, date: '2026-10-02', category: 'Food' }),
      tx({ description: 'a', amount: -100, date: '2026-09-01', category: 'Food' }),
    ];
    expect(prepareAIChartData(transactions, 'line', null)).toEqual([
      { name: '2026-09', value: 100, count: 1 },
      { name: '2026-10', value: 200, count: 1 },
    ]);
  });

  it('returns no rows for empty transactions', () => {
    expect(prepareAIChartData([], 'bar', 'ai_category')).toEqual([]);
  });
});
