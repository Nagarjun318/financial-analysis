import { describe, it, expect } from 'vitest';
import { buildTransactionPageRange } from './useTransactions';

describe('buildTransactionPageRange', () => {
  it('builds an inclusive PostgREST range for page 0', () => {
    expect(buildTransactionPageRange(0, 100)).toEqual({ from: 0, to: 99 });
  });

  it('offsets later pages', () => {
    expect(buildTransactionPageRange(2, 50)).toEqual({ from: 100, to: 149 });
  });

  it('clamps negative pages and fractional input', () => {
    expect(buildTransactionPageRange(-3, 25)).toEqual({ from: 0, to: 24 });
    expect(buildTransactionPageRange(1.7, 10.9)).toEqual({ from: 10, to: 19 });
  });
});
