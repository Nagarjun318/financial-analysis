import { buildAnalytics } from '../domain/analytics/summarize.ts';
import { Transaction } from '../types.ts';

// Lazy import to avoid bundling heavy client if not used.
async function getGeminiClient() {
	const apiKey = import.meta.env.GEMINI_API_KEY as string | undefined;
	if (!apiKey) {
		throw new Error('GEMINI_API_KEY not set. Add it to .env.local to enable insights.');
	}
	// Placeholder: if using @google/genai we would instantiate here.
	return { apiKey };
}

export interface MonthlyInsight {
	monthKeys: string[];
	narrative: string;
}

/**
 * Generates a high-level monthly financial insight narrative.
 * This stub does not call the model yet—extend with real API usage.
 */
export async function generateMonthlyInsight(transactions: Transaction[]): Promise<MonthlyInsight> {
	const analytics = buildAnalytics([...transactions]);
	const months = analytics.monthly.slice(-3); // recent 3 months
	const monthKeys = months.map(m => m.monthKey);
	if (months.length === 0) {
		return { monthKeys, narrative: 'No transaction data available to generate insights.' };
	}
	const last = months[months.length - 1];
	const prev = months[months.length - 2];
	let deltaIncome = prev ? (last.income - prev.income) : 0;
	let deltaExpense = prev ? (last.expense - prev.expense) : 0;
	const trendIncome = deltaIncome >= 0 ? 'increased' : 'decreased';
	const trendExpense = deltaExpense >= 0 ? 'increased' : 'decreased';
	const savingsRate = last.income > 0 ? ((last.savings / last.income) * 100).toFixed(2) : '0';
	const recurringCount = analytics.recurring.count;
	const narrative = `In ${last.monthKey}, income ${trendIncome} by ₹${Math.abs(deltaIncome).toFixed(0)} and expenses ${trendExpense} by ₹${Math.abs(deltaExpense).toFixed(0)} vs prior month. Savings rate: ${savingsRate}%. Recurring patterns detected: ${recurringCount}. Top expense category: ${analytics.categories[0]?.category || 'N/A'}.`;
	return { monthKeys, narrative };
}
