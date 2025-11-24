import React from 'react';
import { Plus, Target, Calendar, Trash2, Edit2, Save, X, Sparkles, Loader2 } from 'lucide-react';
import { FinancialGoal, Transaction } from '../types';
import { AIGoalAdvisor } from './AIGoalAdvisor';
import { GoalsAdvisorChat } from './GoalsAdvisorChat';
import { useGoals } from '../hooks/useGoals';
import { suggestFinancialGoals, SuggestedGoal } from '../services/netWorthAI';
import { deriveAssets, deriveLiabilities, buildNetWorthTimeline } from '../domain/networth/calculateNetWorth';

interface GoalsPageProps {
    userId: string;
    transactions: Transaction[];
}

const GoalsPage: React.FC<GoalsPageProps> = ({ userId, transactions }) => {
    const { goals, isLoading, addGoal, updateGoal, deleteGoal } = useGoals(userId);
    const [isAdding, setIsAdding] = React.useState(false);
    const [editingId, setEditingId] = React.useState<string | null>(null);
    const [suggestedGoals, setSuggestedGoals] = React.useState<SuggestedGoal[]>([]);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = React.useState(false);
    const [showSuggestions, setShowSuggestions] = React.useState(false);
    const [chatPanelWidth, setChatPanelWidth] = React.useState(0);

    const [formData, setFormData] = React.useState<Partial<FinancialGoal>>({
        name: '',
        target_amount: 0,
        current_amount: 0,
        deadline: '',
        category: 'purchase',
        priority: 'medium'
    });

    // Calculate financial metrics for chatbot and suggestions
    const financialMetrics = React.useMemo(() => {
        const userAssets: any[] = [];
        const userLiabilities: any[] = [];

        const assets = deriveAssets(transactions, userAssets, userLiabilities);
        const liabilities = deriveLiabilities(transactions, userLiabilities);
        const timeline = buildNetWorthTimeline(transactions, assets, liabilities);

        const currentNetWorth = timeline.length > 0 ? timeline[0].netWorth : 0;
        const recentMonths = timeline.slice(0, 3);
        const avgIncome = recentMonths.reduce((sum: number, m: any) => sum + (m.totalIncome || 0), 0) / Math.max(recentMonths.length, 1);
        const avgExpenses = recentMonths.reduce((sum: number, m: any) => sum + (m.totalExpenses || 0), 0) / Math.max(recentMonths.length, 1);

        return { currentNetWorth, avgIncome, avgExpenses, assets, liabilities };
    }, [transactions]);

    const handleSave = async () => {
        if (!formData.name || !formData.target_amount || !formData.deadline) return;

        try {
            if (editingId) {
                await updateGoal(editingId, formData);
                setEditingId(null);
            } else {
                await addGoal(formData as Omit<FinancialGoal, 'id' | 'created_at'>);
                setIsAdding(false);
            }

            setFormData({
                name: '',
                target_amount: 0,
                current_amount: 0,
                deadline: '',
                category: 'purchase',
                priority: 'medium'
            });
        } catch (error) {
            console.error('Failed to save goal:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this goal?')) {
            await deleteGoal(id);
        }
    };

    const startEdit = (goal: FinancialGoal) => {
        setFormData(goal);
        setEditingId(goal.id);
        setIsAdding(true);
    };

    const loadSuggestions = async () => {
        setIsLoadingSuggestions(true);
        try {
            // Derive financial data from transactions
            const userAssets: any[] = []; // Empty for now, could load from Supabase later
            const userLiabilities: any[] = []; // Empty for now, could load from Supabase later

            const assets = deriveAssets(transactions, userAssets, userLiabilities);
            const liabilities = deriveLiabilities(transactions, userLiabilities);
            const timeline = buildNetWorthTimeline(transactions, assets, liabilities);

            const currentNetWorth = timeline.length > 0 ? timeline[0].netWorth : 0;
            const recentMonths = timeline.slice(0, 3);
            const avgIncome = recentMonths.reduce((sum: number, m: any) => sum + (m.totalIncome || 0), 0) / Math.max(recentMonths.length, 1);
            const avgExpenses = recentMonths.reduce((sum: number, m: any) => sum + (m.totalExpenses || 0), 0) / Math.max(recentMonths.length, 1);

            const suggestions = await suggestFinancialGoals(
                currentNetWorth,
                avgIncome,
                avgExpenses,
                assets,
                liabilities
            );

            setSuggestedGoals(suggestions);
            setShowSuggestions(true);
        } catch (error) {
            console.error('Failed to load suggestions:', error);
        } finally {
            setIsLoadingSuggestions(false);
        }
    };

    const addSuggestedGoal = async (suggested: SuggestedGoal) => {
        try {
            await addGoal({
                name: suggested.name,
                target_amount: suggested.target_amount,
                current_amount: 0,
                deadline: suggested.deadline,
                category: suggested.category,
                priority: suggested.priority,
                notes: suggested.reasoning
            });
            setSuggestedGoals(prev => prev.filter(g => g.name !== suggested.name));
        } catch (error) {
            console.error('Failed to add suggested goal:', error);
        }
    };

    const getProgressColor = (current: number, target: number) => {
        const percentage = (current / target) * 100;
        if (percentage >= 75) return 'bg-green-500';
        if (percentage >= 40) return 'bg-blue-500';
        return 'bg-orange-500';
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
            </div>
        );
    }

    return (
        <div
            className="space-y-8 pb-20 animate-fadeIn transition-all duration-300"
            style={{ marginRight: window.innerWidth >= 768 && chatPanelWidth > 0 ? `${chatPanelWidth}px` : '0px' }}
        >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <Target className="w-6 h-6 sm:w-8 sm:h-8 text-brand-primary" />
                        Financial Goals
                    </h2>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">Plan and track your financial milestones with AI guidance</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <button
                        onClick={loadSuggestions}
                        disabled={isLoadingSuggestions}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-lg shadow-purple-600/20 disabled:opacity-50 w-full sm:w-auto"
                    >
                        {isLoadingSuggestions ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Sparkles className="w-5 h-5" />
                        )}
                        AI Suggest Goals
                    </button>
                    <button
                        onClick={() => { setIsAdding(true); setEditingId(null); setFormData({ name: '', target_amount: 0, current_amount: 0, deadline: '', category: 'purchase', priority: 'medium' }); }}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 transition-colors shadow-lg shadow-brand-primary/20 w-full sm:w-auto"
                    >
                        <Plus className="w-5 h-5" />
                        Add New Goal
                    </button>
                </div>
            </div>

            {/* AI Suggestions Panel */}
            {showSuggestions && suggestedGoals.length > 0 && (
                <div className="glass-panel p-6 rounded-2xl border-2 border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-purple-600" />
                            AI Suggested Goals
                        </h3>
                        <button onClick={() => setShowSuggestions(false)} className="text-gray-500 hover:text-gray-700">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {suggestedGoals.map((suggested, idx) => (
                            <div key={idx} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-purple-100 dark:border-purple-800 hover:shadow-lg transition-shadow">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h4 className="font-semibold text-gray-900 dark:text-white">{suggested.name}</h4>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">₹{suggested.target_amount.toLocaleString()}</p>
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded-full ${suggested.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                        suggested.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                            'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                                        }`}>
                                        {suggested.priority}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-600 dark:text-gray-300 mb-3">{suggested.reasoning}</p>
                                <button
                                    onClick={() => addSuggestedGoal(suggested)}
                                    className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                                >
                                    Add This Goal
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Add/Edit Modal */}
            {isAdding && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700 animate-scaleIn">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {editingId ? 'Edit Goal' : 'New Financial Goal'}
                            </h3>
                            <button onClick={() => setIsAdding(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Goal Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="e.g., Buy a House, Emergency Fund"
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary/50 outline-none transition-all"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Amount (₹)</label>
                                    <input
                                        type="number"
                                        value={formData.target_amount || ''}
                                        onChange={e => setFormData(prev => ({ ...prev, target_amount: Number(e.target.value) }))}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary/50 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Saved (₹)</label>
                                    <input
                                        type="number"
                                        value={formData.current_amount || ''}
                                        onChange={e => setFormData(prev => ({ ...prev, current_amount: Number(e.target.value) }))}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary/50 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Date</label>
                                    <input
                                        type="date"
                                        value={formData.deadline}
                                        onChange={e => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary/50 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                                    <select
                                        value={formData.category}
                                        onChange={e => setFormData(prev => ({ ...prev, category: e.target.value as any }))}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary/50 outline-none transition-all"
                                    >
                                        <option value="purchase">Purchase</option>
                                        <option value="savings">Savings</option>
                                        <option value="investment">Investment</option>
                                        <option value="debt">Debt Payoff</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                            </div>

                            <button
                                onClick={handleSave}
                                className="w-full py-2.5 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-lg font-medium transition-all shadow-lg shadow-brand-primary/20 flex items-center justify-center gap-2 mt-2"
                            >
                                <Save className="w-4 h-4" />
                                {editingId ? 'Update Goal' : 'Create Goal'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Goals Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {goals.map(goal => {
                    const percentage = Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100));
                    const isCompleted = percentage >= 100;

                    return (
                        <div key={goal.id} className="glass-panel p-6 rounded-2xl border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all group relative">
                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => startEdit(goal)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 transition-colors">
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDelete(goal.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-500 transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                                    <Target className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <div className={`px-3 py-1 rounded-full text-xs font-medium ${isCompleted ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                                    {isCompleted ? 'Completed' : `${percentage}% Achieved`}
                                </div>
                            </div>

                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{goal.name}</h3>
                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
                                <Calendar className="w-4 h-4" />
                                <span>Target: {new Date(goal.deadline).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>
                            </div>

                            <div className="space-y-2 mb-6">
                                <div className="flex justify-between text-sm font-medium">
                                    <span className="text-gray-600 dark:text-gray-300">₹{goal.current_amount.toLocaleString()}</span>
                                    <span className="text-gray-900 dark:text-white">₹{goal.target_amount.toLocaleString()}</span>
                                </div>
                                <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-1000 ${getProgressColor(goal.current_amount, goal.target_amount)}`}
                                        style={{ width: `${percentage}%` }}
                                    />
                                </div>
                            </div>

                            {!isCompleted && <AIGoalAdvisor goal={goal} />}
                        </div>
                    );
                })}

                {goals.length === 0 && (
                    <div className="col-span-full text-center py-12 glass-panel rounded-2xl border-dashed border-2 border-gray-300 dark:border-gray-700">
                        <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Target className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Goals Yet</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                            Start planning your financial future. Let AI suggest goals or create your own.
                        </p>
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={loadSuggestions}
                                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                            >
                                <Sparkles className="w-4 h-4" />
                                Get AI Suggestions
                            </button>
                            <button
                                onClick={() => setIsAdding(true)}
                                className="px-6 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 transition-colors"
                            >
                                Create Your First Goal
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Goals Advisor Chatbot */}
            <GoalsAdvisorChat
                goals={goals}
                netWorth={financialMetrics.currentNetWorth}
                monthlyIncome={financialMetrics.avgIncome}
                monthlyExpenses={financialMetrics.avgExpenses}
                onOpenChange={setChatPanelWidth}
            />
        </div>
    );
};

export default GoalsPage;
