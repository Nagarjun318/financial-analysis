import React, { useState, useEffect, useRef } from 'react';
import { Settings, Sparkles } from 'lucide-react';
import { Modal, Button } from './ui';
import type { Investment } from '../hooks/useInvestments.ts';
import { suggestInvestmentDetails, GEMINI_MODELS, DEFAULT_GEMINI_MODEL, type GeminiModel } from '../services/geminiService';
import { extractSymbol } from '../services/marketDataService';

export const INVESTMENT_TYPES = ['Stock', 'Mutual Fund', 'Crypto', 'Gold', 'Real Estate', 'Bond', 'ETF', 'Other'];

export type InvestmentFormData = Omit<Investment, 'id'>;

export function emptyInvestmentForm(): InvestmentFormData {
  return {
    name: '',
    type: 'Stock',
    investedAmount: 0,
    currentValue: 0,
    date: new Date().toISOString().split('T')[0],
    notes: '',
    quantity: undefined,
    symbol: undefined,
  };
}

export function getModelDisplayName(model: GeminiModel): string {
  switch (model) {
    case GEMINI_MODELS.PRO_LATEST: return 'Pro';
    case GEMINI_MODELS.FLASH_LATEST: return 'Flash';
    case GEMINI_MODELS.FLASH_2_0: return 'Flash 2.0';
    case GEMINI_MODELS.FLASH_LITE: return 'Flash Lite';
    case GEMINI_MODELS.FLASH_3_5_LITE: return '3.5 Flash-Lite';
    case GEMINI_MODELS.GEMMA_3: return 'Gemma 3';
    default: return 'Flash Lite';
  }
}

interface InvestmentFormModalProps {
  isOpen: boolean;
  editingId: string | null;
  initial: InvestmentFormData;
  existingInvestments: Investment[];
  onSubmit: (data: InvestmentFormData) => Promise<void>;
  onClose: () => void;
}

/**
 * Add/edit investment form (extracted from InvestmentPage). Owns the draft
 * state, the debounced AI detail suggestions, and the suggest-model picker.
 */
