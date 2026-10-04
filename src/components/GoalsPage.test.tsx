// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { averageMonthlyFlow } from './GoalsPage.tsx';
import type { Transaction } from '../types.ts';

function tx(date: string, amount: number, type: 'debit' | 'credit', category = 'Misc'): Transaction {
  return { id: Math.random(), date, description: `${category} tx`, amount, type, category };
}

describe('averageMonthlyFlow', () => {
  it('averages salary credits across recent months', () => {
    const transactions = [
      tx('2026-08-01', 150000, 'credit', 'Salary'),
      tx('2026-08-05', -40000, 'debit', 'Rent'),
      tx('2026-09-01', 150000, 'credit', 'Salary'),
      tx('2026-09-05', -50000, 'debit', 'Rent'),
      tx('2026-10-01', 150000, 'credit', 'Salary'),
      tx('2026-10-05', -60000, 'debit', 'Rent'),
    ];
    const { avgIncome, avgExpenses } = averageMonthlyFlow(transactions, 3, '2026-11');
    expect(avgIncome).toBe(150000);
    expect(avgExpenses).toBe(50000);
  });

  it('uses only the N most recent months', () => {
    const transactions = [
      tx('2026-07-01', 50000, 'credit', 'Salary'),
      tx('2026-08-01', 150000, 'credit', 'Salary'),
      tx('2026-09-01', 150000, 'credit', 'Salary'),
    ];
    const { avgIncome } = averageMonthlyFlow(transactions, 2, '2026-11');
    expect(avgIncome).toBe(150000);
  });

  it('returns zeros with no transactions', () => {
    expect(averageMonthlyFlow([], 3)).toEqual({ avgIncome: 0, avgExpenses: 0 });
  });

  it('excludes the in-progress month from the average', () => {
    const transactions = [
      tx('2026-08-01', 156297, 'credit', 'Salary'),
      tx('2026-09-29', 147701, 'credit', 'Salary'),
      tx('2026-10-01', 428, 'credit', 'Refund'),
    ];
    const { avgIncome } = averageMonthlyFlow(transactions, 3, '2026-10');
    expect(avgIncome).toBe((156297 + 147701) / 2);
  });

  it('falls back to the current month when it holds all the data', () => {
    const transactions = [tx('2026-10-01', 428, 'credit', 'Refund')];
    expect(averageMonthlyFlow(transactions, 3, '2026-10')).toEqual({
      avgIncome: 428,
      avgExpenses: 0,
    });
  });
});
