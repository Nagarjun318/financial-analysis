import React from 'react';
import { Plus, Edit2, Trash2, Calendar, IndianRupee, AlertCircle, CheckCircle, Clock, Sparkles, History } from 'lucide-react';
import { useHomeServices } from '../hooks/useHomeServices';
import { HomeService } from '../types';
import { supabase } from '../services/supabaseClient';
import { ServiceAdvisorChat } from './ServiceAdvisorChat';
import { ServiceInsightsDashboard } from './ServiceInsightsDashboard';
import { ServiceHistoryModal } from './ServiceHistoryModal';
import { detectServiceTypeAndSuggest } from '../services/geminiService';

const ServicesPage: React.FC = () => {
  const [chatPanelWidth, setChatPanelWidth] = React.useState(0);
  const [session, setSession] = React.useState(null as any);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingService, setEditingService] = React.useState(null as HomeService | null);
  const [selectedServiceType, setSelectedServiceType] = React.useState(null as string | null);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = React.useState(false);
  const [historyModalService, setHistoryModalService] = React.useState<{ id: number; name: string } | null>(null);
  const [formData, setFormData] = React.useState({
    service_name: '',
    service_type: '',
    custom_service_type: '',
    last_service_date: '',
    next_service_due: '',
    service_provider: '',
    cost: '',
    notes: '',
  });

  React.useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
  }, []);

  const userId = session?.user?.id;
  const {
    services,
    isLoading,
    error,
    createService,
    updateService,
    deleteService,
    isCreating,
    isUpdating,
    isDeleting,
  } = useHomeServices(userId);

  // Get unique service types from existing services + common defaults
  const existingServiceTypes = React.useMemo(() => {
    const types = new Set(services.map(s => s.service_type));
    // Add common defaults if not present
    const defaults = ['AC', 'Water Purifier', 'Geyser', 'Chimney', 'Washing Machine', 'Refrigerator', 'Car Service', 'Bike Service', 'Electricals', 'Plumbing', 'Painting', 'Pest Control'];
    defaults.forEach(d => types.add(d));
    return Array.from(types).sort();
  }, [services]);

  const calculateNextServiceDate = (months: number, baseDate?: string): string => {
    const startDate = baseDate ? new Date(baseDate) : new Date();
    const nextDate = new Date(startDate);
    nextDate.setMonth(nextDate.getMonth() + months);
    return nextDate.toISOString().split('T')[0];
  };

  const getServiceStatus = (nextDueDate: string) => {
    const today = new Date();
    const dueDate = new Date(nextDueDate);
    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { status: 'overdue', text: 'Overdue', color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-50 dark:bg-red-900/20', icon: AlertCircle };
    } else if (diffDays <= 7) {
      return { status: 'urgent', text: 'Due Soon', color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-50 dark:bg-orange-900/20', icon: Clock };
    } else if (diffDays <= 30) {
      return { status: 'upcoming', text: 'Upcoming', color: 'text-yellow-600 dark:text-yellow-400', bgColor: 'bg-yellow-50 dark:bg-yellow-900/20', icon: Calendar };
    } else {
      return { status: 'ok', text: 'On Track', color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-50 dark:bg-green-900/20', icon: CheckCircle };
    }
  };

  const handleOpenModal = (service?: HomeService) => {
    if (service) {
      setEditingService(service);
      setFormData({
        service_name: service.service_name,
        service_type: service.service_type,
        custom_service_type: '',
        last_service_date: service.last_service_date,
        next_service_due: service.next_service_due,
        service_provider: service.service_provider || '',
        cost: service.cost?.toString() || '',
        notes: service.notes || '',
      });
    } else {
      setEditingService(null);
      const today = new Date().toISOString().split('T')[0];
      setFormData({
        service_name: '',
        service_type: '',
        custom_service_type: '',
        last_service_date: today,
        next_service_due: '',
        service_provider: '',
        cost: '',
        notes: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingService(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate service type
    if (!formData.service_type.trim()) {
      alert('Please enter a service name to detect service type');
      return;
    }

    const serviceData = {
      user_id: userId,
      service_name: formData.service_name,
      service_type: formData.service_type,
      last_service_date: formData.last_service_date,
      next_service_due: formData.next_service_due,
      service_provider: formData.service_provider || undefined,
      cost: formData.cost ? parseFloat(formData.cost) : undefined,
      notes: formData.notes || undefined,
    };

    try {
      if (editingService?.id) {
        await updateService({ id: editingService.id, updates: serviceData });
      } else {
        await createService(serviceData);
      }
      handleCloseModal();
    } catch (err) {
      console.error('Error saving service:', err);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this service record?')) {
      try {
        await deleteService(id);
      } catch (err) {
        console.error('Error deleting service:', err);
      }
    }
  };

  // AI Auto-detection when service name changes
  React.useEffect(() => {
    const detectAndSuggest = async () => {
      if (!formData.service_name || editingService) {
        return; // Don't suggest when editing existing service
      }

      // Only trigger if service name has meaningful content (more than 2 chars)
      if (formData.service_name.length < 3) return;

      setIsLoadingSuggestions(true);
      try {
        const suggestions = await detectServiceTypeAndSuggest(
          formData.service_name,
          services,
          existingServiceTypes,
          formData.last_service_date || undefined
        );

        if (suggestions) {
          setFormData((prev: typeof formData) => ({
            ...prev,
            service_type: suggestions.detectedServiceType,
            service_provider: suggestions.suggestedProvider || prev.service_provider,
            cost: suggestions.suggestedCost !== undefined ? suggestions.suggestedCost.toString() : prev.cost,
            notes: suggestions.suggestedNotes || prev.notes,
            next_service_due: suggestions.suggestedNextServiceDate || prev.next_service_due,
          }));
        }
      } catch (error) {
        console.error('Error fetching AI suggestions:', error);
      } finally {
        setIsLoadingSuggestions(false);
      }
    };

    // Debounce the API call
    const timeoutId = setTimeout(detectAndSuggest, 800);
    return () => clearTimeout(timeoutId);
  }, [formData.service_name, formData.last_service_date]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Kolkata' });
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === 0) return 'Free Service';
    if (!amount) return '-';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  };

  const filteredServices = selectedServiceType
    ? services.filter(service => service.service_type === selectedServiceType)
    : services;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <p className="text-lg font-medium text-gray-600 dark:text-gray-300 animate-pulse">Loading services...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" style={{ marginRight: `${chatPanelWidth}px`, transition: 'margin-right 0.3s ease-in-out' }}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold gradient-text mb-2">Home Services Tracker</h1>
          <p className="text-gray-600 dark:text-gray-300">
            Keep track of all your home service maintenance schedules
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-lg font-semibold transition shadow-lg"
        >
          <Plus className="h-5 w-5" />
          Add Service
        </button>
      </div>

      {/* AI Insights Dashboard */}
      {services.length > 0 && <ServiceInsightsDashboard services={services} />}

      {/* Error Message */}
      {error && (
        <div className="glass-panel p-4 rounded-lg border-l-4 border-red-500">
          <p className="text-red-600 dark:text-red-400">Error loading services: {error.message}</p>
        </div>
      )}

      {/* Table View for Filtered Service Type */}
      {selectedServiceType && (
        <div className="glass-panel p-6 rounded-xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {selectedServiceType} Services ({filteredServices.length})
            </h2>
            <button
              onClick={() => setSelectedServiceType(null)}
              className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-semibold transition"
            >
              Back to All Services
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Service Name</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Last Service</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Next Due</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Provider</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Cost</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredServices.map((service) => {
                  const status = getServiceStatus(service.next_service_due);
                  const StatusIcon = status.icon;

                  return (
                    <tr key={service.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">{service.service_name}</p>
                          {service.notes && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{service.notes}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                        {formatDate(service.last_service_date)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                        {formatDate(service.next_service_due)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded ${status.bgColor} ${status.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {status.text}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                        {service.service_provider || '-'}
                      </td>
                      <td className="py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(service.cost)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleOpenModal(service)}
                            className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => service.id && handleDelete(service.id)}
                            className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                            disabled={isDeleting}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Services List */}
      {!selectedServiceType && services.length === 0 ? (
        <div className="glass-panel p-12 rounded-xl text-center">
          <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
            No services tracked yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Start tracking your home services to stay on top of maintenance schedules
          </p>
          <button
            onClick={() => handleOpenModal()}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-lg font-semibold transition"
          >
            Add Your First Service
          </button>
        </div>
      ) : !selectedServiceType ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => {
            const status = getServiceStatus(service.next_service_due);
            const StatusIcon = status.icon;

            return (
              <div key={service.id} className="glass-panel p-6 rounded-xl hover:shadow-lg transition-shadow">
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <button
                        onClick={() => setSelectedServiceType(service.service_type)}
                        className="px-2 py-1 text-xs font-semibold rounded bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition cursor-pointer"
                      >
                        {service.service_type}
                      </button>
                      <span className={`flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded ${status.bgColor} ${status.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {status.text}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      {service.service_name}
                    </h3>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => service.id && setHistoryModalService({ id: service.id, name: service.service_name })}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition"
                      title="View History"
                    >
                      <History className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleOpenModal(service)}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => service.id && handleDelete(service.id)}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition"
                      disabled={isDeleting}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">Last Service:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {formatDate(service.last_service_date)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <AlertCircle className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">Next Due:</span>
                    <span className={`font-semibold ${status.color}`}>
                      {formatDate(service.next_service_due)}
                    </span>
                  </div>

                  {service.service_provider && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Provider:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {service.service_provider}
                      </span>
                    </div>
                  )}

                  {service.cost !== null && service.cost !== undefined && (
                    <div className="flex items-center gap-2 text-sm">
                      <IndianRupee className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">Cost:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(service.cost)}
                      </span>
                    </div>
                  )}

                  {service.notes && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-xs text-gray-600 dark:text-gray-400 italic">
                        {service.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-panel p-6 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold gradient-text mb-6">
              {editingService ? 'Edit Service' : 'Add New Service'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                    Service Name / Brand *
                    {isLoadingSuggestions && <Sparkles className="h-4 w-4 text-indigo-500 animate-pulse" />}
                  </label>
                  <input
                    type="text"
                    value={formData.service_name}
                    onChange={(e) => setFormData({ ...formData, service_name: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="e.g., Aquaguard, Voltas AC, Honda City"
                    required
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    AI will detect service type from brand/name
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                    Service Type *
                    {isLoadingSuggestions && <Sparkles className="h-4 w-4 text-indigo-500 animate-pulse" />}
                  </label>
                  <input
                    type="text"
                    value={formData.service_type}
                    onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="AI will detect from service name (e.g., 'AC', 'Water Purifier')"
                    list="service-types-list"
                    readOnly={isLoadingSuggestions}
                    required
                  />
                  <datalist id="service-types-list">
                    {existingServiceTypes.map((type: string) => (
                      <option key={type} value={type} />
                    ))}
                  </datalist>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    AI auto-detects type from service name. You can also select from existing types or enter a new one.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Last Service Date *
                  </label>
                  <input
                    type="date"
                    value={formData.last_service_date}
                    onChange={(e) => setFormData({ ...formData, last_service_date: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                    Next Service Due *
                    {isLoadingSuggestions && <Sparkles className="h-4 w-4 text-indigo-500 animate-pulse" />}
                  </label>
                  <div className="space-y-2">
                    <div className="grid grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, next_service_due: calculateNextServiceDate(3, formData.last_service_date || undefined) })}
                        className="px-2 py-1.5 text-xs bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-lg transition font-medium"
                      >
                        +3M
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, next_service_due: calculateNextServiceDate(6, formData.last_service_date || undefined) })}
                        className="px-2 py-1.5 text-xs bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-lg transition font-medium"
                      >
                        +6M
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, next_service_due: calculateNextServiceDate(9, formData.last_service_date || undefined) })}
                        className="px-2 py-1.5 text-xs bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-lg transition font-medium"
                      >
                        +9M
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, next_service_due: calculateNextServiceDate(12, formData.last_service_date || undefined) })}
                        className="px-2 py-1.5 text-xs bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-lg transition font-medium"
                      >
                        +1Y
                      </button>
                    </div>
                    <input
                      type="date"
                      value={formData.next_service_due}
                      onChange={(e) => setFormData({ ...formData, next_service_due: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      required
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formData.last_service_date ? `From ${formatDate(formData.last_service_date)}` : 'From today'}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Service Provider
                  </label>
                  <input
                    type="text"
                    value={formData.service_provider}
                    onChange={(e) => setFormData({ ...formData, service_provider: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="e.g., Urban Company"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Cost (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  rows={3}
                  placeholder="Any additional notes or reminders..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={isCreating || isUpdating || isLoadingSuggestions}
                  className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating || isUpdating ? 'Saving...' : editingService ? 'Update Service' : 'Add Service'}
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-6 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-semibold transition"
                >
                  Cancel
                </button>
              </div>
              {isLoadingSuggestions && (
                <div className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 mt-2">
                  <Sparkles className="h-4 w-4 animate-pulse" />
                  <span>AI is suggesting details...</span>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Service Advisor Chatbot */}
      <ServiceAdvisorChat services={services} onOpenChange={setChatPanelWidth} />

      {/* Service History Modal */}
      {historyModalService && (
        <ServiceHistoryModal
          isOpen={true}
          onClose={() => setHistoryModalService(null)}
          serviceId={historyModalService.id}
          serviceName={historyModalService.name}
          userId={userId || 'demo-user'}
          currentService={services.find(s => s.id === historyModalService.id)}
        />
      )}
    </div>
  );
};

export default ServicesPage;