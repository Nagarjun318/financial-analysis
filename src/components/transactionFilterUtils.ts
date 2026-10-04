import type { TransactionFilters } from './Dashboard.tsx';

/**
 * Whether the user has narrowed the transactions table with a filter/search.
 * Mirrors the `isFiltered` baseline used by the table: the auto-applied
 * current year from the summary does not count as a user filter.
 */
export function isTransactionFilterActive(filters: TransactionFilters | undefined | null): boolean {
  if (!filters) return false;
  const currentYear = new Date().getFullYear().toString();
  return !!(
    (filters.globalSearch && filters.globalSearch.trim() !== '') ||
    (filters.date && filters.date.trim() !== '') ||
    (filters.description && filters.description.trim() !== '') ||
    (filters.category && filters.category.trim() !== '') ||
    (filters.amount && filters.amount.trim() !== '') ||
    (filters.type && filters.type !== 'all') ||
    (filters.monthYear && filters.monthYear.trim() !== '') ||
    (filters.year && filters.year !== currentYear) ||
    (filters.aiCategory && filters.aiCategory !== 'all')
  );
}
