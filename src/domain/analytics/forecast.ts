import { Transaction, ForecastResult, ForecastPoint } from '../../types';

// Simple moving average forecast for next month based on last N months aggregates.
// We aggregate by month using income (+) vs expense (-) sign to derive totals.
// Now supports AI-generated forecasts with enhanced insights.

interface MonthlyAggregate { month: string; income: number; expense: number; savings: number; }

function aggregateMonthly(transactions: Transaction[]): MonthlyAggregate[] {
  const map = new Map<string, { income: number; expense: number }>();
  for (const t of transactions) {
    const month = t.date.slice(0, 7); // YYYY-MM
    const entry = map.get(month) || { income: 0, expense: 0 };
    if (t.amount >= 0) entry.income += t.amount; else entry.expense += Math.abs(t.amount);
    map.set(month, entry);
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, v]) => ({ month, income: v.income, expense: v.expense, savings: v.income - v.expense }));
}

function movingAverage(values: number[], window: number): number | null {
  if (values.length === 0) return null;
  const slice = values.slice(-window);
  if (slice.length === 0) return null;
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

export function buildForecast(
  transactions: Transaction[], 
  window = 3, 
  aiForecastData?: Partial<ForecastPoint>
): ForecastResult {
  const monthly = aggregateMonthly(transactions);
  if (monthly.length === 0) return { points: [], nextMonth: null, isAIGenerated: false };

  const monthsIncome = monthly.map(m => m.income);
  const monthsExpense = monthly.map(m => m.expense);
  const monthsSavings = monthly.map(m => m.savings);

  const projectedIncome = movingAverage(monthsIncome, window) ?? 0;
  const projectedExpense = movingAverage(monthsExpense, window) ?? 0;
  const projectedSavings = projectedIncome - projectedExpense;

  // Next month key: increment last month
  const lastMonth = monthly[monthly.length - 1]?.month; // YYYY-MM
  if (!lastMonth || !/\d{4}-\d{2}/.test(lastMonth)) {
    return { points: [], nextMonth: null, isAIGenerated: false }; // Defensive: malformed month key
  }
  const [yearStr, monthStr] = lastMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const nextDate = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, '0')}`;

  // If AI data provided, merge it with traditional forecast
  const forecastPoint: ForecastPoint = aiForecastData ? {
    month: aiForecastData.month || nextDate,
    projectedIncome: aiForecastData.projectedIncome ?? projectedIncome,
    projectedExpense: aiForecastData.projectedExpense ?? projectedExpense,
    projectedSavings: aiForecastData.projectedSavings ?? projectedSavings,
    method: aiForecastData.method || 'ai-gemini',
    insights: aiForecastData.insights,
    confidence: aiForecastData.confidence,
    recommendations: aiForecastData.recommendations,
    trends: aiForecastData.trends,
    warnings: aiForecastData.warnings
  } : {
    month: nextDate,
    projectedIncome,
    projectedExpense,
    projectedSavings,
    method: `moving-average-${window}`
  };

  return {
    points: [forecastPoint],
    nextMonth: forecastPoint,
    isAIGenerated: !!aiForecastData
  };
}
