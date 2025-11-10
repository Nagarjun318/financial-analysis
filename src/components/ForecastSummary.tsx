import React from 'react';
import { ForecastResult } from '../types';
import { formatCurrency } from '../utils';

interface ForecastSummaryProps {
  forecast?: ForecastResult;
}

export const ForecastSummary: React.FC<ForecastSummaryProps> = ({ forecast }) => {
  if (!forecast || !forecast.nextMonth) return null;
  const f = forecast.nextMonth;
  return (
    <div className="bg-light-card dark:bg-dark-card p-4 rounded-xl shadow-md">
      <h3 className="text-lg font-semibold mb-2">Next Month Forecast</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
        <div>
            <p className="text-light-text-secondary dark:text-dark-text-secondary">Projected Income</p>
            <p className="font-medium text-green-600 dark:text-green-400">{formatCurrency(f.projectedIncome)}</p>
        </div>
        <div>
            <p className="text-light-text-secondary dark:text-dark-text-secondary">Projected Expense</p>
            <p className="font-medium text-red-600 dark:text-red-400">{formatCurrency(f.projectedExpense)}</p>
        </div>
        <div>
            <p className="text-light-text-secondary dark:text-dark-text-secondary">Projected Savings</p>
            <p className="font-medium text-brand-primary">{formatCurrency(f.projectedSavings)}</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-light-text-secondary dark:text-dark-text-secondary">Method: {f.method}</p>
    </div>
  );
};

export default ForecastSummary;