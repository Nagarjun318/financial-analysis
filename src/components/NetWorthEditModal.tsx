import React from 'react';
import { X, Save, Trash2 } from 'lucide-react';
import { Asset, Liability } from '../domain/networth/calculateNetWorth';

interface NetWorthEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'asset' | 'liability';
    initialData?: Partial<Asset> | Partial<Liability>;
    onSave: (data: any) => Promise<void>;
    onDelete?: (id: string) => Promise<void>;
}

export const NetWorthEditModal: React.FC<NetWorthEditModalProps> = ({
    isOpen,
    onClose,
    type,
    initialData,
    onSave,
    onDelete
}) => {
    const [formData, setFormData] = React.useState<any>({});
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    React.useEffect(() => {
        if (isOpen && initialData) {
            setFormData(initialData);
        } else if (isOpen) {
            // Defaults
            if (type === 'asset') {
                setFormData({
                    name: '',
                    type: 'investment',
                    currentValue: 0,
                    createdOn: new Date().toISOString().split('T')[0]
                });
            } else {
                setFormData({
                    name: '',
                    type: 'loan',
                    principal: 0,
                    interestRateAnnual: 10,
                    monthlyEMI: 0,
                    extraPaymentMonthly: 0,
                    startDate: new Date().toISOString().split('T')[0]
                });
            }
        }
    }, [isOpen, initialData, type]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await onSave(formData);
            onClose();
        } catch (error) {
            console.error('Failed to save:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!onDelete || !formData.id) return;
        if (window.confirm('Are you sure you want to delete this item?')) {
            setIsSubmitting(true);
            try {
                await onDelete(formData.id);
                onClose();
            } catch (error) {
                console.error('Failed to delete:', error);
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {initialData?.id ? `Edit ${type === 'asset' ? 'Asset' : 'Liability'}` : `Add ${type === 'asset' ? 'Asset' : 'Liability'}`}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Name
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.name || ''}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                            placeholder={`e.g., ${type === 'asset' ? 'Stock Portfolio' : 'Home Loan'}`}
                        />
                    </div>

                    {type === 'asset' ? (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Type
                                </label>
                                <select
                                    value={formData.type || 'investment'}
                                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                >
                                    <option value="investment">Investment</option>
                                    <option value="property">Property</option>
                                    <option value="vehicle">Vehicle</option>
                                    <option value="gold">Gold</option>
                                    <option value="cash">Cash</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Current Value (₹)
                                </label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    value={formData.currentValue || ''}
                                    onChange={e => setFormData({ ...formData, currentValue: Number(e.target.value) })}
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Date Acquired
                                </label>
                                <input
                                    type="date"
                                    value={formData.createdOn || ''}
                                    onChange={e => setFormData({ ...formData, createdOn: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Type
                                </label>
                                <select
                                    value={formData.type || 'loan'}
                                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                >
                                    <option value="loan">Loan</option>
                                    <option value="mortgage">Mortgage</option>
                                    <option value="credit_card">Credit Card</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Principal (₹)
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        value={formData.principal || ''}
                                        onChange={e => setFormData({ ...formData, principal: Number(e.target.value) })}
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Interest Rate (%)
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        step="0.1"
                                        value={formData.interestRateAnnual || ''}
                                        onChange={e => setFormData({ ...formData, interestRateAnnual: Number(e.target.value) })}
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Monthly EMI (₹)
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        value={formData.monthlyEMI || ''}
                                        onChange={e => setFormData({ ...formData, monthlyEMI: Number(e.target.value) })}
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Extra Payment (₹)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.extraPaymentMonthly || ''}
                                        onChange={e => setFormData({ ...formData, extraPaymentMonthly: Number(e.target.value) })}
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Start Date
                                </label>
                                <input
                                    type="date"
                                    value={formData.startDate || ''}
                                    onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                />
                            </div>
                        </>
                    )}
                </form>

                <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-4">
                    {initialData?.id && onDelete ? (
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={isSubmitting}
                            className="px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors flex items-center gap-2"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete
                        </button>
                    ) : (
                        <div></div>
                    )}
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                        >
                            <Save className="w-4 h-4" />
                            {isSubmitting ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
