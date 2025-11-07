import React from 'react';
import { Summary as SummaryType } from '../types';
import { ArrowUpCircle, ArrowDownCircle, PiggyBank } from 'lucide-react';
import { formatCurrency } from '../utils';

interface SummaryProps {
  summary: SummaryType;
}

const Summary: React.FC<SummaryProps> = ({ summary }) => {
  const netSavingsColor = summary.netSavings >= 0 ? 'text-brand-secondary' : 'text-red-500';

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-light-card dark:bg-dark-card p-6 rounded-xl shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
        <div className="flex items-center justify-between">
          <p className="text-light-text-secondary dark:text-dark-text-secondary">Total Income</p>
          <ArrowUpCircle className="h-8 w-8 text-green-500" />
        </div>
        <p className="text-3xl font-bold mt-2 text-green-500">{formatCurrency(summary.totalIncome)}</p>
      </div>

      <div className="bg-light-card dark:bg-dark-card p-6 rounded-xl shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
        <div className="flex items-center justify-between">
          <p className="text-light-text-secondary dark:text-dark-text-secondary">Total Expenses</p>
          <ArrowDownCircle className="h-8 w-8 text-red-500" />
        </div>
        <p className="text-3xl font-bold mt-2 text-red-500">{formatCurrency(summary.totalExpenses)}</p>
      </div>

      <div className="bg-light-card dark:bg-dark-card p-6 rounded-xl shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
        <div className="flex items-center justify-between">
          <p className="text-light-text-secondary dark:text-dark-text-secondary">Net Savings</p>
          <PiggyBank className={`h-8 w-8 ${netSavingsColor}`} />
        </div>
        <p className={`text-3xl font-bold mt-2 ${netSavingsColor}`}>{formatCurrency(summary.netSavings)}</p>
      </div>
    </div>
  );
};

export default Summary;