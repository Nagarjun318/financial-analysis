import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  X,
  Sparkles,
  Settings,
  Activity
} from 'lucide-react';
import {
  PieChart as RePieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  Legend
} from 'recharts';
import { callGeminiAPI, GEMINI_MODELS, suggestInvestmentDetails, GeminiModel } from '../services/geminiService';
import { formatCurrency } from '../utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { supabase } from '../services/supabaseClient';
import { extractSymbol, fetchRealTimePrice, getRefreshInterval, updateInvestmentValue } from '../services/marketDataService';

// --- Types ---
interface Investment {
  id: string;
  name: string;
  type: 'Stock' | 'Mutual Fund' | 'Crypto' | 'Gold' | 'Real Estate' | 'Bond' | 'ETF' | 'Other';
  investedAmount: number;
  currentValue: number;
  date: string;
  notes?: string;
  quantity?: number;
  symbol?: string;
  lastUpdated?: string;
  autoRefresh?: boolean;
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

interface InvestmentPageProps {
  userId?: string;
}

const InvestmentPage: React.FC<InvestmentPageProps> = ({ userId }) => {
  // --- State ---
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSuggestingDetails, setIsSuggestingDetails] = useState(false);
  const [selectedModel, setSelectedModel] = useState<GeminiModel>(GEMINI_MODELS.FLASH_LITE);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [selectedAnalyzeModel, setSelectedAnalyzeModel] = useState<GeminiModel>(GEMINI_MODELS.PRO_LATEST);
  const [showAnalyzeModelSelector, setShowAnalyzeModelSelector] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);

  const modelSelectorRef = useRef<HTMLDivElement>(null);
  const analyzeModelSelectorRef = useRef<HTMLDivElement>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Form State
  const [formData, setFormData] = useState<Omit<Investment, 'id'>>({
    name: '',
    type: 'Stock',
    investedAmount: 0,
    currentValue: 0,
    date: new Date().toISOString().split('T')[0],
    notes: '',
    quantity: undefined,
    symbol: undefined
  });

  // --- Effects ---
  // Load investments from Supabase
  useEffect(() => {
    loadInvestments();
  }, [userId]);

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

  // Click outside to close analyze model selector
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (analyzeModelSelectorRef.current && !analyzeModelSelectorRef.current.contains(event.target as Node)) {
        setShowAnalyzeModelSelector(false);
      }
    };

    if (showAnalyzeModelSelector) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showAnalyzeModelSelector]);

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
          investments.map((inv: Investment) => ({
            name: inv.name,
            type: inv.type,
            investedAmount: inv.investedAmount,
            currentValue: inv.currentValue
          })),
          selectedModel
        );

        // Update form fields with AI suggestions
        const detectedSymbol = extractSymbol(formData.name, suggested.type);
        setFormData((prev: Omit<Investment, 'id'>) => ({
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
  }, [formData.name, editingId]);

  const loadInvestments = async () => {
    try {
      setIsLoading(true);
      setError(null);
      if (!supabase) {
        throw new Error('Database connection not available');
      }
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
        notes: item.notes || '',
        quantity: item.quantity || undefined,
        symbol: item.symbol || undefined,
        lastUpdated: item.last_updated || undefined,
        autoRefresh: item.auto_refresh || false
      }));

      setInvestments(transformedData);
    } catch (err) {
      console.error('Error loading investments:', err);
      setError('Failed to load investments');
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh real-time prices
  const refreshPrices = async () => {
    if (investments.length === 0) return;
    
    setIsRefreshing(true);
    try {
      const updates: Array<{ id: string; currentValue: number; lastUpdated: string }> = [];
      
      for (const investment of investments) {
        // Refresh crypto, gold, stocks, ETFs, and mutual funds
        if (investment.type === 'Crypto' || investment.type === 'Gold' || 
            investment.type === 'Stock' || investment.type === 'ETF' || 
            investment.type === 'Mutual Fund') {
          // Calculate new value based on quantity OR invested amount + market growth
          const newValue = await updateInvestmentValue(
            {
              name: investment.name,
              type: investment.type,
              investedAmount: investment.investedAmount,
              date: investment.date
            },
            investment.quantity
          );
          
          if (newValue !== null) {
            updates.push({
              id: investment.id,
              currentValue: newValue,
              lastUpdated: new Date().toISOString()
            });
          }
        }
      }
      
      // Update database and local state
      if (updates.length > 0 && supabase) {
        for (const update of updates) {
          await supabase
            .from('investments')
            .update({ current_value: update.currentValue, last_updated: update.lastUpdated })
            .eq('id', update.id);
        }
        
        // Reload investments to get updated values
        await loadInvestments();
        setLastRefreshTime(new Date());
      }
    } catch (error) {
      console.error('Error refreshing prices:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefreshEnabled && investments.length > 0) {
      // Initial refresh
      refreshPrices();
      
      // Set up interval (use shortest interval from all investments)
      const intervals = investments
        .filter((inv: Investment) => 
          inv.type === 'Crypto' || inv.type === 'Gold' || 
          inv.type === 'Stock' || inv.type === 'ETF' || 
          inv.type === 'Mutual Fund'
        )
        .map((inv: Investment) => getRefreshInterval(inv.type));
      
      const minInterval = intervals.length > 0 ? Math.min(...intervals) : 60000;
      
      refreshIntervalRef.current = setInterval(() => {
        refreshPrices();
      }, minInterval);
      
      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
  }, [autoRefreshEnabled, investments.length]);

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
      if (!supabase) {
        throw new Error('Database connection not available');
      }
      
      const dbData = {
        name: formData.name,
        type: formData.type,
        invested_amount: formData.investedAmount,
        current_value: formData.currentValue,
        date: formData.date,
        notes: formData.notes || null,
        quantity: formData.quantity || null,
        symbol: formData.symbol || null
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
      notes: '',
      quantity: undefined,
      symbol: undefined
    });
  };

  const handleEdit = (inv: Investment) => {
    setFormData({
      name: inv.name,
      type: inv.type,
      investedAmount: inv.investedAmount,
      currentValue: inv.currentValue,
      date: inv.date,
      notes: inv.notes,
      quantity: inv.quantity,
      symbol: inv.symbol
    });
    setEditingId(inv.id);
    setIsAddModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this investment?')) {
      try {
        if (!supabase) {
          throw new Error('Database connection not available');
        }
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

      const response = await callGeminiAPI(prompt, selectedAnalyzeModel);
      setAiAnalysis(response.text);
    } catch (error) {
      console.error('AI Analysis failed', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getModelDisplayName = (model: GeminiModel): string => {
    switch (model) {
      case GEMINI_MODELS.PRO_LATEST: return 'Pro';
      case GEMINI_MODELS.FLASH_LATEST: return 'Flash';
      case GEMINI_MODELS.FLASH_2_0: return 'Flash 2.0';
      case GEMINI_MODELS.FLASH_LITE: return 'Flash Lite';
      case GEMINI_MODELS.GEMMA_3: return 'Gemma 3';
      default: return 'Flash Lite';
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
          {/* AI Analyze Model Selector */}
          <div className="relative" ref={analyzeModelSelectorRef}>
            <button
              type="button"
              onClick={() => setShowAnalyzeModelSelector(!showAnalyzeModelSelector)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
              title={`AI Model: ${getModelDisplayName(selectedAnalyzeModel)}`}
            >
              <Settings className="w-4 h-4" />
              {getModelDisplayName(selectedAnalyzeModel)}
            </button>

            {showAnalyzeModelSelector && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-50">
                {Object.values(GEMINI_MODELS).map((model) => (
                  <button
                    key={model}
                    type="button"
                    onClick={() => {
                      setSelectedAnalyzeModel(model);
                      setShowAnalyzeModelSelector(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                      selectedAnalyzeModel === model
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

          <button
            onClick={handleAIAnalyze}
            disabled={isAnalyzing || investments.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:opacity-90 transition-all disabled:opacity-50 shadow-lg shadow-purple-500/20"
          >
            {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
            {isAnalyzing ? 'Analyzing...' : 'AI Analysis'}
          </button>

          {/* Real-time Price Refresh */}
          <button
            onClick={refreshPrices}
            disabled={isRefreshing || investments.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:opacity-90 transition-all disabled:opacity-50 shadow-lg shadow-green-500/20"
            title="Refresh real-time prices (Crypto & Gold)"
          >
            {isRefreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {isRefreshing ? 'Updating...' : 'Refresh Prices'}
          </button>

          {/* Auto-refresh Toggle */}
          <button
            onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              autoRefreshEnabled
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/20'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
            }`}
            title={autoRefreshEnabled ? 'Auto-refresh enabled' : 'Enable auto-refresh'}
          >
            <Activity className="w-4 h-4" />
            {autoRefreshEnabled ? 'Live' : 'Auto-Refresh'}
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

      {/* Last Refresh Time Indicator */}
      {lastRefreshTime && (
        <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <RefreshCw className="w-3 h-3" />
          <span>Last updated: {lastRefreshTime.toLocaleTimeString()}</span>
          {autoRefreshEnabled && <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
            <Activity className="w-3 h-3 animate-pulse" />
            Auto-refresh active
          </span>}
        </div>
      )}

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
                    {allocationData.map((entry: { name: string; value: number }, index: number) => (
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
                <th className="py-3 px-6 font-semibold text-light-text-secondary dark:text-dark-text-secondary">Quantity</th>
                <th className="py-3 px-6 font-semibold text-light-text-secondary dark:text-dark-text-secondary">Symbol</th>
                <th className="py-3 px-6 font-semibold text-light-text-secondary dark:text-dark-text-secondary text-right">Invested</th>
                <th className="py-3 px-6 font-semibold text-light-text-secondary dark:text-dark-text-secondary text-right">Current Value</th>
                <th className="py-3 px-6 font-semibold text-light-text-secondary dark:text-dark-text-secondary text-right">Profit/Loss</th>
                <th className="py-3 px-6 font-semibold text-light-text-secondary dark:text-dark-text-secondary">Last Updated</th>
                <th className="py-3 px-6 font-semibold text-light-text-secondary dark:text-dark-text-secondary text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {investments.length > 0 ? (
                investments.map((inv: Investment) => {
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
                      <td className="py-3 px-6 font-mono text-sm">
                        {inv.quantity ? inv.quantity.toLocaleString() : '-'}
                      </td>
                      <td className="py-3 px-6">
                        {inv.symbol ? (
                          <span className="px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-mono">
                            {inv.symbol}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="py-3 px-6 text-right font-mono">{formatCurrency(inv.investedAmount)}</td>
                      <td className="py-3 px-6 text-right font-mono font-medium">{formatCurrency(inv.currentValue)}</td>
                      <td className="py-3 px-6 text-right">
                        <div className={`flex flex-col items-end ${profit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          <span className="font-medium">{profit >= 0 ? '+' : ''}{formatCurrency(profit)}</span>
                          <span className="text-xs opacity-80">{profitPercent.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-6 text-xs text-gray-500 dark:text-gray-400">
                        {inv.lastUpdated ? (
                          <div className="flex flex-col">
                            <span>{new Date(inv.lastUpdated).toLocaleDateString()}</span>
                            <span className="opacity-70">{new Date(inv.lastUpdated).toLocaleTimeString()}</span>
                          </div>
                        ) : '-'}
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
              <div className="flex items-center gap-2">
                {/* Model Selector */}
                {!editingId && (
                  <div className="relative" ref={modelSelectorRef}>
                    <button
                      type="button"
                      onClick={() => setShowModelSelector(!showModelSelector)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title={`AI Model: ${getModelDisplayName(selectedModel)}`}
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
                )}
                <button
                  type="button"
                  onClick={closeModal}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                  Asset Name
                  {isSuggestingDetails && (
                    <span className="flex items-center gap-1 text-brand-primary animate-pulse">
                      <Sparkles className="h-3 w-3" />
                      <span className="text-[10px] font-normal">AI suggesting...</span>
                    </span>
                  )}
                </label>
                <input
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
                  <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                    Type
                    {isSuggestingDetails && <Sparkles className="h-3 w-3 text-brand-primary animate-pulse" />}
                  </label>
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
                  <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                    Invested Amount
                    {isSuggestingDetails && <Sparkles className="h-3 w-3 text-brand-primary animate-pulse" />}
                  </label>
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
                  <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                    Current Value
                    {isSuggestingDetails && <Sparkles className="h-3 w-3 text-brand-primary animate-pulse" />}
                  </label>
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

              {/* Quantity and Symbol fields for real-time tracking */}
              {(formData.type === 'Crypto' || formData.type === 'Gold' || 
                formData.type === 'Stock' || formData.type === 'ETF' || 
                formData.type === 'Mutual Fund') && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                      Quantity
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">Optional</span>
                    </label>
                    <input
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
                    <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                      Symbol
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">Optional</span>
                      {isSuggestingDetails && <Sparkles className="h-3 w-3 text-brand-primary animate-pulse" />}
                    </label>
                    <input
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
                <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                  Notes (Optional)
                  {isSuggestingDetails && <Sparkles className="h-3 w-3 text-brand-primary animate-pulse" />}
                </label>
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