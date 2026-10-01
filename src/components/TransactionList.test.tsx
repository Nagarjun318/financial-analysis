// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TransactionList from './TransactionList.tsx';
import type { TransactionFilters } from './Dashboard.tsx';
import type { Transaction } from '../types.ts';

const baseFilters: TransactionFilters = {
  globalSearch: '',
  date: '',
  description: '',
  category: '',
  amount: '',
  type: 'all',
  monthYear: null,
  year: null,
  aiCategory: 'all',
};

const transactions: Transaction[] = [
  { id: 1, user_id: 'u1', date: '2026-09-01', description: 'Salary credit', amount: 50000, category: 'Salary', type: 'credit', ai_category: 'Income' },
  { id: 2, user_id: 'u1', date: '2026-09-02', description: 'Grocery store', amount: -2500, category: 'Groceries', type: 'debit', ai_category: null },
  { id: 3, user_id: 'u1', date: '2026-09-03', description: 'Electricity bill', amount: -1200, category: 'Utilities', type: 'debit', ai_category: null },
];

function renderList(overrides: Partial<Parameters<typeof TransactionList>[0]['filters']> = {}) {
  return render(
    <TransactionList
      transactions={transactions}
      filters={{ ...baseFilters, ...overrides }}
      anomalies={[]}
      onFilterChange={vi.fn()}
      onResetFilters={vi.fn()}
      onEdit={vi.fn()}
      onDelete={vi.fn(async () => {})}
      onRefreshData={vi.fn()}
    />
  );
}

describe('TransactionList', () => {
  it('renders one row per transaction with a total footer', () => {
    renderList();
    expect(screen.getByText('Grocery store')).toBeInTheDocument();
    expect(screen.getByText('Electricity bill')).toBeInTheDocument();
    expect(screen.getByText('Salary credit')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText(/Rows: 3/)).toBeInTheDocument();
  });

  it('sorts by amount when the Amount header is clicked', async () => {
    const user = userEvent.setup();
    renderList();
    const amountHeader = screen.getByText('Amount');
    await user.click(amountHeader); // ascending: most negative first
    const rows = screen.getAllByRole('row');
    const bodyText = rows.map((r) => within(r).queryByText('Grocery store') && 'grocery');
    // First data row (after header) should be the smallest amount.
    expect(within(rows[1]).getByText('Grocery store')).toBeInTheDocument();
    expect(bodyText).toContain('grocery');
  });

  it('delete button calls onDelete with the transaction id', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn(async () => {});
    render(
      <TransactionList
        transactions={transactions}
        filters={baseFilters}
        anomalies={[]}
        onFilterChange={vi.fn()}
        onResetFilters={vi.fn()}
        onEdit={vi.fn()}
        onDelete={onDelete}
        onRefreshData={vi.fn()}
      />
    );
    const deleteButtons = screen.getAllByRole('button', { name: /delete transaction/i });
    await user.click(deleteButtons[0]);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
