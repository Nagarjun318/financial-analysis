import React from 'react';
import { Summary as SummaryType } from '../types.ts';
import { ArrowUpCircle, ArrowDownCircle, PiggyBank } from 'lucide-react';
import { formatCurrency } from '../utils.ts';

interface SummaryProps {
  summary: SummaryType;
}

const Summary: React.FC<SummaryProps> = ({ summary }) => {
  const netSavingsColor = summary.netSavings >= 0 ? 'text-brand-secondary' : 'text-red-500';

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500/90 via-teal-500/80 to-cyan-500/80 dark:from-emerald-600/70 dark:via-teal-700/70 dark:to-cyan-700/70 backdrop-blur-sm p-6 rounded-2xl shadow-lg transition-all duration-500 hover:shadow-xl hover:-translate-y-1">
        <div className="absolute inset-0 opacity-30 mix-blend-overlay animate-[cardShift_14s_linear_infinite] motion-reduce:animate-none" style={{background:'linear-gradient(110deg, rgba(255,255,255,0.25), rgba(255,255,255,0.05), rgba(255,255,255,0.2))'}}></div>
        <div className="flex items-center justify-between">
          <p className="text-light-text-secondary dark:text-dark-text-secondary">Total Income</p>
          <ArrowUpCircle className="h-8 w-8 text-green-500" />
        </div>
        <p className="text-3xl font-extrabold mt-2 text-white drop-shadow-sm">{formatCurrency(summary.totalIncome)}</p>
      </div>

      <div className="relative overflow-hidden bg-gradient-to-br from-rose-500/90 via-pink-500/80 to-fuchsia-500/80 dark:from-rose-600/70 dark:via-pink-700/70 dark:to-fuchsia-700/70 backdrop-blur-sm p-6 rounded-2xl shadow-lg transition-all duration-500 hover:shadow-xl hover:-translate-y-1">
        <div className="absolute inset-0 opacity-25 mix-blend-overlay animate-[cardShift_18s_linear_infinite] motion-reduce:animate-none" style={{background:'linear-gradient(140deg, rgba(255,255,255,0.3), rgba(255,255,255,0.08), rgba(255,255,255,0.25))'}}></div>
        <div className="flex items-center justify-between">
          <p className="text-light-text-secondary dark:text-dark-text-secondary">Total Expenses</p>
          <ArrowDownCircle className="h-8 w-8 text-white/90 drop-shadow" />
        </div>
        <p className="text-3xl font-extrabold mt-2 text-white drop-shadow-sm">{formatCurrency(summary.totalExpenses)}</p>
      </div>

      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-500/90 via-violet-500/80 to-purple-500/80 dark:from-indigo-600/70 dark:via-violet-700/70 dark:to-purple-700/70 backdrop-blur-sm p-6 rounded-2xl shadow-lg transition-all duration-500 hover:shadow-xl hover:-translate-y-1">
        <div className="absolute inset-0 opacity-25 mix-blend-overlay animate-[cardShift_20s_linear_infinite] motion-reduce:animate-none" style={{background:'linear-gradient(160deg, rgba(255,255,255,0.35), rgba(255,255,255,0.07), rgba(255,255,255,0.25))'}}></div>
        <div className="flex items-center justify-between">
          <p className="text-light-text-secondary dark:text-dark-text-secondary">Net Savings</p>
          <PiggyBank className={`h-8 w-8 text-white/90 drop-shadow`} />
        </div>
        <p className={`text-3xl font-extrabold mt-2 text-white drop-shadow-sm`}>{formatCurrency(summary.netSavings)}</p>
      </div>
    </div>
  );
};

export default Summary;