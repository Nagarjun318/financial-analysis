export interface Transaction {
  id?: number;
  user_id?: string;
  date: string;
  description: string;
  amount: number;
  // type is derived on the client from the amount's sign
  type: 'debit' | 'credit';
  category: string;
  ai_category?: string | null; // AI-predicted category
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
  method: string; // e.g., 'moving-average-3' or 'ai-gemini'
  // AI-specific fields
  insights?: string; // AI-generated insights about spending patterns
  confidence?: number; // 0-100 confidence score
  recommendations?: string[]; // AI recommendations
  trends?: { category: string; trend: 'increasing' | 'decreasing' | 'stable'; change: number }[];
  warnings?: string[]; // Potential financial warnings
}

export interface ForecastResult {
  points: ForecastPoint[]; // Usually last actual + next forecast
  nextMonth: ForecastPoint | null; // Convenience pointer
  isAIGenerated?: boolean; // Flag to indicate if AI was used
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

// Home Services Tracker
export interface HomeService {
  id?: number;
  user_id?: string;
  service_name: string;
  service_type: string; // e.g., 'AC', 'Car', 'Plumbing', 'Electrical', etc.
  last_service_date: string;
  next_service_due: string;
  service_provider?: string;
  cost?: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

// Service History - tracks all past service records
export interface ServiceHistory {
  id?: number;
  service_id: number;
  user_id?: string;
  service_date: string;
  service_provider?: string;
  cost?: number;
  notes?: string;
  odometer_reading?: number; // For vehicles
  work_performed?: string;
  parts_replaced?: string[];
  next_service_due?: string;
  created_at?: string;
}

// Service Statistics
export interface ServiceStatistics {
  total_services: number;
  total_cost: number;
  average_cost: number;
  last_service_date: string;
  average_interval_days: number;
}