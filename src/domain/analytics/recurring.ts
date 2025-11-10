import { Transaction } from '../../types';

export interface RecurringPattern {
  key: string; // normalized description key
  count: number;
  avgIntervalDays: number | null;
  lastDate: string;
}

/**
 * Very lightweight recurring detector based on normalized description token and date intervals.
 * Marks a pattern as recurring if count >= 3 and coefficient of variation of intervals < 0.5.
 */
export function detectRecurring(transactions: Transaction[]): { patterns: RecurringPattern[]; recurringIds: Set<number> } {
  // Group by normalized description
  const groups = new Map<string, Transaction[]>();
  for (const t of transactions) {
    const norm = normalizeDescription(t.description);
    if (!groups.has(norm)) groups.set(norm, []);
    groups.get(norm)!.push(t);
  }

  const patterns: RecurringPattern[] = [];
  const recurringIds = new Set<number>();

  for (const [key, list] of groups.entries()) {
    if (list.length < 3) continue; // need at least 3 points
    // Sort by date ascending
    list.sort((a, b) => a.date.localeCompare(b.date));
    const intervals: number[] = [];
    for (let i = 1; i < list.length; i++) {
      const prev = new Date(list[i - 1].date);
      const curr = new Date(list[i].date);
      const diff = (curr.getTime() - prev.getTime()) / 86400000; // days
      if (diff > 0) intervals.push(diff);
    }
    if (intervals.length === 0) continue;
    const avg = intervals.reduce((s, v) => s + v, 0) / intervals.length;
    const variance = intervals.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / intervals.length;
    const std = Math.sqrt(variance);
    const cov = avg > 0 ? std / avg : Infinity; // coefficient of variation

    if (cov < 0.5) { // reasonably regular
      patterns.push({
        key,
        count: list.length,
        avgIntervalDays: Math.round(avg * 10) / 10,
        lastDate: list[list.length - 1].date,
      });
      for (const tx of list) {
        if (tx.id != null) recurringIds.add(tx.id);
      }
    }
  }

  return { patterns, recurringIds };
}

function normalizeDescription(desc: string): string {
  return desc
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
