import React, { useState } from 'react';
import { History, TrendingUp, Calendar, DollarSign, Wrench, Plus, Trash2 } from 'lucide-react';
import { HomeService } from '../types';
import { Modal, Button, Card, Stat, EmptyState, Skeleton } from './ui';
import { useServiceHistory } from '../hooks/useHomeServices';
import { formatCurrency } from '../utils';
import { showToast } from '../utils/toast';

interface ServiceHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    serviceId: number;
    serviceName: string;
    userId: string;
    currentService?: HomeService; // Current/latest service details
}

export function ServiceHistoryModal({ isOpen, onClose, serviceId, serviceName, userId, currentService }: ServiceHistoryModalProps) {
    const { history: rawHistory, statistics, isLoading, addHistory, deleteHistory, isAdding, isDeletingHistory } = useServiceHistory(serviceId);
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [formData, setFormData] = useState({
        service_date: new Date().toISOString().split('T')[0],
        service_provider: '',
        cost: '',
        notes: '',
        work_performed: '',
        odometer_reading: '' });

    // Filter out auto-created initial history record that matches current service date
    // The DB trigger creates a history record when a service is added, but we show the current service separately
    const history = React.useMemo(() => {
        if (!currentService) return rawHistory;

        // Filter out any history record that has the same date as the current service
        // These are auto-created by the trigger and would be duplicates
        return rawHistory.filter(record => record.service_date !== currentService.last_service_date);
    }, [rawHistory, currentService]);

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

    if (!isOpen) return null;

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
                odometer_reading: formData.odometer_reading ? parseInt(formData.odometer_reading) : undefined });
            setIsAddingNew(false);
            setFormData({
                service_date: new Date().toISOString().split('T')[0],
                service_provider: '',
                cost: '',
                notes: '',
                work_performed: '',
                odometer_reading: '' });
        } catch (error) {
            console.error('Error adding history:', error);
            showToast('Failed to add service record', 'error');
        }
    };

    const handleDelete = async (id: number) => {
        if (confirm('Are you sure you want to delete this service record?')) {
            try {
                await deleteHistory(id);
            } catch (error) {
                console.error('Error deleting history:', error);
                showToast('Failed to delete service record', 'error');
            }
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={serviceName ? `Service History — ${serviceName}` : 'Service History'}
            maxWidth="4xl"
        >
            {/* Statistics Cards */}
            {computedStats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <Card padding="sm">
                        <Stat
                            label="Total Services"
                            value={String(computedStats.total_services)}
                            icon={<Wrench className="w-4 h-4" aria-hidden="true" />}
                        />
                    </Card>
                    <Card padding="sm">
                        <Stat
                            label="Total Cost"
                            value={formatCurrency(computedStats.total_cost)}
                            icon={<DollarSign className="w-4 h-4" aria-hidden="true" />}
                        />
                    </Card>
                    <Card padding="sm">
                        <Stat
                            label="Avg Cost"
                            value={formatCurrency(computedStats.average_cost)}
                            icon={<TrendingUp className="w-4 h-4" aria-hidden="true" />}
                        />
                    </Card>
                    <Card padding="sm">
                        <Stat
                            label="Avg Interval"
                            value={`${computedStats.average_interval_days} days`}
                            icon={<Calendar className="w-4 h-4" aria-hidden="true" />}
                        />
                    </Card>
                </div>
            )}

                {/* Content */}
                <div>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Service Records</h3>
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={() => setIsAddingNew(!isAddingNew)}
                        >
                            <Plus className="w-4 h-4" aria-hidden="true" />
                            Add Record
                        </Button>
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
                                <Button
                                    type="submit"
                                    variant="primary"
                                    loading={isAdding}
                                    disabled={isAdding}
                                >
                                    {!isAdding && <Plus className="w-4 h-4" aria-hidden="true" />}
                                    {isAdding ? 'Saving...' : 'Add Record'}
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={() => setIsAddingNew(false)}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    )}

                    {/* History List */}
                    {isLoading ? (
                        <Skeleton lines={4} />
                    ) : !currentService && history.length === 0 ? (
                        <EmptyState
                            icon={<History className="w-16 h-16" aria-hidden="true" />}
                            title="No service history yet"
                            description="Add your first service record above"
                        />
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
                                <EmptyState
                                    title="No previous service history"
                                    description="The current service is shown above"
                                />
                            )}
                        </div>
                    )}
                </div>
        </Modal>
    );
}
