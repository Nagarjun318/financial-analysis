export interface Transaction {
  id?: number;
  user_id?: string;
  date: string;
  description: string;
  amount: number;
  // type is derived on the client from the amount's sign
  type: 'debit' | 'credit';
  category: string;
  // Mark if detected as recurring (e.g., subscription or regular payment)
  recurring?: boolean;
}

export interface Summary {
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
}

export interface AnalysisResult {
  summary: Summary;
  transactions: Transaction[];
  forecast?: ForecastResult;
  anomalies?: AnomalyResult[];
}

export interface MonthlySummary {
  month: string;
  revenue: number;
  expense: number;
  savings: number;
  expenseRatio: number;
  savingsRatio: number;
  balance: number;
}

// Budgeting
export interface CategoryBudget {
  category: string;
  monthlyTarget: number; // positive target amount
}

export interface BudgetVariance {
  category: string;
  monthKey: string; // YYYY-MM
  actual: number; // expense actual (positive)
  target?: number; // optional target
  variance?: number; // actual - target (positive means overspend)
  percent?: number; // actual/target if target provided
}

// Forecasting: next month predictions per high-level metric
export interface ForecastPoint {
  month: string; // YYYY-MM
  projectedIncome: number;
  projectedExpense: number;
  projectedSavings: number;
  method: string; // e.g., 'moving-average-3'
}

export interface ForecastResult {
  points: ForecastPoint[]; // Usually last actual + next forecast
  nextMonth: ForecastPoint | null; // Convenience pointer
}

// Anomalies: flag transactions that deviate strongly from category norm
export interface AnomalyResult {
  transactionId?: number;
  date: string;
  description: string;
  amount: number;
  category: string;
  zScore: number;
  severity: 'moderate' | 'severe';
}