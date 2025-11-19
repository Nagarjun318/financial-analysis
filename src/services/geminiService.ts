import { buildAnalytics } from '../domain/analytics/summarize.ts';
import { Transaction } from '../types.ts';

// Lazy import to avoid bundling heavy client if not used.
async function getGeminiClient() {
	const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
	if (!apiKey) {
		throw new Error('VITE_GEMINI_API_KEY not set. Add it to .env or .env.local file and restart the dev server.');
	}
	return { apiKey };
}

/**
 * Available Gemini models for search
 */
export const GEMINI_MODELS = {
	PRO_LATEST: 'gemini-pro-latest',
	FLASH_LATEST: 'gemini-flash-latest',
	FLASH_2_0: 'gemini-2.0-flash',
	FLASH_LITE: 'gemini-flash-lite-latest',
	FLASH_2_5: 'gemini-2.5-flash',
} as const;

export type GeminiModel = typeof GEMINI_MODELS[keyof typeof GEMINI_MODELS];

interface APIResponse {
	text: string;
	usedFallback: boolean;
	fallbackReason?: string;
}

/**
 * Call Gemini API directly using REST endpoint
 */
async function callGeminiAPI(prompt: string, model: GeminiModel = GEMINI_MODELS.PRO_LATEST): Promise<APIResponse> {
	const { apiKey } = await getGeminiClient();
	const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

	const response = await fetch(endpoint, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			contents: [{
				parts: [{
					text: prompt
				}]
			}],
			generationConfig: {
				temperature: 0.1,
				topK: 1,
				topP: 1,
				maxOutputTokens: 2048,
			}
		})
	});

	if (!response.ok) {
		const errorText = await response.text();

		// Check if it's a rate limit error (429) or quota exceeded (403)
		if (response.status === 429 || response.status === 403) {
			// If using pro model and hit rate limit, try flash model
			if (model === GEMINI_MODELS.PRO_LATEST) {
				console.warn('Rate limit on Pro model, falling back to Flash model');
				const fallbackResult = await callGeminiAPI(prompt, GEMINI_MODELS.FLASH_LATEST);
				return {
					...fallbackResult,
					usedFallback: true,
					fallbackReason: response.status === 429 ? 'Rate limit exceeded' : 'Quota exceeded'
				};
			}
		}

		throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
	}

	const data = await response.json();
	const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

	if (!text) {
		throw new Error('No response from Gemini API');
	}

	return { text, usedFallback: false };
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

export interface SearchResult {
	transactions: Transaction[];
	usedFallback: boolean;
	fallbackReason?: string;
	visualize?: boolean;
	chartType?: 'bar' | 'pie' | 'line';
	chartTitle?: string;
}

/**
 * Natural language search for transactions using Gemini AI
 * Converts user query into filter criteria and returns matching transactions
 */
