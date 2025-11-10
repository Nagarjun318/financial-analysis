import { describe, it, expect } from 'vitest';
import { parseDate, formatDate } from './utils';

describe('parseDate', () => {
  it('parses YYYY-MM-DD', () => {
    const d = parseDate('2025-11-08');
    expect(d).not.toBeNull();
    if (d) expect(formatDate(d)).toBe('2025-11-08');
  });

  it('parses dd/mm/yyyy', () => {
    const d = parseDate('08/11/2025');
    expect(d).not.toBeNull();
    if (d) expect(formatDate(d)).toBe('2025-11-08');
  });

  it('parses dd-Mon-yy', () => {
    const d = parseDate('08-Nov-25');
    expect(d).not.toBeNull();
    if (d) expect(formatDate(d)).toBe('2025-11-08');
  });

  it('returns null on invalid', () => {
    const d = parseDate('invalid-date');
    expect(d).toBeNull();
  });
});
