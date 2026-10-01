// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InvestmentFormModal, { emptyInvestmentForm, type InvestmentFormData } from './InvestmentFormModal.tsx';

describe('InvestmentFormModal', () => {
  it('renders nothing when closed', () => {
    render(
      <InvestmentFormModal
        isOpen={false}
        editingId={null}
        initial={emptyInvestmentForm()}
        existingInvestments={[]}
        onSubmit={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('submits the draft for a new investment', async () => {
    const user = userEvent.setup();
    let submitted: InvestmentFormData | undefined;
    const onSubmit = vi.fn(async (data: InvestmentFormData) => {
      submitted = data;
    });
    render(
      <InvestmentFormModal
        isOpen
        editingId={null}
        initial={emptyInvestmentForm()}
        existingInvestments={[]}
        onSubmit={onSubmit}
        onClose={vi.fn()}
      />
    );
    await user.type(screen.getByPlaceholderText(/apple stock/i), 'Test Stock');
    await user.type(screen.getByLabelText(/invested amount/i), '1000');
    await user.type(screen.getByLabelText(/current value/i), '1200');
    await user.click(screen.getByRole('button', { name: /add asset/i }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(submitted).toMatchObject({
      name: 'Test Stock',
      investedAmount: 1000,
      currentValue: 1200,
    });
  });

  it('prefills initial data when editing', () => {
    render(
      <InvestmentFormModal
        isOpen
        editingId="abc"
        initial={{ ...emptyInvestmentForm(), name: 'Existing Fund', investedAmount: 500 }}
        existingInvestments={[]}
        onSubmit={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByDisplayValue('Existing Fund')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /update asset/i })).toBeInTheDocument();
  });

  it('cancel calls onClose without submitting', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const onClose = vi.fn();
    render(
      <InvestmentFormModal
        isOpen
        editingId={null}
        initial={emptyInvestmentForm()}
        existingInvestments={[]}
        onSubmit={onSubmit}
        onClose={onClose}
      />
    );
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
