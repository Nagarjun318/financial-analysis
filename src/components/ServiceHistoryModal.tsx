import React, { useState } from 'react';
import { X, History, TrendingUp, Calendar, DollarSign, Wrench, Plus, Trash2, Edit2, Loader2 } from 'lucide-react';
import { ServiceHistory, ServiceStatistics, HomeService } from '../types';
import { useServiceHistory } from '../hooks/useHomeServices';
import { formatCurrency } from '../utils';

interface ServiceHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    serviceId: number;
    serviceName: string;
    userId: string;
    currentService?: HomeService; // Current/latest service details
}

export function ServiceHistoryModal({ isOpen, onClose, serviceId, serviceName, userId, currentService }: ServiceHistoryModalProps) {
    const { history, statistics, isLoading, addHistory, deleteHistory, isAdding, isDeletingHistory } = useServiceHistory(serviceId);
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [formData, setFormData] = useState({
        service_date: new Date().toISOString().split('T')[0],
        service_provider: '',
        cost: '',
        notes: '',
        work_performed: '',
        odometer_reading: '',
    });

    if (!isOpen) return null;

    // Calculate statistics including current service
    const computedStats = React.useMemo(() => {
        if (!currentService) return statistics;

        const allRecords = [currentService, ...history];
        const recordsWithCost = allRecords.filter(r => r.cost !== null && r.cost !== undefined);
        const totalServices = allRecords.length;
        const totalCost = recordsWithCost.reduce((sum, r) => sum + (r.cost || 0), 0);
        const averageCost = recordsWithCost.length > 0 ? totalCost / recordsWithCost.length : 0;

        // Calculate average interval
        const dates = allRecords.map(r => new Date('last_service_date' in r ? r.last_service_date : r.service_date).getTime()).sort((a, b) => b - a);
        let averageInterval = 0;
        if (dates.length > 1) {
            const intervals = [];
            for (let i = 0; i < dates.length - 1; i++) {
                intervals.push((dates[i] - dates[i + 1]) / (1000 * 60 * 60 * 24));
            }
            averageInterval = Math.round(intervals.reduce((sum, val) => sum + val, 0) / intervals.length);
        }

        return {
            total_services: totalServices,
            total_cost: totalCost,
            average_cost: averageCost,
            last_service_date: currentService.last_service_date,
            average_interval_days: averageInterval
        };
    }, [currentService, history, statistics]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await addHistory({
                service_id: serviceId,
                user_id: userId,
                service_date: formData.service_date,
                service_provider: formData.service_provider || undefined,
                cost: formData.cost ? parseFloat(formData.cost) : undefined,
                notes: formData.notes || undefined,
                work_performed: formData.work_performed || undefined,
                odometer_reading: formData.odometer_reading ? parseInt(formData.odometer_reading) : undefined,
            });
            setIsAddingNew(false);
            setFormData({
                service_date: new Date().toISOString().split('T')[0],
                service_provider: '',
                cost: '',
                notes: '',
                work_performed: '',
                odometer_reading: '',
            });
        } catch (error) {
            console.error('Error adding history:', error);
            alert('Failed to add service record');
        }
    };

    const handleDelete = async (id: number) => {
        if (confirm('Are you sure you want to delete this service record?')) {
            try {
                await deleteHistory(id);
            } catch (error) {
                console.error('Error deleting history:', error);
                alert('Failed to delete service record');
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <History className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">Service History</h2>
                            <p className="text-white/80 text-sm">{serviceName}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-white"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Statistics Cards */}
                {computedStats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-gray-50 dark:bg-gray-800/50">
                        <div className="glass-panel p-4 rounded-xl">
                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                                <Wrench className="w-4 h-4" />
                                <span className="text-xs font-medium">Total Services</span>
                            </div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{computedStats.total_services}</p>
                        </div>
                        <div className="glass-panel p-4 rounded-xl">
                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                                <DollarSign className="w-4 h-4" />
                                <span className="text-xs font-medium">Total Cost</span>
                            </div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(computedStats.total_cost)}</p>
                        </div>
                        <div className="glass-panel p-4 rounded-xl">
                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                                <TrendingUp className="w-4 h-4" />
                                <span className="text-xs font-medium">Avg Cost</span>
                            </div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(computedStats.average_cost)}</p>
                        </div>
                        <div className="glass-panel p-4 rounded-xl">
                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                                <Calendar className="w-4 h-4" />
                                <span className="text-xs font-medium">Avg Interval</span>
                            </div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{computedStats.average_interval_days} days</p>
                        </div>
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Service Records</h3>
                        <button
                            onClick={() => setIsAddingNew(!isAddingNew)}
                            className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg hover:opacity-90 transition-all"
                        >
                            <Plus className="w-4 h-4" />
                            Add Record
                        </button>
                    </div>

                    {/* Add New Record Form */}
                    {isAddingNew && (
                        <form onSubmit={handleSubmit} className="glass-panel p-6 rounded-xl mb-6">
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-4">New Service Record</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Service Date *
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.service_date}
                                        onChange={(e) => setFormData({ ...formData, service_date: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Service Provider
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.service_provider}
                                        onChange={(e) => setFormData({ ...formData, service_provider: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary"
                                        placeholder="e.g., ABC Service Center"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Cost
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.cost}
                                        onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Odometer Reading (km)
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.odometer_reading}
                                        onChange={(e) => setFormData({ ...formData, odometer_reading: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary"
                                        placeholder="e.g., 15000"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Work Performed
                                    </label>
                                    <textarea
                                        value={formData.work_performed}
                                        onChange={(e) => setFormData({ ...formData, work_performed: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary"
                                        rows={2}
                                        placeholder="e.g., Oil change, brake pads replacement"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Notes
                                    </label>
                                    <textarea
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary"
                                        rows={2}
                                        placeholder="Additional notes..."
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 mt-4">
                                <button
                                    type="submit"
                                    disabled={isAdding}
                                    className="flex items-center gap-2 px-6 py-2 bg-brand-primary text-white rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
                                >
                                    {isAdding ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="w-4 h-4" />
                                            Add Record
                                        </>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsAddingNew(false)}
                                    className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    )}

                    {/* History List */}
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
                        </div>
                    ) : !currentService && history.length === 0 ? (
                        <div className="text-center py-12">
                            <History className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500 dark:text-gray-400">No service history yet</p>
                            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Add your first service record above</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Current Service (Latest) */}
                            {currentService && (
                                <div className="glass-panel p-6 rounded-xl border-[3px] border-blue-500 dark:border-blue-400 shadow-lg shadow-blue-500/20 dark:shadow-blue-400/20 hover:shadow-xl transition-shadow">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-brand-primary/10 flex items-center justify-center">
                                                <Calendar className="w-5 h-5 text-brand-primary" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-900 dark:text-white">
                                                    {new Date(currentService.last_service_date).toLocaleDateString('en-IN', {
                                                        day: 'numeric',
                                                        month: 'long',
                                                        year: 'numeric'
                                                    })}
                                                </p>
                                                {currentService.service_provider && (
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">{currentService.service_provider}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {currentService.cost !== null && currentService.cost !== undefined && (
                                                <span className="text-lg font-bold text-brand-primary">{formatCurrency(currentService.cost)}</span>
                                            )}
                                        </div>
                                    </div>

                                    {currentService.notes && (
                                        <div>
                                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes:</p>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">{currentService.notes}</p>
                                        </div>
                                    )}

                                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            Next service due: {new Date(currentService.next_service_due).toLocaleDateString('en-IN', {
                                                day: 'numeric',
                                                month: 'long',
                                                year: 'numeric'
                                            })}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Historical Records */}
                            {history.length > 0 && (
                                <div className="space-y-4">
                                    {history.map((record) => (
                                        <div key={record.id} className="glass-panel p-6 rounded-xl hover:shadow-lg transition-shadow">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-brand-primary/10 flex items-center justify-center">
                                                        <Calendar className="w-5 h-5 text-brand-primary" />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-gray-900 dark:text-white">
                                                            {new Date(record.service_date).toLocaleDateString('en-IN', {
                                                                day: 'numeric',
                                                                month: 'long',
                                                                year: 'numeric'
                                                            })}
                                                        </p>
                                                        {record.service_provider && (
                                                            <p className="text-sm text-gray-600 dark:text-gray-400">{record.service_provider}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {record.cost && (
                                                        <span className="text-lg font-bold text-brand-primary">{formatCurrency(record.cost)}</span>
                                                    )}
                                                    <button
                                                        onClick={() => record.id && handleDelete(record.id)}
                                                        disabled={isDeletingHistory}
                                                        className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            {record.work_performed && (
                                                <div className="mb-3">
                                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Work Performed:</p>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">{record.work_performed}</p>
                                                </div>
                                            )}

                                            {record.odometer_reading && (
                                                <div className="mb-3">
                                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Odometer Reading:</p>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">{record.odometer_reading.toLocaleString()} km</p>
                                                </div>
                                            )}

                                            {record.notes && (
                                                <div>
                                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes:</p>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">{record.notes}</p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Empty state when no history but has current service */}
                            {history.length === 0 && currentService && (
                                <div className="text-center py-8">
                                    <History className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                    <p className="text-gray-500 dark:text-gray-400 text-sm">No previous service history</p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">The current service is shown above</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
