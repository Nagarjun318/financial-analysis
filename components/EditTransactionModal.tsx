import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Transaction } from '../types.ts';

interface EditTransactionModalProps {
  isOpen: boolean;
  transaction: Transaction;
  onClose: () => void;
  onConfirm: (updatedTransaction: Transaction) => Promise<void>;
}

const EditTransactionModal: React.FC<EditTransactionModalProps> = ({ isOpen, transaction, onClose, onConfirm }) => {
  const [formData, setFormData] = useState(transaction);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    setFormData(transaction);
  }, [transaction]);

  if (!isOpen) {
    return null;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const amount = parseFloat(e.target.value);
    setFormData(prev => ({
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
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-light-card dark:bg-dark-card rounded-xl shadow-xl w-full max-w-lg flex flex-col">
        <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-light-text dark:text-dark-text">Edit Transaction</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close modal"
          >
            <X className="h-6 w-6" />
          </button>
        </header>
        
        <main className="p-6 space-y-4">
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
        </main>

        <footer className="flex justify-end gap-4 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-dark-bg rounded-b-xl">
          <button
            onClick={onClose}
            disabled={isConfirming}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-light-text dark:text-dark-text rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors disabled:opacity-70"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmClick}
            disabled={isConfirming}
            className="flex items-center justify-center gap-2 w-36 px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 transition-colors disabled:opacity-70"
          >
            {isConfirming ? <Loader2 className="h-5 w-5 animate-spin"/> : 'Save Changes'}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default EditTransactionModal;