const InvestmentFormModal: React.FC<InvestmentFormModalProps> = ({
  isOpen,
  editingId,
  initial,
  existingInvestments,
  onSubmit,
  onClose,
}) => {
  const [formData, setFormData] = useState<InvestmentFormData>(initial);
  const [isSuggestingDetails, setIsSuggestingDetails] = useState(false);
  const [selectedModel, setSelectedModel] = useState<GeminiModel>(DEFAULT_GEMINI_MODEL);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const modelSelectorRef = useRef<HTMLDivElement>(null);

  // Reset the draft every time the modal opens.
  useEffect(() => {
    if (isOpen) {
      setFormData(initial);
      setIsSaving(false);
    }
  }, [isOpen, initial, editingId]);

  // Click outside to close model selector
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelSelectorRef.current && !modelSelectorRef.current.contains(event.target as Node)) {
        setShowModelSelector(false);
      }
    };

    if (showModelSelector) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showModelSelector]);

  // AI Investment Details Suggestion with debounce
  useEffect(() => {
    const suggestDetails = async () => {
      // Only suggest for new investments, not when editing
      if (editingId || !formData.name || formData.name.trim().length < 3) {
        return;
      }

      setIsSuggestingDetails(true);
      try {
        const suggested = await suggestInvestmentDetails(
          formData.name,
          existingInvestments.map((inv: Investment) => ({
            name: inv.name,
            type: inv.type,
            investedAmount: inv.investedAmount,
            currentValue: inv.currentValue
          })),
          selectedModel
        );

        // Update form fields with AI suggestions
        const detectedSymbol = extractSymbol(formData.name, suggested.type);
        setFormData((prev: InvestmentFormData) => ({
          ...prev,
          type: suggested.type,
          investedAmount: suggested.investedAmount > 0 ? suggested.investedAmount : prev.investedAmount,
          currentValue: suggested.currentValue > 0 ? suggested.currentValue : prev.currentValue,
          notes: suggested.notes || prev.notes,
          symbol: detectedSymbol || prev.symbol
        }));
      } catch (error) {
        console.error('Investment details suggestion error:', error);
      } finally {
        setIsSuggestingDetails(false);
      }
    };

    // Debounce the API call
    const timeoutId = setTimeout(suggestDetails, 800);
    return () => clearTimeout(timeoutId);
  }, [formData.name, editingId, existingInvestments, selectedModel]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev: InvestmentFormData) => ({
      ...prev,
      [name]: name === 'investedAmount' || name === 'currentValue' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSubmit(formData);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingId ? 'Edit Investment' : 'New Investment'}
      maxWidth="md"
      headerAction={
        !editingId ? (
          <div className="relative" ref={modelSelectorRef}>
            <button
              type="button"
              onClick={() => setShowModelSelector(!showModelSelector)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title={`AI Model: ${getModelDisplayName(selectedModel)}`}
              aria-label="Select AI model"
            >
              <Settings className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>

            {showModelSelector && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-50">
                {Object.values(GEMINI_MODELS).map((model) => (
                  <button
                    key={model}
                    type="button"
                    onClick={() => {
                      setSelectedModel(model);
                      setShowModelSelector(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                      selectedModel === model
                        ? 'text-brand-primary font-medium bg-brand-primary/5'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {getModelDisplayName(model)}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : undefined
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="inv-name" className="block text-sm font-medium mb-1 flex items-center gap-2">
            Asset Name
            {isSuggestingDetails && (
              <span className="flex items-center gap-1 text-brand-primary animate-pulse">
                <Sparkles className="h-3 w-3" />
                <span className="text-[10px] font-normal">AI suggesting...</span>
              </span>
            )}
          </label>
          <input
            id="inv-name"
            type="text"
            name="name"
            required
            value={formData.name}
            onChange={handleInputChange}
            className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-brand-primary outline-none transition-all"
            placeholder="e.g. Apple Stock, Bitcoin, HDFC Top 100 Fund"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            AI will auto-fill investment details based on asset name
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="inv-type" className="block text-sm font-medium mb-1 flex items-center gap-2">
              Type
              {isSuggestingDetails && <Sparkles className="h-3 w-3 text-brand-primary animate-pulse" />}
            </label>
            <select
              id="inv-type"
              name="type"
              value={formData.type}
              onChange={handleInputChange}
              className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-brand-primary outline-none transition-all"
            >
              {INVESTMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="inv-date" className="block text-sm font-medium mb-1">Date</label>
            <input
              id="inv-date"
              type="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-brand-primary outline-none transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="inv-invested" className="block text-sm font-medium mb-1 flex items-center gap-2">
              Invested Amount
              {isSuggestingDetails && <Sparkles className="h-3 w-3 text-brand-primary animate-pulse" />}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">₹</span>
              <input
                id="inv-invested"
                type="number"
                name="investedAmount"
                required
                min="0"
                step="0.01"
                value={formData.investedAmount}
                onChange={handleInputChange}
                className="w-full pl-8 pr-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-brand-primary outline-none transition-all"
              />
            </div>
          </div>
          <div>
            <label htmlFor="inv-current" className="block text-sm font-medium mb-1 flex items-center gap-2">
              Current Value
              {isSuggestingDetails && <Sparkles className="h-3 w-3 text-brand-primary animate-pulse" />}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">₹</span>
              <input
                id="inv-current"
                type="number"
                name="currentValue"
                required
                min="0"
                step="0.01"
                value={formData.currentValue}
                onChange={handleInputChange}
                className="w-full pl-8 pr-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-brand-primary outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* Quantity and Symbol fields for real-time tracking */}
        {(formData.type === 'Crypto' || formData.type === 'Gold' ||
          formData.type === 'Stock' || formData.type === 'ETF' ||
          formData.type === 'Mutual Fund') && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="inv-quantity" className="block text-sm font-medium mb-1 flex items-center gap-2">
                Quantity
                <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">Optional</span>
              </label>
              <input
                id="inv-quantity"
                type="number"
                name="quantity"
                min="0"
                step="0.00000001"
                value={formData.quantity || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-brand-primary outline-none transition-all"
                placeholder="e.g., 0.5, 10"
              />
            </div>
            <div>
              <label htmlFor="inv-symbol" className="block text-sm font-medium mb-1 flex items-center gap-2">
                Symbol
                <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">Optional</span>
                {isSuggestingDetails && <Sparkles className="h-3 w-3 text-brand-primary animate-pulse" />}
              </label>
              <input
                id="inv-symbol"
                type="text"
                name="symbol"
                value={formData.symbol || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-brand-primary outline-none transition-all"
                placeholder="e.g., BTCUSD, AAPL"
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 col-span-2 -mt-2">
              Enter quantity and symbol to enable automatic price updates
            </p>
          </div>
        )}

        <div>
          <label htmlFor="inv-notes" className="block text-sm font-medium mb-1 flex items-center gap-2">
            Notes (Optional)
            {isSuggestingDetails && <Sparkles className="h-3 w-3 text-brand-primary animate-pulse" />}
          </label>
          <textarea
            id="inv-notes"
            name="notes"
            rows={3}
            value={formData.notes}
            onChange={handleInputChange}
            className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-brand-primary outline-none transition-all"
            placeholder="Strategy, goals, etc."
          />
        </div>

        <div className="pt-4 flex gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="flex-1"
            loading={isSaving}
            disabled={isSaving}
          >
            {editingId ? 'Update Asset' : 'Add Asset'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default InvestmentFormModal;
