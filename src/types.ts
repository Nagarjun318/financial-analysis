export interface Transaction {
  id?: number;
  user_id?: string;
  date: string;
  description: string;
  amount: number;
  // type is derived on the client from the amount's sign
  type: 'debit' | 'credit';
  category: string;
}

export interface Summary {
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
}

export interface AnalysisResult {
  summary: Summary;
  transactions: Transaction[];
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