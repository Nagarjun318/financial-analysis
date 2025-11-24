import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  PieChart,
  Plus,
  Trash2,
  Edit2,
  Brain,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Target,
  Loader2,
  X
} from 'lucide-react';
import {
  PieChart as RePieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  Legend
} from 'recharts';
import { callGeminiAPI, GEMINI_MODELS } from '../services/geminiService';
import { formatCurrency } from '../utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { supabase } from '../services/supabaseClient';

// --- Types ---
interface Investment {
  id: string;
  name: string;
  type: 'Stock' | 'Mutual Fund' | 'Crypto' | 'Gold' | 'Real Estate' | 'Bond' | 'ETF' | 'Other';
  investedAmount: number;
  currentValue: number;
  date: string;
  notes?: string;
}

interface PortfolioSummary {
  totalInvested: number;
  totalValue: number;
  totalProfit: number;
  roi: number;
}

// --- Constants ---
const INVESTMENT_TYPES = ['Stock', 'Mutual Fund', 'Crypto', 'Gold', 'Real Estate', 'Bond', 'ETF', 'Other'];
const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316', '#64748b'];

const InvestmentPage: React.FC = () => {
  // --- State ---
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<Omit<Investment, 'id'>>({
    name: '',
    type: 'Stock',
    investedAmount: 0,
    currentValue: 0,
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // --- Effects ---
  // Load investments from Supabase
  useEffect(() => {
    loadInvestments();
  }, []);

  const loadInvestments = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('investments')
        .select('*')
        .order('date', { ascending: false });

      if (fetchError) throw fetchError;

      // Transform database format to component format
      const transformedData: Investment[] = (data || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        type: item.type,
        investedAmount: parseFloat(item.invested_amount),
        currentValue: parseFloat(item.current_value),
        date: item.date,
        notes: item.notes || ''
      }));

      setInvestments(transformedData);
    } catch (err) {
      console.error('Error loading investments:', err);
      setError('Failed to load investments');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Derived Data ---
  const summary: PortfolioSummary = useMemo(() => {
    const totalInvested = investments.reduce((sum: number, inv: Investment) => sum + inv.investedAmount, 0);
    const totalValue = investments.reduce((sum: number, inv: Investment) => sum + inv.currentValue, 0);
    const totalProfit = totalValue - totalInvested;
    const roi = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;
    return { totalInvested, totalValue, totalProfit, roi };
  }, [investments]);

  const allocationData = useMemo(() => {
    const map = new Map<string, number>();
    investments.forEach((inv: Investment) => {
      map.set(inv.type, (map.get(inv.type) || 0) + inv.currentValue);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [investments]);

  // --- Handlers ---
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev: Omit<Investment, 'id'>) => ({
      ...prev,
      [name]: name === 'investedAmount' || name === 'currentValue' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dbData = {
        name: formData.name,
        type: formData.type,
        invested_amount: formData.investedAmount,
        current_value: formData.currentValue,
        date: formData.date,
        notes: formData.notes || null
      };

      if (editingId) {
        // Update existing investment
        const { error: updateError } = await supabase
          .from('investments')
          .update(dbData)
          .eq('id', editingId);

        if (updateError) throw updateError;
      } else {
        // Insert new investment
        const { error: insertError } = await supabase
          .from('investments')
          .insert([dbData]);

        if (insertError) throw insertError;
      }

      // Reload investments from database
      await loadInvestments();
      closeModal();
    } catch (err) {
      console.error('Error saving investment:', err);
      alert('Failed to save investment. Please try again.');
    }
  };

  const closeModal = () => {
    setIsAddModalOpen(false);
    setEditingId(null);
    setFormData({
      name: '',
      type: 'Stock',
      investedAmount: 0,
      currentValue: 0,
      date: new Date().toISOString().split('T')[0],
      notes: ''
    });
  };

  const handleEdit = (inv: Investment) => {
    setFormData(inv);
    setEditingId(inv.id);
    setIsAddModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this investment?')) {
      try {
        const { error: deleteError } = await supabase
          .from('investments')
          .delete()
          .eq('id', id);

        if (deleteError) throw deleteError;

        // Reload investments from database
        await loadInvestments();
      } catch (err) {
        console.error('Error deleting investment:', err);
        alert('Failed to delete investment. Please try again.');
      }
    }
  };

  const handleAIAnalyze = async () => {
    if (investments.length === 0) return;
    setIsAnalyzing(true);
    try {
      const prompt = `
        You are a senior investment advisor. Analyze this portfolio and provide actionable insights.
        
        PORTFOLIO DATA:
        ${JSON.stringify(investments.map((i: Investment) => ({ type: i.type, name: i.name, invested: i.investedAmount, current: i.currentValue })))}
        
        TOTAL METRICS:
        Invested: ${summary.totalInvested}
        Current Value: ${summary.totalValue}
        ROI: ${summary.roi.toFixed(2)}%

        Please provide:
        1. 🛡️ Risk Assessment (Low/Medium/High)
        2. 📊 Diversification Analysis (Are they too concentrated?)
        3. 💡 3 Specific Recommendations to improve the portfolio.
        4. 🔮 Short-term Outlook based on asset types.

        Format with clear headings and bullet points. Keep it concise but professional.
      `;

      const response = await callGeminiAPI(prompt, GEMINI_MODELS.PRO_LATEST);
      setAiAnalysis(response.text);
    } catch (error) {
      console.error('AI Analysis failed', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // --- Render ---
  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-brand-primary" />
          <p className="text-light-text-secondary dark:text-dark-text-secondary">Loading investments...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="glass-panel p-8 rounded-xl text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-xl font-semibold text-light-text dark:text-dark-text mb-2">Error Loading Investments</h3>
          <p className="text-light-text-secondary dark:text-dark-text-secondary mb-4">{error}</p>
          <button
            onClick={loadInvestments}
            className="px-6 py-2 bg-brand-primary text-white rounded-lg hover:opacity-90 transition-all"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-light-text dark:text-dark-text">Investment Portfolio</h1>
          <p className="text-light-text-secondary dark:text-dark-text-secondary">Track and analyze your wealth growth</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleAIAnalyze}
            disabled={isAnalyzing || investments.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:opacity-90 transition-all disabled:opacity-50 shadow-lg shadow-purple-500/20"
          >
            {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
            {isAnalyzing ? 'Analyzing...' : 'AI Analysis'}
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 transition-all shadow-lg shadow-brand-primary/20"
          >
            <Plus className="w-4 h-4" />
            Add Investment
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 rounded-xl border-l-4 border-brand-primary">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary font-medium">Total Value</p>
              <h3 className="text-2xl font-bold text-light-text dark:text-dark-text">{formatCurrency(summary.totalValue)}</h3>
            </div>
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
              <Wallet className="w-5 h-5 text-brand-primary" />
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-xl border-l-4 border-emerald-500">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary font-medium">Total Profit/Loss</p>
              <h3 className={`text-2xl font-bold ${summary.totalProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {summary.totalProfit >= 0 ? '+' : ''}{formatCurrency(summary.totalProfit)}
              </h3>
            </div>
            <div className={`p-2 rounded-lg ${summary.totalProfit >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/30' : 'bg-red-50 dark:bg-red-900/30'}`}>
              {summary.totalProfit >= 0 ? <ArrowUpRight className="w-5 h-5 text-emerald-500" /> : <ArrowDownRight className="w-5 h-5 text-red-500" />}
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-xl border-l-4 border-purple-500">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary font-medium">Return on Investment</p>
              <h3 className="text-2xl font-bold text-purple-600 dark:text-purple-400">{summary.roi.toFixed(2)}%</h3>
            </div>
            <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
              <TrendingUp className="w-5 h-5 text-purple-500" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Asset Allocation Chart */}
        <div className="lg:col-span-1 glass-panel p-6 rounded-xl flex flex-col">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-brand-primary" />
            Asset Allocation
          </h3>
          <div className="flex-grow" style={{ minHeight: '300px', height: '300px' }}>
            {investments.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <RePieChart>
                  <Pie
                    data={allocationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {allocationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ReTooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ backgroundColor: 'rgba(24, 24, 27, 0.9)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                  />
                  <Legend />
                </RePieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-light-text-secondary dark:text-dark-text-secondary opacity-50">
                <PieChart className="w-12 h-12 mb-2" />
                <p>No investment data</p>
              </div>
            )}
          </div>
        </div>

        {/* AI Analysis Section */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-xl">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-500" />
            AI Portfolio Insights
          </h3>

          {aiAnalysis ? (
            <div className="prose dark:prose-invert max-w-none text-sm">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ node, ...props }: any) => <h1 className="text-xl font-bold mb-3 text-light-text dark:text-dark-text" {...props} />,
                  h2: ({ node, ...props }: any) => <h2 className="text-lg font-bold mb-2 mt-4 text-light-text dark:text-dark-text" {...props} />,
                  h3: ({ node, ...props }: any) => <h3 className="text-md font-bold mb-2 mt-3 text-light-text dark:text-dark-text" {...props} />,
                  p: ({ node, ...props }: any) => <p className="mb-2 text-light-text dark:text-dark-text leading-relaxed" {...props} />,
                  ul: ({ node, ...props }: any) => <ul className="list-disc pl-5 mb-2 space-y-1 text-light-text dark:text-dark-text" {...props} />,
                  li: ({ node, ...props }: any) => <li className="pl-1" {...props} />,
                  strong: ({ node, ...props }: any) => <strong className="font-semibold text-brand-primary dark:text-brand-secondary" {...props} />,
                }}
              >
                {aiAnalysis}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="h-[300px] flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
              <Brain className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
              <h4 className="text-lg font-medium text-light-text dark:text-dark-text mb-2">Unlock AI Insights</h4>
              <p className="text-light-text-secondary dark:text-dark-text-secondary max-w-md mb-6">
                Get personalized analysis, risk assessment, and growth recommendations powered by Gemini Pro.
              </p>
              <button
                onClick={handleAIAnalyze}
                disabled={investments.length === 0}
                className="px-6 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full font-medium hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors disabled:opacity-50"
              >
                Generate Analysis
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Investment List */}
      <div className="glass-panel rounded-xl overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h3 className="text-lg font-semibold">Your Assets</h3>
          <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">{investments.length} items</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th className="py-3 px-6 font-semibold text-light-text-secondary dark:text-dark-text-secondary">Asset Name</th>
                <th className="py-3 px-6 font-semibold text-light-text-secondary dark:text-dark-text-secondary">Type</th>
                <th className="py-3 px-6 font-semibold text-light-text-secondary dark:text-dark-text-secondary text-right">Invested</th>
                <th className="py-3 px-6 font-semibold text-light-text-secondary dark:text-dark-text-secondary text-right">Current Value</th>
                <th className="py-3 px-6 font-semibold text-light-text-secondary dark:text-dark-text-secondary text-right">Profit/Loss</th>
                <th className="py-3 px-6 font-semibold text-light-text-secondary dark:text-dark-text-secondary text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {investments.length > 0 ? (
                investments.map((inv) => {
                  const profit = inv.currentValue - inv.investedAmount;
                  const profitPercent = inv.investedAmount > 0 ? (profit / inv.investedAmount) * 100 : 0;

                  return (
                    <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="py-3 px-6 font-medium">{inv.name}</td>
                      <td className="py-3 px-6">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                          {inv.type}
                        </span>
                      </td>
                      <td className="py-3 px-6 text-right font-mono">{formatCurrency(inv.investedAmount)}</td>
                      <td className="py-3 px-6 text-right font-mono font-medium">{formatCurrency(inv.currentValue)}</td>
                      <td className="py-3 px-6 text-right">
                        <div className={`flex flex-col items-end ${profit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          <span className="font-medium">{profit >= 0 ? '+' : ''}{formatCurrency(profit)}</span>
                          <span className="text-xs opacity-80">{profitPercent.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-6 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleEdit(inv)}
                            className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(inv.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-light-text-secondary dark:text-dark-text-secondary">
                    No investments added yet. Click "Add Investment" to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-xl shadow-2xl animate-slideUp">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-bold gradient-text">{editingId ? 'Edit Investment' : 'New Investment'}</h2>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Asset Name</label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-brand-primary outline-none transition-all"
                  placeholder="e.g. Apple Stock, Bitcoin"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-brand-primary outline-none transition-all"
                  >
                    {INVESTMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Date</label>
                  <input
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
                  <label className="block text-sm font-medium mb-1">Invested Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">₹</span>
                    <input
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
                  <label className="block text-sm font-medium mb-1">Current Value</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">₹</span>
                    <input
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

              <div>
                <label className="block text-sm font-medium mb-1">Notes (Optional)</label>
                <textarea
                  name="notes"
                  rows={3}
                  value={formData.notes}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-brand-primary outline-none transition-all"
                  placeholder="Strategy, goals, etc."
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 rounded-lg bg-brand-primary text-white hover:bg-brand-primary/90 transition-colors shadow-lg shadow-brand-primary/20"
                >
                  {editingId ? 'Update Asset' : 'Add Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvestmentPage;