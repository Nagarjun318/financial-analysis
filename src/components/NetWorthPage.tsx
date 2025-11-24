import React from 'react';
import { summarizeNetWorth, buildNetWorthTimeline, forecastLiability, deriveAssets, deriveLiabilities, Liability, Asset, getCurrentPrincipal, getPrincipal } from '../domain/networth/calculateNetWorth';
import { Transaction } from '../types';
import { Wallet, TrendingUp, TrendingDown, Calendar, Percent, DollarSign, Plus, Trash2 } from 'lucide-react';
import { useAssets } from '../hooks/useAssets';
import { useLiabilities } from '../hooks/useLiabilities';
import { AIInsightsPanel } from './AIInsightsPanel';
import { AIForecastChart } from './AIForecastChart';

import { NetWorthAdvisorChat } from './NetWorthAdvisorChat';
import { NetWorthEditModal } from './NetWorthEditModal';
import { AIMarketValue } from './AIMarketValue';
import { AIDebtOptimizer } from './AIDebtOptimizer';

interface Props {
  transactions: Transaction[];
  userId: string;
}

export const NetWorthPage: React.FC<Props> = ({
  transactions,
  userId
}) => {
  // Fetch from database
  const { assets, isLoading: assetsLoading, insertAsset, updateAsset, deleteAsset } = useAssets(userId);
  const { liabilities, isLoading: liabilitiesLoading, insertLiability, updateLiability, deleteLiability } = useLiabilities(userId);

  // Modal State
  const [chatPanelWidth, setChatPanelWidth] = React.useState(0);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [modalType, setModalType] = React.useState('asset' as 'asset' | 'liability');
  const [modalData, setModalData] = React.useState<any>(null);

  const isLoading = assetsLoading || liabilitiesLoading;

  const enrichedLiabilities = React.useMemo(() => deriveLiabilities(
    transactions.map(t => ({ date: t.date, description: t.description, amount: t.amount, type: t.type, category: t.category })),
    liabilities
  ), [transactions, liabilities]);

  const enrichedAssets = React.useMemo(() => deriveAssets(
    transactions.map(t => ({ date: t.date, description: t.description, amount: t.amount, type: t.type, category: t.category })),
    assets,
    enrichedLiabilities // Pass enriched liabilities (includes auto-tracked loans)
  ), [transactions, assets, enrichedLiabilities]);

  const summary = React.useMemo(() => summarizeNetWorth(
    enrichedAssets,
    enrichedLiabilities,
    transactions.map(t => ({ date: t.date, description: t.description, amount: t.amount, type: t.type, category: t.category }))
  ), [enrichedAssets, enrichedLiabilities, transactions]);

  const timeline = React.useMemo(() => buildNetWorthTimeline(
    transactions.map(t => ({ date: t.date, description: t.description, amount: t.amount, type: t.type, category: t.category })),
    enrichedAssets.filter((a: Asset) => a.id !== 'cash-auto'),
    enrichedLiabilities
  ), [transactions, enrichedAssets, enrichedLiabilities]);

  const handleAddClick = (type: 'asset' | 'liability') => {
    setModalType(type);
    setModalData(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (type: 'asset' | 'liability', item: any) => {
    // Prevent editing auto-tracked items via modal (they have their own logic or are read-only)
    if (item.id.startsWith('auto-')) return;

    setModalType(type);
    setModalData(item);
    setIsModalOpen(true);
  };

  const handleModalSave = async (data: any) => {
    try {
      if (modalType === 'asset') {
        if (data.id) {
          await updateAsset(data.id, { ...data, lastUpdated: new Date().toISOString().split('T')[0] });
        } else {
          await insertAsset(data);
        }
      } else {
        if (data.id) {
          await updateLiability(data.id, data);
        } else {
          await insertLiability(data);
        }
      }
    } catch (error) {
      console.error('Failed to save:', error);
      throw error;
    }
  };

  const handleModalDelete = async (id: string) => {
    try {
      if (modalType === 'asset') {
        await deleteAsset(id);
      } else {
        await deleteLiability(id);
      }
    } catch (error) {
      console.error('Failed to delete:', error);
      throw error;
    }
  };

  async function convertAutoLiabilityToManual(liability: Liability) {
    try {
      const principal = liability.principal || liability.openingPrincipal || 0;
      // Create a new manual entry with the auto-tracked data
      await insertLiability({
        name: liability.name.replace(' (Auto)', ''),
        type: liability.type,
        principal: principal,
        interestRateAnnual: liability.interestRateAnnual,
        monthlyEMI: liability.monthlyEMI,
        extraPaymentMonthly: liability.extraPaymentMonthly || 0,
        startDate: liability.startDate
      });
    } catch (err) {
      console.error('Failed to convert liability:', err);
    }
  }



  async function convertAutoAssetToManual(asset: Asset) {
    try {
      // Create a new manual entry with the auto-tracked/suggested data
      await insertAsset({
        name: asset.name.replace(' (Auto)', '').replace(' (Suggested)', ''),
        type: asset.type,
        currentValue: asset.currentValue,
        lastUpdated: asset.lastUpdated || new Date().toISOString().split('T')[0],
        createdOn: asset.createdOn || new Date().toISOString().split('T')[0]
      });
    } catch (err) {
      console.error('Failed to convert asset:', err);
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
  };

  return (
    <div className="max-w-7xl mx-auto" style={{ marginRight: `${chatPanelWidth}px`, transition: 'margin-right 0.3s ease-in-out' }}>
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-lg font-medium text-gray-600 dark:text-gray-300 animate-pulse">Loading net worth data...</p>
        </div>
      ) : (
        <>
          <div className="mb-8">
            <h1 className="text-3xl font-bold gradient-text mb-2">Net Worth & Liabilities</h1>
            <p className="text-gray-600 dark:text-gray-400">Track your assets, liabilities, and overall financial health</p>
          </div>

          {/* AI Insights Panel */}
          <AIInsightsPanel
            assets={enrichedAssets}
            liabilities={enrichedLiabilities}
            timeline={timeline}
          />

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="glass-panel p-6 rounded-xl relative z-10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Total Assets</span>
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div className="relative group">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400 cursor-help">
                  {formatCurrency(summary.totalAssets)}
                </div>
                {enrichedAssets.length > 0 && (
                  <div className="hidden group-hover:block absolute left-0 top-full mt-2 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 min-w-80">
                    <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">Asset Breakdown:</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 space-y-2">
                      {enrichedAssets.map((a: Asset) => (
                        <div key={a.id} className="flex justify-between gap-4 pb-2 border-b border-gray-200 dark:border-gray-700 last:border-0">
                          <span className="truncate">{a.name}</span>
                          <span className="font-mono whitespace-nowrap font-medium">{formatCurrency(a.currentValue)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="glass-panel p-6 rounded-xl relative z-10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Total Liabilities</span>
                <TrendingDown className="h-5 w-5 text-red-500" />
              </div>
              <div className="relative group">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400 cursor-help">
                  {formatCurrency(summary.totalLiabilities)}
                </div>
                {enrichedLiabilities.length > 0 && (
                  <div className="hidden group-hover:block absolute left-0 top-full mt-2 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 min-w-80">
                    <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">Liability Breakdown:</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 space-y-2">
                      {enrichedLiabilities.map((l: Liability) => {
                        const currentBalance = getCurrentPrincipal(l, transactions.map(t => ({ date: t.date, description: t.description, amount: t.amount, type: t.type, category: t.category })));
                        return (
                          <div key={l.id} className="flex justify-between gap-4 pb-2 border-b border-gray-200 dark:border-gray-700 last:border-0">
                            <span className="truncate">{l.name}</span>
                            <span className="font-mono whitespace-nowrap font-medium">{formatCurrency(currentBalance)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="glass-panel p-6 rounded-xl relative z-10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Net Worth</span>
                <Wallet className="h-5 w-5 text-indigo-500" />
              </div>
              <div className="relative group">
                <div className={`text-2xl font-bold cursor-help ${summary.netWorth >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatCurrency(summary.netWorth)}
                </div>
                <div className="hidden group-hover:block absolute left-0 top-full mt-2 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 min-w-72">
                  <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">Calculation:</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 space-y-2">
                    <div className="flex justify-between gap-4 pb-2">
                      <span>Total Assets</span>
                      <span className="font-mono font-medium text-green-600 dark:text-green-400">{formatCurrency(summary.totalAssets)}</span>
                    </div>
                    <div className="flex justify-between gap-4 pb-2">
                      <span>Total Liabilities</span>
                      <span className="font-mono font-medium text-red-600 dark:text-red-400">- {formatCurrency(summary.totalLiabilities)}</span>
                    </div>
                    <div className="flex justify-between gap-4 pt-2 border-t border-gray-300 dark:border-gray-600">
                      <span className="font-semibold">Net Worth</span>
                      <span className={`font-mono font-bold ${summary.netWorth >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-red-600 dark:text-red-400'}`}>
                        {formatCurrency(summary.netWorth)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-panel p-6 rounded-xl relative z-10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Debt Ratio</span>
                <Percent className="h-5 w-5 text-orange-500" />
              </div>
              <div className="relative group">
                <div className={`text-2xl font-bold cursor-help ${summary.debtRatio < 0.3 ? 'text-green-600 dark:text-green-400' : summary.debtRatio < 0.5 ? 'text-orange-600 dark:text-orange-400' : 'text-red-600 dark:text-red-400'}`}>
                  {(summary.debtRatio * 100).toFixed(1)}%
                </div>
                <div className="hidden group-hover:block absolute left-0 top-full mt-2 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 min-w-80">
                  <div className="text-xs text-gray-600 dark:text-gray-400 space-y-2">
                    <div className="flex justify-between gap-4 pb-2">
                      <span>Total Liabilities</span>
                      <span className="font-mono font-medium">{formatCurrency(summary.totalLiabilities)}</span>
                    </div>
                    <div className="flex justify-between gap-4 pb-2">
                      <span>Total Assets</span>
                      <span className="font-mono font-medium">{formatCurrency(summary.totalAssets)}</span>
                    </div>
                    <div className="flex justify-between gap-4 pb-2 border-t border-gray-300 dark:border-gray-600 pt-2">
                      <span className="font-semibold">Formula</span>
                      <span className="font-mono font-medium">
                        ({formatCurrency(summary.totalLiabilities)} ÷ {formatCurrency(summary.totalAssets)}) × 100
                      </span>
                    </div>
                    <div className="flex justify-between gap-4 pt-2 border-t border-gray-300 dark:border-gray-600">
                      <span className="font-semibold">Debt Ratio</span>
                      <span className={`font-mono font-bold ${summary.debtRatio < 0.3 ? 'text-green-600 dark:text-green-400' : summary.debtRatio < 0.5 ? 'text-orange-600 dark:text-orange-400' : 'text-red-600 dark:text-red-400'}`}>
                        {(summary.debtRatio * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 text-xs italic text-gray-500 dark:text-gray-400">
                      <div className="mb-1">• &lt; 30%: Healthy</div>
                      <div className="mb-1">• 30-50%: Moderate</div>
                      <div>• &gt; 50%: High Risk</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline Table */}
          <div className="glass-panel p-6 rounded-xl mb-8">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-brand-primary" />
              Monthly Timeline
            </h3>
            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800 z-20">
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700 dark:text-gray-300">Month</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm text-gray-700 dark:text-gray-300">Assets</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm text-gray-700 dark:text-gray-300">Liabilities</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm text-gray-700 dark:text-gray-300">Net Worth</th>
                  </tr>
                </thead>
                <tbody>
                  {timeline.map((row: any) => (
                    <React.Fragment key={row.month}>
                      <tr className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="py-3 px-4 text-sm font-medium">{row.month}</td>
                        <td className="py-3 px-4 text-sm text-right text-green-600 dark:text-green-400 relative group">
                          <span className="cursor-help">{formatCurrency(row.totalAssets)}</span>
                          {row.assetBreakdown && Object.keys(row.assetBreakdown).length > 0 && (
                            <div className="hidden group-hover:block absolute right-0 top-full mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-3 min-w-64">
                              <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Asset Breakdown:</div>
                              <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                {Object.entries(row.assetBreakdown).map(([name, amount]: [string, any]) => (
                                  <div key={name} className="flex justify-between gap-4">
                                    <span className="truncate">{name}</span>
                                    <span className="font-mono whitespace-nowrap">{formatCurrency(amount)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-right text-red-600 dark:text-red-400 relative group">
                          <span className="cursor-help">{formatCurrency(row.totalLiabilities)}</span>
                          {row.liabilityBreakdown && Object.keys(row.liabilityBreakdown).length > 0 && (
                            <div className="hidden group-hover:block absolute right-0 top-full mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-3 min-w-64">
                              <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Liability Breakdown:</div>
                              <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                {Object.entries(row.liabilityBreakdown).map(([name, amount]: [string, any]) => (
                                  <div key={name} className="flex justify-between gap-4">
                                    <span className="truncate">{name}</span>
                                    <span className="font-mono whitespace-nowrap">{formatCurrency(amount)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </td>
                        <td className={`py-3 px-4 text-sm text-right font-semibold ${row.netWorth >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-red-600 dark:text-red-400'}`}>
                          {formatCurrency(row.netWorth)}
                        </td>
                      </tr>
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* AI Forecast Chart */}
          <AIForecastChart
            timeline={timeline}
            liabilities={enrichedLiabilities}
          />

          {/* Liabilities Section */}
          <div className="glass-panel p-6 rounded-xl mb-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-500" />
                Liabilities
              </h3>
              <button
                onClick={() => handleAddClick('liability')}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Liability
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {enrichedLiabilities
                .sort((a: Liability, b: Liability) => {
                  // Sort completed loans to the end
                  const aCompleted = a.name.includes('(Completed)');
                  const bCompleted = b.name.includes('(Completed)');
                  if (aCompleted && !bCompleted) return 1;
                  if (!aCompleted && bCompleted) return -1;
                  return 0;
                })
                .map((l: Liability) => {
                  const forecast = forecastLiability(l, transactions);
                  const isAutoTracked = l.id.startsWith('auto-loan-');
                  const isCompleted = l.name.includes('(Completed)');
                  return (
                    <div key={l.id} className={`border rounded-lg p-4 transition-colors ${isCompleted
                      ? 'border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-900/20'
                      : isAutoTracked
                        ? 'border-purple-300 dark:border-purple-700 bg-purple-50/50 dark:bg-purple-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-400'
                      }`}>
                      <div className="flex items-center gap-3 mb-3">
                        {isAutoTracked ? (
                          <div className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100">
                            {l.name}
                          </div>
                        ) : (
                          <div
                            onClick={() => handleEditClick('liability', l)}
                            className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-indigo-500 transition-colors flex items-center justify-between group/edit"
                          >
                            <span className="font-medium">{l.name}</span>
                            <span className="text-xs text-indigo-600 opacity-0 group-hover/edit:opacity-100 transition-opacity">Edit</span>
                          </div>
                        )}
                        {isAutoTracked && (
                          <button
                            onClick={() => convertAutoLiabilityToManual(l)}
                            className="px-3 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
                            title="Save to database and enable editing"
                          >
                            <Plus className="h-4 w-4" />
                            Save to DB
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3" onClick={() => !isAutoTracked && handleEditClick('liability', l)}>
                        <div className={!isAutoTracked ? "cursor-pointer" : ""}>
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Principal</label>
                          <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100">
                            {isAutoTracked
                              ? `₹${getCurrentPrincipal(l, transactions.map(t => ({ date: t.date, description: t.description, amount: t.amount, type: t.type, category: t.category }))).toLocaleString()}`
                              : `₹${l.principal.toLocaleString()}`
                            }
                          </div>
                        </div>
                        <div className={!isAutoTracked ? "cursor-pointer" : ""}>
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Rate (%)</label>
                          <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100">
                            {l.interestRateAnnual}%
                          </div>
                        </div>
                        <div className={!isAutoTracked ? "cursor-pointer" : ""}>
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Monthly EMI</label>
                          <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100">
                            ₹{l.monthlyEMI.toLocaleString()}
                          </div>
                        </div>
                        <div className={!isAutoTracked ? "cursor-pointer" : ""}>
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Extra Payment</label>
                          <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100">
                            ₹{(l.extraPaymentMonthly || 0).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                        {forecast.totalMonths && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Total Tenure: <strong className="text-gray-900 dark:text-gray-100">{forecast.totalMonths} months</strong>
                          </span>
                        )}
                        {forecast.monthsPaid !== undefined && (
                          <span className="flex items-center gap-1">
                            Paid: <strong className="text-green-600 dark:text-green-400">{forecast.monthsPaid} months</strong>
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          Remaining: <strong className="text-orange-600 dark:text-orange-400">{forecast.monthsRemaining === Infinity ? 'Uncertain' : `${forecast.monthsRemaining} months`}</strong>
                        </span>
                        <span className="flex items-center gap-1">
                          Payoff: <strong className="text-gray-900 dark:text-gray-100">{forecast.projectedPayoffDate}</strong>
                        </span>
                        {isAutoTracked && (
                          <span className="ml-auto text-purple-600 dark:text-purple-400 font-medium">Auto-tracked from transactions</span>
                        )}
                      </div>


                      {/* AI Debt Optimizer - Automatically shown for all active liabilities */}
                      {
                        !isCompleted && (
                          <AIDebtOptimizer
                            liabilityName={l.name}
                            liabilityType={l.type}
                            principal={l.principal}
                            interestRate={l.interestRateAnnual}
                            monthlyEMI={l.monthlyEMI}
                          />
                        )
                      }
                    </div>
                  );
                })}
              {enrichedLiabilities.length === 0 && (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">No liabilities found</p>
              )}
            </div>
          </div>

          {/* Assets Section */}
          <div className="glass-panel p-6 rounded-xl mb-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                Assets
              </h3>
              <button
                onClick={() => handleAddClick('asset')}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Asset
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {enrichedAssets.map((a: Asset) => {
                const isAutoTracked = a.id.startsWith('auto-');
                const isSuggested = a.isSuggested === true;
                return (
                  <div key={a.id} className={`border rounded-lg p-4 transition-colors ${isSuggested
                    ? 'border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/20'
                    : isAutoTracked
                      ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-400'
                    }`}>
                    <div className="flex items-center gap-3 mb-3">
                      {isAutoTracked || isSuggested ? (
                        <div className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100">
                          {a.name}
                        </div>
                      ) : (
                        <div
                          onClick={() => handleEditClick('asset', a)}
                          className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-green-500 transition-colors flex items-center justify-between group/edit"
                        >
                          <span className="font-medium">{a.name}</span>
                          <span className="text-xs text-green-600 opacity-0 group-hover/edit:opacity-100 transition-opacity">Edit</span>
                        </div>
                      )}
                      {isSuggested ? (
                        <button
                          onClick={() => convertAutoAssetToManual(a)}
                          className="px-3 py-2 text-sm bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors flex items-center gap-2"
                          title="Accept suggestion and save to database"
                        >
                          <Plus className="h-4 w-4" />
                          Accept
                        </button>
                      ) : isAutoTracked && (
                        a.id === 'cash-auto' ? (
                          <span className="px-3 py-2 text-xs text-indigo-600 dark:text-indigo-400 font-medium">Auto-calculated</span>
                        ) : (
                          <button
                            onClick={() => convertAutoAssetToManual(a)}
                            className="px-3 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-2"
                            title="Save to database and enable editing"
                          >
                            <Plus className="h-4 w-4" />
                            Save to DB
                          </button>
                        )
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3" onClick={() => !isAutoTracked && !isSuggested && handleEditClick('asset', a)}>
                      <div className={!isAutoTracked && !isSuggested ? "cursor-pointer" : ""}>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Type</label>
                        <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 capitalize">
                          {a.type}
                        </div>
                      </div>
                      <div className={!isAutoTracked && !isSuggested ? "cursor-pointer" : ""}>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Value</label>
                        <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100">
                          ₹{a.currentValue.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-3" onClick={() => !isAutoTracked && !isSuggested && handleEditClick('asset', a)}>
                      <div className={!isAutoTracked && !isSuggested ? "cursor-pointer" : ""}>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Created On</label>
                        <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100">
                          {a.createdOn || 'N/A'}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Last Updated</label>
                        <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-500 dark:text-gray-400">
                          {a.lastUpdated || 'N/A'}
                        </div>
                      </div>
                    </div>

                    {/* AI Market Value Estimate - Automatically shown for all assets except suggested ones */}
                    {!isSuggested && (
                      <AIMarketValue
                        assetName={a.name}
                        assetType={a.type}
                        currentValue={a.currentValue}
                      />
                    )}

                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      {isSuggested && (
                        <span className="ml-2 text-amber-600 dark:text-amber-400 block mt-1">
                          {a.type === 'property'
                            ? '💡 Auto-suggested based on property loan (estimated 1.27x loan amount)'
                            : '💡 Auto-suggested based on completed gold loan (estimated 1.33x loan amount)'
                          }
                        </span>
                      )}
                      {isAutoTracked && !isSuggested && <span className="ml-2 text-indigo-600 dark:text-indigo-400">(Auto-tracked)</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Asset Allocation */}
          <div className="glass-panel p-6 rounded-xl">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-brand-primary" />
              Asset Allocation
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {enrichedAssets.map((a: Asset) => {
                const percentage = ((a.currentValue / summary.totalAssets) * 100 || 0).toFixed(1);
                return (
                  <div key={a.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <span className="text-sm font-medium">{a.name}</span>
                    <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{percentage}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )
      }

      {/* AI Net Worth Advisor Chat */}
      <NetWorthAdvisorChat
        assets={enrichedAssets}
        liabilities={enrichedLiabilities}
        timeline={timeline}
        onOpenChange={setChatPanelWidth}
      />

      <NetWorthEditModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        type={modalType}
        initialData={modalData}
        onSave={handleModalSave}
        onDelete={handleModalDelete}
      />
    </div >
  );
};

export default NetWorthPage;