export async function searchTransactionsWithAI(
	query: string,
	transactions: Transaction[],
	model: GeminiModel = GEMINI_MODELS.PRO_LATEST
): Promise<SearchResult> {
	if (!transactions || transactions.length === 0) {
		return { transactions: [], usedFallback: false };
	}

	// Get unique categories and date range from transactions
	const categories = [...new Set(transactions.map(t => t.category))];
	const dates = transactions.map(t => t.date).sort();
	const minDate = dates[0];
	const maxDate = dates[dates.length - 1];

	// Sample a few transactions to give AI context about data structure
	const sampleTransactions = transactions.slice(0, 5).map(t => ({
		date: t.date,
		description: t.description,
		amount: t.amount,
		type: t.type,
		category: t.category,
		ai_category: t.ai_category || 'Uncategorized'
	}));

	const prompt = `You are a financial data analyst. Analyze this natural language query and return a JSON object with filter criteria to find matching transactions.

User Query: "${query}"

Available Data:
- Date range: ${minDate} to ${maxDate}
- Categories: ${categories.join(', ')}
- Sample transactions: ${JSON.stringify(sampleTransactions, null, 2)}

Instructions:
1. Parse the user's intent (amount filters, date ranges, categories, keywords, transaction type, limit, sorting, visualization)
2. Return ONLY a valid JSON object with these optional fields:
   {
     "minAmount": number | null,
     "maxAmount": number | null,
     "startDate": "YYYY-MM-DD" | null,
     "endDate": "YYYY-MM-DD" | null,
     "categories": string[] | null,
     "keywords": string[] | null,
     "type": "debit" | "credit" | null,
     "description": string | null,
     "limit": number | null,
     "sortBy": "amount" | "date" | null,
     "sortOrder": "asc" | "desc" | null,
     "visualize": boolean,
     "chartType": "bar" | "pie" | "line" | null,
     "chartTitle": string | null
   }

Examples:
- "shopping over 5000" → {"minAmount": 5000, "categories": ["Shopping"]}
- "groceries in October" → {"categories": ["Groceries"], "startDate": "2025-10-01", "endDate": "2025-10-31"}
- "UPI transactions last month" → {"keywords": ["UPI"], "startDate": "calculate last month"}
- "salary income" → {"type": "credit", "keywords": ["salary"]}
- "top 10 expenses" → {"type": "debit", "limit": 10, "sortBy": "amount", "sortOrder": "desc"}
- "5 largest shopping expenses" → {"categories": ["Shopping"], "type": "debit", "limit": 5, "sortBy": "amount", "sortOrder": "desc"}
- "recent 20 transactions" → {"limit": 20, "sortBy": "date", "sortOrder": "desc"}
- "generate chart for top 10 expenses" → {"type": "debit", "limit": 10, "sortBy": "amount", "sortOrder": "desc", "visualize": true, "chartType": "bar", "chartTitle": "Top 10 Expenses"}
- "show pie chart of expenses by category" → {"type": "debit", "visualize": true, "chartType": "pie", "chartTitle": "Expenses by Category"}
- "graph my monthly spending" → {"visualize": true, "chartType": "line", "chartTitle": "Monthly Spending"}

Important:
- For relative dates like "last month", calculate the actual dates based on current date being ${new Date().toISOString().split('T')[0]}
- Match categories from the available list (case-insensitive)
- For "top N" or "largest" queries, set limit and sortBy="amount", sortOrder="desc"
- For "smallest" or "lowest", set sortBy="amount", sortOrder="asc"
- For "recent" or "latest", set sortBy="date", sortOrder="desc"
- If query mentions "chart", "graph", "visualize", "pie chart", "bar chart", set visualize=true
- Choose chartType: "bar" for comparisons/rankings, "pie" for category distributions, "line" for trends over time
- Generate descriptive chartTitle based on the query
- Return ONLY the JSON object, no explanation
- If unclear, use broader filters rather than none`;

	try {
		const apiResponse = await callGeminiAPI(prompt, model);

		// Extract JSON from response (in case there's extra text)
		const jsonMatch = apiResponse.text.match(/\{[\s\S]*\}/);
		if (!jsonMatch) {
			throw new Error('Could not parse AI response as JSON');
		}

		const filters = JSON.parse(jsonMatch[0]);

		// Apply filters to transactions
		let results = [...transactions];

		if (filters.minAmount !== null && filters.minAmount !== undefined) {
			results = results.filter(t => Math.abs(t.amount) >= filters.minAmount);
		}

		if (filters.maxAmount !== null && filters.maxAmount !== undefined) {
			results = results.filter(t => Math.abs(t.amount) <= filters.maxAmount);
		}

		if (filters.startDate) {
			results = results.filter(t => t.date >= filters.startDate);
		}

		if (filters.endDate) {
			results = results.filter(t => t.date <= filters.endDate);
		}

		if (filters.categories && filters.categories.length > 0) {
			results = results.filter(t =>
				filters.categories.some((cat: string) =>
					t.category.toLowerCase().includes(cat.toLowerCase()) ||
					(t.ai_category && t.ai_category.toLowerCase().includes(cat.toLowerCase()))
				)
			);
		}

		if (filters.keywords && filters.keywords.length > 0) {
			results = results.filter(t =>
				filters.keywords.some((keyword: string) =>
					t.description.toLowerCase().includes(keyword.toLowerCase())
				)
			);
		}

		if (filters.type) {
			results = results.filter(t => t.type === filters.type);
		}

		if (filters.description) {
			results = results.filter(t =>
				t.description.toLowerCase().includes(filters.description.toLowerCase())
			);
		}

		// Apply sorting if specified
		if (filters.sortBy) {
			results.sort((a, b) => {
				let comparison = 0;

				if (filters.sortBy === 'amount') {
					comparison = Math.abs(a.amount) - Math.abs(b.amount);
				} else if (filters.sortBy === 'date') {
					comparison = a.date.localeCompare(b.date);
				}

				return filters.sortOrder === 'desc' ? -comparison : comparison;
			});
		}

		// Apply limit if specified
		if (filters.limit && filters.limit > 0) {
			results = results.slice(0, filters.limit);
		}

		return {
			transactions: results,
			usedFallback: apiResponse.usedFallback,
			fallbackReason: apiResponse.fallbackReason,
			visualize: filters.visualize || false,
			chartType: filters.chartType || 'bar',
			chartTitle: filters.chartTitle || 'Transaction Analysis'
		};
	} catch (error) {
		console.error('AI search error:', error);
		throw new Error(`Failed to process search: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
}

/**
 * Generate AI-powered forecast for next month using Gemini
 * Analyzes historical transaction patterns and provides intelligent predictions
 */
export async function generateAIForecast(
	transactions: Transaction[],
	model: GeminiModel = GEMINI_MODELS.PRO_LATEST
): Promise<{
	month: string;
	projectedIncome: number;
	projectedExpense: number;
	projectedSavings: number;
	method: string;
	insights: string;
	confidence: number;
	recommendations: string[];
	trends: { category: string; trend: 'increasing' | 'decreasing' | 'stable'; change: number }[];
	warnings: string[];
	usedFallback: boolean;
	fallbackReason?: string;
}> {
	if (transactions.length === 0) {
		throw new Error('No transactions available for forecast');
	}

	// Get analytics for context
	const analytics = buildAnalytics(transactions);

	// Prepare transaction summary for AI
	const sortedTransactions = [...transactions].sort((a, b) => b.date.localeCompare(a.date));
	const recentTransactions = sortedTransactions.slice(0, 100); // Last 100 transactions

	// Calculate monthly aggregates
	const monthlyData = new Map<string, { income: number; expense: number; count: number }>();
	transactions.forEach(t => {
		const month = t.date.slice(0, 7);
		const data = monthlyData.get(month) || { income: 0, expense: 0, count: 0 };
		if (t.amount >= 0) {
			data.income += t.amount;
		} else {
			data.expense += Math.abs(t.amount);
		}
		data.count += 1;
		monthlyData.set(month, data);
	});

	const monthlyArray = Array.from(monthlyData.entries())
		.sort((a, b) => a[0].localeCompare(b[0]))
		.map(([month, data]) => ({
			month,
			income: data.income,
			expense: data.expense,
			savings: data.income - data.expense,
			count: data.count
		}));

	// Calculate next month
	const lastMonth = monthlyArray[monthlyArray.length - 1]?.month || new Date().toISOString().slice(0, 7);
	const [year, month] = lastMonth.split('-').map(Number);
	const nextMonth = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, '0')}`;

	// Category breakdown
	const categoryTotals = new Map<string, number>();
	transactions.forEach(t => {
		if (t.amount < 0) { // Only expenses
			const current = categoryTotals.get(t.category) || 0;
			categoryTotals.set(t.category, current + Math.abs(t.amount));
		}
	});
	const topCategories = Array.from(categoryTotals.entries())
		.sort((a, b) => b[1] - a[1])
		.slice(0, 10);

	const prompt = `You are a financial advisor AI. Analyze the following transaction history and generate a detailed forecast for next month (${nextMonth}).

MONTHLY HISTORY (Last 12 months):
${monthlyArray.slice(-12).map(m =>
		`${m.month}: Income ₹${m.income.toFixed(0)}, Expense ₹${m.expense.toFixed(0)}, Savings ₹${m.savings.toFixed(0)}, Transactions: ${m.count}`
	).join('\n')}

TOP EXPENSE CATEGORIES:
${topCategories.map(([cat, amt]) => `${cat}: ₹${amt.toFixed(0)}`).join('\n')}

RECENT TRANSACTIONS (Last 20):
${recentTransactions.slice(0, 20).map(t =>
		`${t.date}: ${t.description} - ${t.category} (AI: ${t.ai_category || 'N/A'}) - ₹${t.amount.toFixed(0)}`
	).join('\n')}

CURRENT ANALYTICS:
- Total Income: ₹${analytics.summary.totalIncome.toFixed(0)}
- Total Expense: ₹${analytics.summary.totalExpenses.toFixed(0)}
- Net Savings: ₹${analytics.summary.netSavings.toFixed(0)}
- Average Monthly Income: ₹${(analytics.summary.totalIncome / Math.max(monthlyArray.length, 1)).toFixed(0)}
- Average Monthly Expense: ₹${(analytics.summary.totalExpenses / Math.max(monthlyArray.length, 1)).toFixed(0)}

Based on this data, provide a JSON response with the following structure:
{
	"projectedIncome": <number, estimated income for next month in ₹>,
	"projectedExpense": <number, estimated expense for next month in ₹>,
	"insights": "<string, 2-3 sentences about spending patterns, seasonality, trends>",
	"confidence": <number, 0-100 confidence score based on data consistency>,
	"recommendations": [<array of 3-5 actionable recommendations to improve finances>],
	"trends": [
		{
			"category": "<category name>",
			"trend": "increasing|decreasing|stable",
			"change": <percentage change, positive or negative>
		}
	],
	"warnings": [<array of potential financial concerns or upcoming risks>]
}

Important:
1. Base predictions on historical patterns and trends
2. Consider seasonality (holidays, recurring bills)
3. Identify unusual spending patterns
4. Provide specific, actionable recommendations
5. Warn about potential budget overruns
6. Confidence should reflect data quality and consistency
7. Ensure all numbers are realistic and based on historical data
8. Return ONLY valid JSON, no markdown or extra text`;

	try {
		const apiResponse = await callGeminiAPI(prompt, model);
		const jsonText = apiResponse.text.trim().replace(/^```json\s*|\s*```$/g, '');
		const parsed = JSON.parse(jsonText);

		// Calculate projected savings
		const projectedSavings = (parsed.projectedIncome || 0) - (parsed.projectedExpense || 0);

		// Get friendly model name for display
		const modelName = model.includes('pro') ? 'Gemini Pro' :
			model.includes('flash-lite') ? 'Gemini Flash Lite' :
				model.includes('2.5-flash') ? 'Gemini 2.5 Flash' :
					model.includes('2.0-flash') ? 'Gemini 2.0 Flash' :
						'Gemini Flash';

		return {
			month: nextMonth,
			projectedIncome: parsed.projectedIncome || 0,
			projectedExpense: parsed.projectedExpense || 0,
			projectedSavings,
			method: `ai-${modelName.toLowerCase().replace(/ /g, '-')}`,
			insights: parsed.insights || 'AI-generated forecast based on historical patterns.',
			confidence: Math.min(100, Math.max(0, parsed.confidence || 75)),
			recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
			trends: Array.isArray(parsed.trends) ? parsed.trends : [],
			warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
			usedFallback: apiResponse.usedFallback,
			fallbackReason: apiResponse.fallbackReason
		};
	} catch (error) {
		console.error('AI forecast error:', error);

		// Check if it's a 503 (overloaded) or other temporary error
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		const is503Error = errorMessage.includes('503') || errorMessage.includes('overloaded') || errorMessage.includes('UNAVAILABLE');
		const is429Error = errorMessage.includes('429') || errorMessage.includes('rate limit');

		if (is503Error || is429Error) {
			// Provide a more user-friendly error for temporary issues
			throw new Error('AI service temporarily unavailable. Using traditional forecast.');
		}

		throw new Error(`Failed to generate AI forecast: ${errorMessage}`);
	}
}

/**
 * Predict category for a transaction based on its description
 * Uses AI to intelligently categorize transactions
 */
export async function predictTransactionCategory(
	description: string,
	amount: number,
	existingCategories: string[],
	model: GeminiModel = GEMINI_MODELS.FLASH_LITE
): Promise<string> {
	if (!description || description.trim().length === 0) {
		return 'Uncategorized';
	}

	const isCredit = amount >= 0;
	const transactionType = isCredit ? 'income/credit' : 'expense/debit';

	const prompt = `You are a financial transaction categorization expert. Analyze the following transaction and predict the most appropriate category.

TRANSACTION DETAILS:
Description: "${description}"
Amount: ₹${Math.abs(amount).toFixed(2)}
Type: ${transactionType}

AVAILABLE CATEGORIES:
${existingCategories.join(', ')}

RULES:
1. Return ONLY the category name from the available categories list
2. Choose the most specific and accurate category
3. If no existing category fits well, suggest a new appropriate category name
4. Be consistent with similar transactions
5. Consider common Indian transaction patterns (UPI, NEFT, IMPS, etc.)
6. For salary/income, use appropriate income categories
7. For loans/EMI, identify the loan type
8. For online payments, identify the merchant/service

Return ONLY the category name, nothing else.`;

	try {
		const apiResponse = await callGeminiAPI(prompt, model);
		const category = apiResponse.text.trim();

		// Clean up the response (remove quotes, extra spaces)
		const cleanCategory = category.replace(/^["']|["']$/g, '').trim();

		return cleanCategory || 'Uncategorized';
	} catch (error) {
		console.error('AI category prediction error:', error);
		return 'Uncategorized';
	}
}

/**
 * Batch predict categories for multiple transactions
 * More efficient than individual predictions
 * Uses pattern matching based on description keywords
 */
export async function predictTransactionCategoriesBatch(
	transactions: Array<{ id: number; description: string; amount: number }>,
	model: GeminiModel = GEMINI_MODELS.FLASH_LITE
): Promise<Array<{ id: number; ai_category: string }>> {
	if (transactions.length === 0) return [];

	const transactionList = transactions.map((t, idx) =>
		`${idx + 1}. ID: ${t.id} | "${t.description}" | ₹${Math.abs(t.amount).toFixed(2)} (${t.amount >= 0 ? 'credit' : 'debit'})`
	).join('\n');

	const prompt = `You are a financial transaction categorization expert. Analyze these transactions and predict the most appropriate category for each.

TRANSACTIONS:
${transactionList}

CATEGORIES TO CHOOSE FROM:
- Food (restaurants, swiggy, zomato, groceries, supermarkets, cafes)
- Shopping (clothing, electronics, amazon, flipkart, lifestyle, accessories)
- Travel (uber, ola, fuel, flight, train, bus, toll)
- Entertainment (movies, streaming, games, events, outings)
- Health (medical, pharmacy, doctor, fitness, sports)
- Utilities (bills, recharge, electricity, water, gas, internet, maintenance)
- Housing (rent, furniture, decor, repairs)
- Education (fees, books, courses, stationery)
- Finance (investments, emi, loans, insurance, bank charges)
- Personal Transfer (upi to friends/family, self-transfer)
- Income (salary, refunds, cashback, interest)
- Others (only if absolutely no other category fits)

INSTRUCTIONS:
1. Use your broad knowledge of merchants, brands, and transaction patterns to categorize.
2. DO NOT rely only on keywords. Infer the category from the context (e.g., "Starbucks" is Food, "Shell" is Travel/Fuel).
3. For UPI transactions, try to infer the purpose if possible, otherwise use "Personal Transfer".
4. AVOID using "Others" unless the description is completely ambiguous (e.g., "payment", "transfer").
5. Be consistent.

OUTPUT FORMAT:
Return results as a JSON array with exact format:
[
  {"id": 123, "category": "Food"},
  {"id": 456, "category": "Shopping"}
]

Return ONLY the JSON array, no explanation.`;

	try {
		const apiResponse = await callGeminiAPI(prompt, model);

		// Extract JSON from response
		const jsonMatch = apiResponse.text.match(/\[[\s\S]*\]/);
		if (!jsonMatch) {
			throw new Error('Could not parse AI response as JSON array');
		}

		const results = JSON.parse(jsonMatch[0]);

		// Map to expected format
		return results.map((r: any) => ({
			id: r.id,
			ai_category: r.category || 'Others'
		}));
	} catch (error) {
		console.error('Batch category prediction error:', error);
		// Return default categories on error
		return transactions.map(t => ({ id: t.id, ai_category: 'Others' }));
	}
}

/**
 * Get financial advice from AI based on user's transactions and conversation history
 */
export async function getFinancialAdvice(
	userQuery: string,
	transactions: Array<{ date: string; description: string; amount: number; category: string; type: 'debit' | 'credit'; ai_category?: string | null }>,
	conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
	model: GeminiModel = GEMINI_MODELS.FLASH_LITE
): Promise<string> {
	// Calculate financial summary
	const totalIncome = transactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + Math.abs(t.amount), 0);
	const totalExpenses = transactions.filter(t => t.type === 'debit').reduce((sum, t) => sum + Math.abs(t.amount), 0);
	const netSavings = totalIncome - totalExpenses;
	const savingsRate = totalIncome > 0 ? ((netSavings / totalIncome) * 100).toFixed(1) : '0';

	// Category-wise expenses
	const categoryExpenses = transactions
		.filter(t => t.type === 'debit')
		.reduce((acc, t) => {
			const cat = t.category || 'Other';
			acc[cat] = (acc[cat] || 0) + Math.abs(t.amount);
			return acc;
		}, {} as Record<string, number>);

	const topCategories = Object.entries(categoryExpenses)
		.sort(([, a], [, b]) => b - a)
		.slice(0, 10)
		.map(([cat, amt]) => `${cat}: ₹${amt.toFixed(2)}`)
		.join('\n');

	// Recent transactions
	const recentTransactions = transactions
		.slice(0, 20)
		.map(t => `${t.date} | ${t.description} | ${t.category} (AI: ${t.ai_category || 'N/A'}) | ₹${Math.abs(t.amount).toFixed(2)} (${t.type})`)
		.join('\n');

	// Monthly spending pattern
	const monthlySpending = transactions
		.filter(t => t.type === 'debit')
		.reduce((acc, t) => {
			const month = t.date.substring(0, 7); // YYYY-MM
			acc[month] = (acc[month] || 0) + Math.abs(t.amount);
			return acc;
		}, {} as Record<string, number>);

	const monthlyPattern = Object.entries(monthlySpending)
		.sort(([a], [b]) => b.localeCompare(a))
		.slice(0, 6)
		.map(([month, amt]) => `${month}: ₹${amt.toFixed(2)}`)
		.join('\n');

	// Build conversation context
	const conversationContext = conversationHistory
		.slice(-6) // Last 3 exchanges
		.map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
		.join('\n\n');

	const prompt = `You are an expert financial advisor helping a user manage their personal finances. Provide personalized, actionable advice based on their transaction data.

FINANCIAL SUMMARY:
- Total Income: ₹${totalIncome.toFixed(2)}
- Total Expenses: ₹${totalExpenses.toFixed(2)}
- Net Savings: ₹${netSavings.toFixed(2)}
- Savings Rate: ${savingsRate}%

TOP EXPENSE CATEGORIES:
${topCategories}

MONTHLY SPENDING PATTERN:
${monthlyPattern}

RECENT TRANSACTIONS (Last 20):
${recentTransactions}

${conversationContext ? `CONVERSATION HISTORY:\n${conversationContext}\n` : ''}

USER QUESTION: ${userQuery}

INSTRUCTIONS:
1. Provide specific, actionable advice based on their actual transaction data
2. Be supportive and encouraging, not judgmental
3. Use specific numbers from their data to make your points
4. If they ask about savings, suggest specific categories to reduce
5. If they ask about expenses, identify problematic spending patterns
6. If they ask what they're doing wrong, highlight areas of concern with data
7. If they ask what to do next, provide a prioritized action plan
8. Use emojis appropriately to make the response friendly
9. CRITICAL: Keep responses VERY SHORT and CONCISE (max 150 words).
10. Use simple, layman-friendly language. Avoid complex financial jargon.
11. Use bullet points for readability.
12. Reference specific categories and amounts when giving advice.

Provide your response now:`;

	try {
		const response = await callGeminiAPI(prompt, model);
		return response.text.trim();
	} catch (error) {
		console.error('Financial advice error:', error);
		throw new Error('Failed to get financial advice. Please try again or select a different model.');
	}
}
