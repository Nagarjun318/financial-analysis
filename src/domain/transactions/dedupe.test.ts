import { describe, it, expect } from 'vitest';
import { makeTransactionKey, filterDuplicateStaged } from './dedupe';

const base = {
  date: '2025-03-01',
  description: 'Test Item',
  amount: 123.456,
  category: 'OTHER',
  type: 'debit' as const,
};

describe('dedupe utilities', () => {
  it('generates stable keys', () => {
    const k1 = makeTransactionKey(base);
    const k2 = makeTransactionKey({ ...base });
    expect(k1).toBe(k2);
  });

  it('filters duplicates correctly', () => {
    const existing = new Set<string>([makeTransactionKey(base)]);
    const staged = [base, { ...base, amount: 50 }];
    const { newOnes, duplicateCount } = filterDuplicateStaged(staged, existing);
    expect(duplicateCount).toBe(1);
    expect(newOnes.length).toBe(1);
    expect(newOnes[0].amount).toBe(50);
  });
});
