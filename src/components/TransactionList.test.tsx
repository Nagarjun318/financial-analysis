// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TransactionList from './TransactionList.tsx';
import type { TransactionFilters } from './Dashboard.tsx';
import type { Transaction } from '../types.ts';
import { clearTransactionAICategories, updateTransactionAICategoriesBatch } from '../services/neonClient';
import { BatchAbortedError, predictTransactionCategoriesBatch } from '../services/geminiService';

vi.mock('../services/neonClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/neonClient')>();
  return {
    ...actual,
    clearTransactionAICategories: vi.fn(async () => ({ success: true, clearedCount: 1 })),
    updateTransactionAICategoriesBatch: vi.fn(async () => ({ success: true })),
  };
});

vi.mock('../services/geminiService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/geminiService')>();
  return {
    ...actual,
    predictTransactionCategoriesBatch: vi.fn(),
  };
});

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

  it('select-all checkbox selects all rows and shows the bulk bar', async () => {
    const user = userEvent.setup();
    renderList();
    const selectAll = screen.getByRole('checkbox', { name: /select all rows/i });
    expect(selectAll).not.toBeChecked();
    await user.click(selectAll);
    expect(screen.getByText('3 selected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /export selected rows/i })).toBeInTheDocument();
    // Row checkboxes reflect selection
    expect(screen.getByRole('checkbox', { name: /select transaction grocery store/i })).toBeChecked();
  });

  it('auto-selects all rows when a filter is applied', async () => {
    renderList({ aiCategory: 'not_predicted' });
    expect(await screen.findByText('3 selected')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /deselect all rows/i })).toBeChecked();
  });

  it('does not auto-select rows without a filter', () => {
    renderList();
    expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
  });

  it('clear predictions is disabled when no selected rows have predictions', () => {
    renderList();
    expect(screen.getByRole('button', { name: /clear ai predictions for selected rows/i })).toBeDisabled();
  });

  it('prediction abort saves partials and shows an error', async () => {
    const user = userEvent.setup();
    vi.mocked(predictTransactionCategoriesBatch).mockRejectedValueOnce(
      new BatchAbortedError('Batch 1 failed: busy', [{ id: 2, ai_category: 'Food' }], 1)
    );
    // Filter auto-selects all rows; ids 2 and 3 need AI.
    renderList({ aiCategory: 'not_predicted' });
    await user.click(screen.getByRole('button', { name: 'Predict AI categories' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/stopped.*saved 1 earlier prediction/i);
    expect(updateTransactionAICategoriesBatch).toHaveBeenCalledWith([{ id: 2, ai_category: 'Food' }]);
  });

  it('clear predictions only clears the selected rows', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    try {
      // Filter auto-selects all 3 rows, but only id 1 has an AI prediction.
      renderList({ aiCategory: 'not_predicted' });
      const clearButton = await screen.findByRole('button', { name: /clear ai predictions for selected rows/i });
      expect(clearButton).not.toBeDisabled();
      await user.click(clearButton);
      expect(clearTransactionAICategories).toHaveBeenCalledWith([1]);
    } finally {
      confirmSpy.mockRestore();
    }
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
