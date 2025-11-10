import { Transaction } from '../../types';

export interface StagedTransactionInput extends Omit<Transaction, 'id' | 'user_id'> {}

/**
 * Create a stable hash key for a transaction based on immutable identifying fields.
 * Using a simple string join; for larger scale consider a real hash (SHA256).
 */
export function makeTransactionKey(t: StagedTransactionInput): string {
  const date = t.date.trim();
  const desc = t.description.trim().toLowerCase();
  const amt = t.amount.toFixed(2); // normalize floating representation
  return `${date}|${desc}|${amt}`;
}

/**
 * Filter out duplicates relative to an existing set of keys.
 */
export function filterDuplicateStaged(
  staged: StagedTransactionInput[],
  existingKeys: Set<string>
): { newOnes: StagedTransactionInput[]; duplicateCount: number } {
  const newOnes: StagedTransactionInput[] = [];
  let duplicateCount = 0;
  for (const t of staged) {
    const key = makeTransactionKey(t);
    if (existingKeys.has(key)) duplicateCount++; else newOnes.push(t);
  }
  return { newOnes, duplicateCount };
}
