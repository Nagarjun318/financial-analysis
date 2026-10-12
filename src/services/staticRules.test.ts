import { describe, it, expect } from 'vitest';
import { applyStaticCategoryRules } from './geminiService';
import { getCategory } from '../utils';

describe('Sundaram Finance car loan rules', () => {
  it('maps the SUNDARAMFINLTD mandate to Car Loan (static AI rule)', () => {
    expect(applyStaticCategoryRules('ACH D- SUNDARAMFINLTD 123456')).toBe('Car Loan');
  });

  it('maps the SUNDARAM FINANCE spelling to Car Loan (static AI rule)', () => {
    expect(applyStaticCategoryRules('ACH D- SUNDARAM FINANCE LTD 123456')).toBe('Car Loan');
    expect(applyStaticCategoryRules('UPI-SUNDARAM FINANCE LTD-PAYMENT')).toBe('Car Loan');
    expect(applyStaticCategoryRules('ach d- sundaram finance ltd emi')).toBe('Car Loan');
  });

  it('maps both spellings to CAR LOAN via the categorization map', () => {
    expect(getCategory('ACH D- SUNDARAMFINLTD 123456')).toBe('CAR LOAN');
    expect(getCategory('ACH D- SUNDARAM FINANCE LTD 123456')).toBe('CAR LOAN');
  });

  it('keeps a clean CAR LOAN category for UPI/NEFT-wrapped descriptions', () => {
    // Without priority handling these multi-match and join into
    // 'CAR LOAN-UPI' / 'BANK TRANSFER-CAR LOAN'.
    expect(getCategory('UPI-SUNDARAM FINANCE LTD-EMI PAYMENT')).toBe('CAR LOAN');
    expect(getCategory('NEFT DR-SUNDARAM FINANCE-Car Loan EMI')).toBe('CAR LOAN');
    expect(getCategory('ACH D- SUNDARAMFINLTD-12345678')).toBe('CAR LOAN');
  });
});
