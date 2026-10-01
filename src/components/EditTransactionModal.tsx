import React from 'react';
import { Transaction } from '../types.ts';
import { Modal, Button } from './ui';

interface EditTransactionModalProps {
  isOpen: boolean;
  transaction: Transaction;
  onClose: () => void;
  onConfirm: (updatedTransaction: Transaction) => Promise<void>;
}

const EditTransactionModal: React.FC<EditTransactionModalProps> = ({ isOpen, transaction, onClose, onConfirm }) => {
  const [formData, setFormData] = React.useState({ ...transaction });
  const [isConfirming, setIsConfirming] = React.useState(false);

  React.useEffect(() => {
    setFormData(transaction);
  }, [transaction]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const amount = parseFloat(e.target.value);
    setFormData((prev: any) => ({
      ...prev,
      amount: isNaN(amount) ? 0 : amount,
      type: amount > 0 ? 'credit' : 'debit'
    }));
  };

  const handleConfirmClick = async () => {
    setIsConfirming(true);
    await onConfirm(formData);
    setIsConfirming(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Transaction"
      footer={
        <>
          <Button variant="secondary" disabled={isConfirming} onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={isConfirming}
            disabled={isConfirming}
            onClick={handleConfirmClick}
            className="w-36"
          >
            {isConfirming ? 'Saving...' : 'Save Changes'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">Date</label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 bg-light-bg dark:bg-dark-bg border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary"
            />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">Description</label>
            <textarea
              id="description"
              name="description"
              rows={3}
              value={formData.description}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 bg-light-bg dark:bg-dark-bg border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary"
            />
          </div>
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">Category</label>
            <input
              type="text"
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 bg-light-bg dark:bg-dark-bg border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary"
            />
          </div>
          <div>
            <label htmlFor="ai_category" className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">AI Category</label>
            <input
              type="text"
              id="ai_category"
              name="ai_category"
              value={formData.ai_category || ''}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 bg-light-bg dark:bg-dark-bg border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary"
              placeholder="Auto-generated category"
            />
          </div>
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">Amount</label>
            <input
              type="number"
              id="amount"
              name="amount"
              value={formData.amount}
              onChange={handleAmountChange}
              className="mt-1 block w-full px-3 py-2 bg-light-bg dark:bg-dark-bg border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary"
              placeholder="Use negative for debit, positive for credit"
            />
          </div>
          {/* Budget field removed; budgeting now handled via category budgets table */}
      </div>
    </Modal>
  );
};

export default EditTransactionModal;