import { buildAnalytics } from '../domain/analytics/summarize.ts';
import { Transaction, HomeService } from '../types.ts';

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
export async function callGeminiAPI(prompt: string, model: GeminiModel = GEMINI_MODELS.PRO_LATEST): Promise<APIResponse> {
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

		// Check if it's a rate limit error (429), quota exceeded (403), or overloaded (503)
		if (response.status === 429 || response.status === 403 || response.status === 503) {
			// If using pro model and hit rate limit/overload, try flash model
			if (model === GEMINI_MODELS.PRO_LATEST) {
				console.warn(`Pro model issue (${response.status}), falling back to Flash model`);
				const fallbackResult = await callGeminiAPI(prompt, GEMINI_MODELS.FLASH_LATEST);

				let reason = 'Rate limit exceeded';
				if (response.status === 403) reason = 'Quota exceeded';
				if (response.status === 503) reason = 'Model overloaded';

				return {
					...fallbackResult,
					usedFallback: true,
					fallbackReason: reason
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
 * Apply static rules for known transaction patterns
 * Returns the category if a rule matches, otherwise null
 */
function applyStaticCategoryRules(description: string): string | null {
	const normalizedDesc = description.toUpperCase();

	// Loan auto-debit mandates
	if (normalizedDesc.includes('ACH D- HDFC BANK LTD')) {
		return 'Plot Loan';
	}

	if (normalizedDesc.includes('ACH D- SUNDARAMFINLTD')) {
		return 'Car Loan';
	}

	// Salary / Income
	if (normalizedDesc.includes('COGNIZANT') ||
		normalizedDesc.includes('ACCENTURE') ||
		normalizedDesc.includes('COMCAST') ||
		normalizedDesc.includes('CREDIT INTEREST')) {
		return 'Income';
	}

	// Shopping
	if (normalizedDesc.includes('POMMYS') ||
		normalizedDesc.includes('CHENNAI SILKS') ||
		normalizedDesc.includes('POTHYS') ||
		normalizedDesc.includes('JEYACHANDRAN') ||
		normalizedDesc.includes('ZUDIO') ||
		normalizedDesc.includes('WESTSIDE') ||
		normalizedDesc.includes('TRENDS')) {
		return 'Shopping';
	}

	// Food
	if (normalizedDesc.includes('METRO MART') ||
		normalizedDesc.includes('SWIGGY') ||
		normalizedDesc.includes('ZOMATO')) {
		return 'Food';
	}

	// ATM Withdrawals
	if (normalizedDesc.startsWith('ATW-') ||
		normalizedDesc.startsWith('NWD-')) {
		return 'Personal Transfer';
	}

	return null;
}

/**
 * Predict category for a transaction based on its description
 * Uses AI to intelligently categorize transactions
 */
export async function predictTransactionCategory(
	description: string,
	amount: number,
	existingCategories: string[],
	model: GeminiModel = GEMINI_MODELS.FLASH_2_0
): Promise<string> {
	if (!description || description.trim().length === 0) {
		return 'Uncategorized';
	}

	// Use the batch function for consistency
	// Pass a dummy ID since it's not needed for single prediction
	const result = await predictTransactionCategoriesBatch(
		[{ id: 0, description, amount }],
		model
	);

	return result[0]?.ai_category || 'Uncategorized';
}

/**
 * Batch predict categories for multiple transactions
 * More efficient than individual predictions
 * Uses pattern matching based on description keywords
 */
export async function predictTransactionCategoriesBatch(
	transactions: Array<{ id: number; description: string; amount: number }>,
	model: GeminiModel = GEMINI_MODELS.PRO_LATEST
): Promise<Array<{ id: number; ai_category: string }>> {
	if (transactions.length === 0) return [];

	// Separate transactions that match static rules
	const results: Array<{ id: number; ai_category: string }> = [];
	const transactionsForAI: Array<{ id: number; description: string; amount: number }> = [];

	transactions.forEach(t => {
		const staticCategory = applyStaticCategoryRules(t.description);
		if (staticCategory) {
			results.push({ id: t.id, ai_category: staticCategory });
		} else {
			transactionsForAI.push(t);
		}
	});

	// If all matched static rules, return immediately
	if (transactionsForAI.length === 0) {
		return results;
	}

	const transactionList = transactionsForAI.map((t, idx) =>
		`${idx + 1}. ID: ${t.id} | "${t.description}" | ₹${Math.abs(t.amount).toFixed(2)} (${t.amount >= 0 ? 'credit' : 'debit'})`
	).join('\n');

	const prompt = `You are a financial transaction categorization expert. Analyze these transactions and predict the most appropriate category for each.

TRANSACTION LIST:
${transactionList}

CATEGORIES TO CHOOSE FROM:
- Food: Restaurants, Swiggy, Zomato, Metro Mart, Supermarkets (Spar, More, Reliance Fresh, Big Basket, DMart), Cafes (Starbucks, Tea, Coffee), Fast Food (Dominos, Pizza, Burger, KFC, McDonalds, Subway), Bakeries, Sweets, Hotels, Diners.
- Shopping: Clothing & Fashion (Chennai Silks, Pothys, Jeyachandran, Zudio, Westside, Trends, Pommys, Myntra, Ajio, Tata Cliq, Max, Pantaloons, H&M, Zara, Uniqlo, Nike, Adidas, Puma), Electronics (Reliance Digital, Croma, Sathya, Viveks, Poorvika, Apple, Samsung), Accessories (Titan, Tanishq, Kalyan), Online (Amazon, Flipkart), Decathlon.
- Travel: Ride-hailing (Uber, Ola, Rapido), Fuel (Shell, Petrol, Diesel, Bunk, BPCL, HPCL, IOCL), Transport (Flight, Train, Bus, IRCTC, Red Bus, Indigo, Air India, CMRL, Metro), Tolls (Fastag).
- Entertainment: Movies (Cinema, PVR, Inox, BookMyShow), Streaming (Netflix, Prime, Hotstar, Spotify, Disney, YouTube), Gaming (Steam, PlayStation), Events, Outings, Amusement Parks.
- Health: Medical (Pharmacy, Doctor, Hospital, Clinic, Labs, Diagnostics, Scan, Dental), Brands (MedPlus, Apollo, 1mg, Netmeds, PharmEasy, Lenskart), Fitness (Gym, Cult, Sports).
- Utilities: Bills (Electricity, Water, Gas, Maintenance), Recharge (Mobile, DTH, Data Card), Providers (Bescom, TNEB, Act, Airtel, Jio, Vodafone, BSNL, Tata Sky, Sun Direct, LPG, Indane).
- Housing: Rent, Furniture (Ikea, Pepperfry, Home Centre, Urban Ladder), Decor, Repairs (Plumber, Electrician, Carpenter, Paint), Services (Maid, Cook, Cleaning).
- Education: Fees (School, College, University), Courses (Udemy, Coursera, Training), Materials (Books, Stationery, Kindle).
- Finance: Investments (Mutual Fund, SIP, Zerodha, Groww, Upstox), Loans (EMI, Bajaj), Insurance (LIC, Premium), Bank Charges (Min Bal, SMS Charge, Credit Card Payment).
- Personal Transfer: UPI to friends/family, Self-transfer, Cash Withdrawals (ATM, ATW, NWD), NEFT/IMPS (if no merchant identified).
- Income: Salary (Cognizant, Accenture, Comcast), Refunds, Cashback, Interest, Dividends.
- Others: Only if absolutely no other category fits.

RULES & INSTRUCTIONS:

PRIORITY ORDER:
1. First: Check for Income keywords (Cognizant, Comcast, Accenture, Salary).
2. Second: Check for specific Merchant/Brand names (e.g., Zudio → Shopping, Swiggy → Food).
3. Third: Check for Transaction Types (UPI, ATW, NEFT) only if no merchant is found.

SPECIFIC CATEGORIZATION RULES:
- Income: Any mention of "Cognizant", "Comcast", "Accenture", "Salary", "Dividend", or "Credit Interest" must be "Income".
- Shopping: "Zudio", "Westside", "Trends", "Chennai Silks", "Pothys", "Jeyachandran", "Pommys" must be "Shopping".
- Food: "Metro Mart", "Swiggy", "Zomato" must be "Food".
- Travel: "Shell", "BPCL", "HPCL", "Petrol" must be "Travel" (even if it says POS).
- Finance: "LIC", "Bajaj", "Zerodha", "Groww" must be "Finance".

TRANSACTION CODE PATTERNS (Fallback Logic):
- ATW-XXXXXXXX / NWD / ATM WDL: Always "Personal Transfer".
- UPI-XXXXXXXX: If the description contains a known brand (e.g., "UPI-Swiggy"), categorize by brand. If it contains a person's name or is generic, use "Personal Transfer".
- POS-XXXXXXXX: Only use "Shopping" if the merchant name is not recognized as Food, Travel, or Health.
- NEFT / IMPS: Default to "Personal Transfer" unless the text explicitly mentions "Rent" (Housing) or "Fee" (Education).

CONTEXTUAL INFERENCE:
- Do not rely on "POS" or "UPI" alone; look at the text after the code.
- "Shell" is always Travel (Fuel), never Shopping.
- "Apollo" is always Health, never Shopping.

EXAMPLES:
- "NEFT CR-CHAS0INBX01-COGNIZANT SAL..." → "Income"
- "POS 512967... POMMYS GARMENTS..." → "Shopping"
- "POS 512967... METRO MART SUPER..." → "Food"
- "ATW-512967... KANCHEEPURAM" → "Personal Transfer" (ATM Withdrawal)

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

		const aiResults = JSON.parse(jsonMatch[0]);

		// Map to expected format and merge with static results
		const aiMapped = aiResults.map((r: any) => ({
			id: r.id,
			ai_category: r.category || 'Others'
		}));

		return [...results, ...aiMapped];
	} catch (error) {
		console.error('Batch category prediction error:', error);
		// Return default categories on error for AI part, plus static results
		const fallbackAI = transactionsForAI.map(t => ({ id: t.id, ai_category: 'Others' }));
		return [...results, ...fallbackAI];
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

/**
 * AI Kitchen Assistant
 * Helps with meal planning, recipes, and shopping list management
 */
export interface KitchenAssistanceResult {
	response: string;
	suggestedShoppingItems?: Array<{
		item_name: string;
		category: string;
		quantity: number;
		unit: string;
	}>;
}

export async function getKitchenAssistance(
	userQuery: string,
	inventory: Array<{ item_name: string; current_stock: number; unit: string; category: string }>,
	shoppingList: Array<{ item_name: string; quantity: number; unit: string }>,
	model: GeminiModel = GEMINI_MODELS.FLASH_LITE
): Promise<KitchenAssistanceResult> {
	const inventoryList = inventory.map(i => `- ${i.item_name} (${i.current_stock} ${i.unit}) [${i.category}]`).join('\n');
	const shoppingListItems = shoppingList.map(i => `- ${i.item_name} (${i.quantity} ${i.unit})`).join('\n');

	const prompt = `You are an expert AI Chef and Kitchen Manager. Help the user with their groceries, cooking, and meal planning.

CURRENT INVENTORY:
${inventoryList || "No items in inventory."}

CURRENT SHOPPING LIST:
${shoppingListItems || "No items in shopping list."}

USER QUERY: "${userQuery}"

INSTRUCTIONS:
1. Analyze the user's request (recipe ideas, meal planning, shopping advice, etc.).
2. If suggesting recipes, prioritize using available inventory.
3. If the user needs to buy things (e.g., for a recipe or restock), suggest items to add to the shopping list.
4. Be creative, helpful, and concise.
5. Format your response as a JSON object.

JSON STRUCTURE:
{
  "response": "Your friendly, helpful text response here. Use markdown for formatting (bold, lists).",
  "suggestedShoppingItems": [
    { "item_name": "Tomato", "category": "Produce", "quantity": 2, "unit": "pcs" }
  ]
}

IMPORTANT:
- "suggestedShoppingItems" is optional. Only include it if the user explicitly asks to add items or if a recipe requires missing ingredients.
- Do not suggest items that are already in the shopping list or have sufficient stock, unless explicitly asked.
- Return ONLY the valid JSON object.`;

	try {
		const apiResponse = await callGeminiAPI(prompt, model);
		const jsonText = apiResponse.text.trim().replace(/^```json\s*|\s*```$/g, '');
		return JSON.parse(jsonText);
	} catch (error) {
		console.error('Kitchen assistance error:', error);
		// Fallback to text-only response if JSON parsing fails
		return {
			response: "I'm having trouble processing that request right now. Please try again.",
			suggestedShoppingItems: []
		};
	}
}

/**
 * Suggest grocery category based on item name
 * Uses AI to intelligently categorize grocery items
 */
export async function suggestGroceryCategory(
	itemName: string,
	availableCategories: string[],
	model: GeminiModel = GEMINI_MODELS.FLASH_LITE
): Promise<string> {
	if (!itemName || itemName.trim().length === 0) {
		return 'General';
	}

	const prompt = `You are a grocery categorization expert. Based on the item name OR brand name, suggest the most appropriate category.

ITEM NAME: "${itemName}"

EXISTING CATEGORIES (prefer these if they fit):
${availableCategories.join(', ')}

INSTRUCTIONS:
1. If the item fits one of the existing categories, return that category name
2. If none of the existing categories fit well, suggest a NEW appropriate category name
3. New categories should be clear, concise, and follow the same naming pattern (e.g., "Electronics", "Pet Supplies", "Baby Care")
4. Consider common grocery store organization
5. Recognize brand names and categorize accordingly
6. Return ONLY the category name (existing or new), nothing else

IMPORTANT: Recognize popular brand names and categorize them correctly:

HOUSEHOLD BRANDS (Detergents, Cleaners):
- Surf Excel, Rin, Ariel, Tide, Wheel, Harpic, Lizol, Vim → Household

COOKING OIL/GHEE BRANDS:
- Idhayam, Mantra, Fortune, Sundrop, Saffola, Dhara, Gemini → Pantry

PERSONAL CARE BRANDS:
- Dove, Pantene, Head & Shoulders, Lux, Lifebuoy, Pears, Colgate, Pepsodent → Personal Care

FOOD/SNACK BRANDS:
- Lays, Kurkure, Bingo, Haldiram's, Britannia, Parle → Snacks
- Maggi, Top Ramen, Yippee → Pantry
- Amul, Mother Dairy, Nandini → Dairy

BEVERAGE BRANDS:
- Coca Cola, Pepsi, Sprite, Fanta, Thums Up, Maaza, Frooti, Tropicana → Beverages

STATIONERY BRANDS:
- Classmate, Camlin, Apsara, Reynolds, Cello → Stationery

Examples by Item Type:
- "Milk" → Dairy
- "Tomato" → Produce
- "Chicken Breast" → Meat
- "Bread" → Bakery
- "Rice" → Pantry
- "Coca Cola" → Beverages
- "Ice Cream" → Frozen
- "Chips" → Snacks
- "Detergent" → Household
- "Shampoo" → Personal Care
- "Pencil" → Stationery
- "Dog Food" → Pet Supplies (new category)
- "Baby Wipes" → Baby Care (new category)
- "Light Bulb" → Electronics (new category)

Examples by Brand Name:
- "Surf Excel" → Household
- "Rin" → Household
- "Idhayam Oil" → Pantry
- "Mantra" → Pantry
- "Fortune Rice Bran Oil" → Pantry
- "Amul Butter" → Dairy
- "Britannia Biscuits" → Snacks
- "Classmate Notebook" → Stationery
- "Dove Soap" → Personal Care

Return ONLY the category name, nothing else.`;

	try {
		const apiResponse = await callGeminiAPI(prompt, model);
		const category = apiResponse.text.trim().replace(/^["']|["']$/g, '');

		// Return the category as-is (can be existing or new)
		// The UI will handle adding it to the available categories list
		if (category && category.length > 0) {
			return category;
		}

		// If empty response, return General as fallback
		return 'General';
	} catch (error) {
		console.error('AI category suggestion error:', error);
		return 'General';
	}
}

/**
 * Suggest complete grocery item details including category, unit, and price
 * Uses AI to provide comprehensive suggestions based on item name and Chennai location
 */
export interface GroceryItemSuggestion {
	category: string;
	unit: string;
	packageSize: string;
	estimatedPrice: number;
}

export async function suggestGroceryItemDetails(
	itemName: string,
	availableCategories: string[],
	model: GeminiModel = GEMINI_MODELS.FLASH_LITE
): Promise<GroceryItemSuggestion> {
	if (!itemName || itemName.trim().length === 0) {
		return {
			category: 'General',
			unit: 'units',
			packageSize: '',
			estimatedPrice: 0
		};
	}

	const prompt = `You are a grocery expert for Chennai, Tamil Nadu, India. Analyze the item and provide category, standard unit, package size, and current market price.

ITEM NAME: "${itemName}"

EXISTING CATEGORIES (prefer these if they fit):
${availableCategories.join(', ')}

LOCATION: Chennai, Tamil Nadu, India

INSTRUCTIONS:
1. Suggest the most appropriate category (existing or new)
2. Determine the standard unit of measurement for this item
3. Determine the typical package size (e.g., "500ml", "1kg", "250g")
4. Provide the current estimated market price in Chennai (in ₹) for that package size
5. Return ONLY a valid JSON object

UNIT GUIDELINES:
- Liquids: L (litres), ml (millilitres)
- Solids/Powders: kg (kilograms), g (grams)
- Countable items: pcs (pieces), units, packets, bottles

PACKAGE SIZE EXAMPLES:
- Milk → "500ml" or "1L"
- Curd → "200g", "400g", or "500g"
- Rice → "1kg", "5kg", or "10kg"
- Sugar → "1kg" or "5kg"
- Oil → "500ml", "1L", or "2L"
- Biscuits → "100g", "200g", or "300g"
- Detergent → "500g", "1kg", or "2kg"

PRICE GUIDELINES:
- Use current 2024-2025 market prices for Chennai
- Price should match the package size
- Provide realistic retail prices
- Include GST where applicable

BRAND RECOGNITION:
- Hatsun Curd (400g) → Dairy, g, "400g", ₹40
- Surf Excel (1kg) → Household, kg, "1kg", ₹200
- Idhayam Oil (1L) → Pantry, L, "1L", ₹190
- Amul Milk (500ml) → Dairy, ml, "500ml", ₹30
- Britannia Biscuits (100g) → Snacks, g, "100g", ₹25
- Classmate Notebook → Stationery, pcs, "1pcs", ₹50

COMMON ITEMS:
- Milk → Dairy, ml, "500ml", ₹28
- Rice → Pantry, kg, "1kg", ₹60
- Tomato → Produce, kg, "1kg", ₹40
- Chicken → Meat, kg, "1kg", ₹220
- Bread → Bakery, pcs, "1pcs", ₹40
- Sugar → Pantry, kg, "1kg", ₹50
- Cooking Oil → Pantry, L, "1L", ₹180
- Eggs → Dairy, pcs, "12pcs", ₹84

JSON FORMAT:
{
  "category": "category name",
  "unit": "unit of measurement",
  "packageSize": "package size with unit (e.g., 500ml, 1kg)",
  "estimatedPrice": price in rupees for this package (number)
}

Return ONLY the JSON object, no explanation.`;

	try {
		const apiResponse = await callGeminiAPI(prompt, model);
		const jsonText = apiResponse.text.trim().replace(/^```json\s*|\s*```$/g, '');
		const parsed = JSON.parse(jsonText);

		return {
			category: parsed.category || 'General',
			unit: parsed.unit || 'units',
			packageSize: parsed.packageSize || '',
			estimatedPrice: parseFloat(parsed.estimatedPrice) || 0
		};
	} catch (error) {
		console.error('AI item details suggestion error:', error);
		return {
			category: 'General',
			unit: 'units',
			packageSize: '',
			estimatedPrice: 0
		};
	}
}

/**
 * Get service-related advice from AI based on user's service records
 */
export async function getServiceAdvice(
	userQuery: string,
	services: Array<{ service_name: string; service_type: string; last_service_date: string; next_service_due: string; cost?: number; service_provider?: string; notes?: string }>,
	conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
	model: GeminiModel = GEMINI_MODELS.FLASH_LITE
): Promise<string> {
	const totalCost = services.reduce((sum, s) => sum + (s.cost || 0), 0);
	const overdueServices = services.filter(s => new Date(s.next_service_due) < new Date());
	const upcomingServices = services.filter(s => {
		const dueDate = new Date(s.next_service_due);
		const today = new Date();
		const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
		return diffDays > 0 && diffDays <= 30;
	});

	const serviceList = services
		.slice(0, 20)
		.map(s => `${s.service_name} (${s.service_type}) | Last: ${s.last_service_date} | Next: ${s.next_service_due} | Cost: ₹${s.cost || 0} | Provider: ${s.service_provider || 'N/A'}`)
		.join('\n');

	const conversationContext = conversationHistory
		.slice(-6)
		.map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
		.join('\n\n');

	const prompt = `You are an expert home service maintenance advisor. Help users manage their home services efficiently.

SERVICE SUMMARY:
- Total Services: ${services.length}
- Total Cost (All Time): ₹${totalCost.toFixed(2)}
- Overdue Services: ${overdueServices.length}
- Upcoming (Next 30 Days): ${upcomingServices.length}

${overdueServices.length > 0 ? `OVERDUE SERVICES:\n${overdueServices.map(s => `- ${s.service_name} (Due: ${s.next_service_due})`).join('\n')}\n` : ''}

${upcomingServices.length > 0 ? `UPCOMING SERVICES:\n${upcomingServices.map(s => `- ${s.service_name} (Due: ${s.next_service_due})`).join('\n')}\n` : ''}

ALL SERVICES (Recent 20):
${serviceList}

${conversationContext ? `CONVERSATION HISTORY:\n${conversationContext}\n` : ''}

USER QUESTION: ${userQuery}

INSTRUCTIONS:
1. Provide specific, actionable advice based on their actual service data
2. Be supportive and helpful
3. Use specific service names and dates from their data
4. If they ask about cost optimization, suggest specific strategies
5. If they ask about maintenance schedules, analyze patterns and suggest improvements
6. If overdue services exist, prioritize them
7. Suggest preventive maintenance when appropriate
8. Use emojis appropriately to make responses friendly
9. Keep responses concise but informative (3-5 paragraphs max)
10. Reference specific services and costs when giving advice

Provide your response now:`;

	try {
		const response = await callGeminiAPI(prompt, model);
		return response.text.trim();
	} catch (error) {
		console.error('Service advice error:', error);
		throw new Error('Failed to get service advice. Please try again or select a different model.');
	}
}

/**
 * Generate AI-powered service insights dashboard
 */
export async function generateServiceInsights(
	services: Array<{ service_name: string; service_type: string; last_service_date: string; next_service_due: string; cost?: number; service_provider?: string }>,
	model: GeminiModel = GEMINI_MODELS.FLASH_LITE
): Promise<{
	overallHealth: number;
	costOptimization: string[];
	maintenanceRecommendations: string[];
	upcomingPriorities: string[];
	costForecast: { month: string; estimatedCost: number }[];
}> {
	const servicesSummary = services.map(s => ({
		name: s.service_name,
		type: s.service_type,
		lastDate: s.last_service_date,
		nextDate: s.next_service_due,
		cost: s.cost || 0,
		provider: s.service_provider || 'Unknown'
	}));

	const prompt = `You are an AI home service analyst. Analyze the service data and provide insights.

SERVICES DATA:
${JSON.stringify(servicesSummary, null, 2)}

Analyze the data and return a JSON object with the following structure:
{
  "overallHealth": <number 0-100>,
  "costOptimization": [<array of 3-5 specific cost-saving tips>],
  "maintenanceRecommendations": [<array of 3-5 maintenance recommendations>],
  "upcomingPriorities": [<array of 3-5 priority services to focus on>],
  "costForecast": [
    {"month": "December 2025", "estimatedCost": <number>},
    {"month": "January 2026", "estimatedCost": <number>},
    {"month": "February 2026", "estimatedCost": <number>}
  ]
}

ANALYSIS GUIDELINES:
- overallHealth: 100 = all services up to date, 0 = critical maintenance issues
- costOptimization: Specific actionable tips based on actual service patterns
- maintenanceRecommendations: Prioritize overdue or upcoming services
- upcomingPriorities: Services that need attention soon
- costForecast: Predict next 3 months based on service schedules

Return ONLY the JSON object, no explanation.`;

	try {
		const response = await callGeminiAPI(prompt, model);
		const jsonMatch = response.text.match(/\{[\s\S]*\}/);
		if (!jsonMatch) {
			throw new Error('Could not parse AI response as JSON');
		}
		return JSON.parse(jsonMatch[0]);
	} catch (error) {
		console.error('Service insights error:', error);
		return {
			overallHealth: 50,
			costOptimization: ['Review service frequencies', 'Compare provider costs', 'Bundle services for discounts'],
			maintenanceRecommendations: ['Schedule overdue services', 'Set up reminders', 'Keep records updated'],
			upcomingPriorities: ['Check upcoming due dates', 'Budget for upcoming services', 'Contact service providers'],
			costForecast: [
				{ month: 'December 2025', estimatedCost: 0 },
				{ month: 'January 2026', estimatedCost: 0 },
				{ month: 'February 2026', estimatedCost: 0 }
			]
		};
	}
}

/**
 * AI-powered auto-suggestions for service details
 */
export async function suggestServiceDetails(
	serviceType: string,
	serviceName: string,
	existingServices: Array<{ service_name: string; service_type: string; service_provider?: string; cost?: number }>,
	model: GeminiModel = GEMINI_MODELS.FLASH_LITE
): Promise<{
	suggestedProvider: string;
	suggestedCost: number;
	suggestedInterval: number;
	suggestedNotes: string;
}> {
	const similarServices = existingServices.filter(s =>
		s.service_type === serviceType || s.service_name.toLowerCase().includes(serviceName.toLowerCase())
	);

	const prompt = `You are a home service expert. Suggest details for a new service entry.

SERVICE TYPE: ${serviceType}
SERVICE NAME: ${serviceName}

${similarServices.length > 0 ? `SIMILAR SERVICES:\n${similarServices.map(s => `- ${s.service_name}: Provider: ${s.service_provider || 'N/A'}, Cost: ₹${s.cost || 0}`).join('\n')}\n` : ''}

Based on Indian market standards and the service type, suggest:

Return a JSON object:
{
  "suggestedProvider": "<typical service provider name or 'Urban Company' or 'Local Technician'>",
  "suggestedCost": <typical cost in INR>,
  "suggestedInterval": <months between services>,
  "suggestedNotes": "<helpful maintenance tips in 1-2 sentences>"
}

GUIDELINES:
- AC: 3-6 months interval, ₹300-800
- Water Purifier: 3-6 months, ₹500-1500
- Geyser: 12 months, ₹500-1000
- Car Service: 6 months, ₹2000-5000
- Bike Service: 3-6 months, ₹500-2000
- Pest Control: 3-6 months, ₹1000-3000

Return ONLY the JSON object.`;

	try {
		const response = await callGeminiAPI(prompt, model);
		const jsonMatch = response.text.match(/\{[\s\S]*\}/);
		if (!jsonMatch) {
			throw new Error('Could not parse AI response');
		}
		return JSON.parse(jsonMatch[0]);
	} catch (error) {
		console.error('Service suggestion error:', error);
		return {
			suggestedProvider: 'Local Service Provider',
			suggestedCost: 500,
			suggestedInterval: 6,
			suggestedNotes: 'Regular maintenance recommended for optimal performance.'
		};
	}
}

/**
 * AI-powered service type detection from brand name or service description
 * Intelligently detects service type and suggests complete service details
 */
export async function detectServiceTypeAndSuggest(
	serviceName: string,
	existingServices: HomeService[],
	existingServiceTypes: string[],
	lastServiceDate?: string
): Promise<{
	detectedServiceType: string;
	suggestedProvider: string;
	suggestedCost: number;
	suggestedIntervalMonths: number;
	suggestedNextServiceDate: string;
	suggestedNotes: string;
	confidence: 'high' | 'medium' | 'low';
}> {
	const prompt = `You are an expert in home appliances and services. Analyze the service name/brand and detect what type of service it is.

SERVICE NAME/BRAND: "${serviceName}"

EXISTING SERVICE TYPES IN SYSTEM: ${existingServiceTypes.length > 0 ? existingServiceTypes.join(', ') : 'AC, Water Purifier, Geyser, Chimney, Washing Machine, Refrigerator, Car Service, Bike Service, Electricals, Plumbing, Painting, Pest Control'}

${existingServices.length > 0 ? `\nEXISTING SERVICES FOR REFERENCE:\n${existingServices.slice(0, 10).map(s => `- ${s.service_name} (${s.service_type}): ₹${s.cost || 0}, Provider: ${s.service_provider || 'N/A'}`).join('\n')}` : ''}

BRAND NAME EXAMPLES:
- Aquaguard, Kent, Pureit → Water Purifier
- Voltas, Daikin, LG, Samsung AC → AC
- Whirlpool, IFB, Samsung Washing Machine → Washing Machine
- Maruti, Honda, Hyundai → Car Service
- Hero, Bajaj, TVS → Bike Service
- Elica, Faber, Glen → Chimney
- Racold, AO Smith → Geyser

${lastServiceDate ? `LAST SERVICE DATE: ${lastServiceDate}` : 'LAST SERVICE DATE: Not provided (assume today)'}

Analyze the service name and:
1. Detect the most appropriate service type (use existing types if match, or suggest a new specific type)
2. Suggest typical service provider in India
3. Estimate typical service cost in INR
4. Recommend service interval in months
5. Calculate next service date based on last service date and interval
6. Provide maintenance tips

Return ONLY a valid JSON object:
{
  "detectedServiceType": "<specific service type>",
  "suggestedProvider": "<typical provider name>",
  "suggestedCost": <number in INR>,
  "suggestedIntervalMonths": <number of months>,
  "suggestedNextServiceDate": "<YYYY-MM-DD format>",
  "suggestedNotes": "<helpful tips>",
  "confidence": "<high|medium|low>"
}

Be specific with service types. For example: "Split AC", "Front Load Washing Machine", "RO Water Purifier" instead of just "AC", "Washing Machine", "Water Purifier".`;

	try {
		const result = await callGeminiAPI(prompt, GEMINI_MODELS.FLASH_LITE);

		// Parse the JSON response
		const jsonMatch = result.text.match(/\{[\s\S]*\}/);
		if (jsonMatch) {
			const parsed = JSON.parse(jsonMatch[0]);

			// Validate and return
			return {
				detectedServiceType: parsed.detectedServiceType || 'General Service',
				suggestedProvider: parsed.suggestedProvider || 'Local Service Provider',
				suggestedCost: parsed.suggestedCost || 500,
				suggestedIntervalMonths: parsed.suggestedIntervalMonths || 6,
				suggestedNextServiceDate: parsed.suggestedNextServiceDate || calculateNextDate(6, lastServiceDate),
				suggestedNotes: parsed.suggestedNotes || 'Regular maintenance recommended.',
				confidence: parsed.confidence || 'medium'
			};
		}

		// Fallback
		return createFallbackSuggestion(lastServiceDate);
	} catch (error) {
		console.error('Service type detection error:', error);
		return createFallbackSuggestion(lastServiceDate);
	}
}

function calculateNextDate(months: number, baseDate?: string): string {
	const start = baseDate ? new Date(baseDate) : new Date();
	const next = new Date(start);
	next.setMonth(next.getMonth() + months);
	return next.toISOString().split('T')[0];
}

function createFallbackSuggestion(lastServiceDate?: string): {
	detectedServiceType: string;
	suggestedProvider: string;
	suggestedCost: number;
	suggestedIntervalMonths: number;
	suggestedNextServiceDate: string;
	suggestedNotes: string;
	confidence: 'high' | 'medium' | 'low';
} {
	return {
		detectedServiceType: 'General Service',
		suggestedProvider: 'Local Service Provider',
		suggestedCost: 500,
		suggestedIntervalMonths: 6,
		suggestedNextServiceDate: calculateNextDate(6, lastServiceDate),
		suggestedNotes: 'Regular maintenance recommended for optimal performance.',
		confidence: 'low'
	};
}

/**
 * AI-powered budget suggestion for a specific category
 * Analyzes historical spending patterns and provides intelligent budget recommendations
 */
export async function suggestCategoryBudget(
	category: string,
	transactions: Array<{ date: string; amount: number; category: string; type: 'debit' | 'credit' }>,
	selectedYear: string,
	model: GeminiModel = GEMINI_MODELS.FLASH_LITE
): Promise<{
	suggestedBudget: number;
	reasoning: string;
	confidence: 'high' | 'medium' | 'low';
}> {
	// Filter transactions for the category and year
	const categoryTransactions = transactions.filter(t => {
		const matchesCategory = t.category.split('-').includes(category);
		const matchesYear = selectedYear === 'All' || t.date.startsWith(selectedYear);
		const isExpense = t.type === 'debit';
		return matchesCategory && matchesYear && isExpense;
	});

	if (categoryTransactions.length === 0) {
		return {
			suggestedBudget: 5000,
			reasoning: 'No historical data available. Starting with a conservative estimate of ₹5,000.',
			confidence: 'low'
		};
	}

	// Calculate statistics
	const amounts = categoryTransactions.map(t => Math.abs(t.amount));
	const totalSpent = amounts.reduce((sum, amt) => sum + amt, 0);
	const avgSpending = totalSpent / amounts.length;
	const maxSpending = Math.max(...amounts);
	const minSpending = Math.min(...amounts);

	// Group by month to find monthly patterns
	const monthlySpending: { [key: string]: number } = {};
	categoryTransactions.forEach(t => {
		const monthKey = t.date.substring(0, 7); // YYYY-MM
		monthlySpending[monthKey] = (monthlySpending[monthKey] || 0) + Math.abs(t.amount);
	});

	const monthlyAmounts = Object.values(monthlySpending);
	const avgMonthlySpending = monthlyAmounts.length > 0
		? monthlyAmounts.reduce((sum, amt) => sum + amt, 0) / monthlyAmounts.length
		: avgSpending;

	const prompt = `You are a financial advisor helping users set realistic budgets. Analyze the spending data and suggest an optimal monthly budget.

CATEGORY: ${category}
YEAR: ${selectedYear === 'All' ? 'All Years' : selectedYear}

SPENDING STATISTICS:
- Total Transactions: ${categoryTransactions.length}
- Total Spent: ₹${totalSpent.toFixed(2)}
- Average per Transaction: ₹${avgSpending.toFixed(2)}
- Average Monthly Spending: ₹${avgMonthlySpending.toFixed(2)}
- Highest Transaction: ₹${maxSpending.toFixed(2)}
- Lowest Transaction: ₹${minSpending.toFixed(2)}
- Number of Months with Data: ${monthlyAmounts.length}

MONTHLY BREAKDOWN:
${Object.entries(monthlySpending)
			.sort(([a], [b]) => b.localeCompare(a))
			.slice(0, 12)
			.map(([month, amount]) => `- ${month}: ₹${amount.toFixed(2)}`)
			.join('\n')}

INSTRUCTIONS:
1. Suggest a realistic monthly budget that accounts for:
   - Historical spending patterns
   - Seasonal variations (if any)
   - Room for unexpected expenses (10-20% buffer)
   - Encouraging responsible spending
2. Provide clear reasoning for your suggestion
3. Rate your confidence (high/medium/low) based on data quality
4. Keep reasoning concise (2-3 sentences max)
5. Return ONLY valid JSON in this exact format:

{
  "suggestedBudget": <number>,
  "reasoning": "<string>",
  "confidence": "<high|medium|low>"
}

GUIDELINES:
- If data shows consistent spending, suggest average + 15% buffer
- If data is volatile, suggest 80th percentile + 20% buffer
- If limited data (< 3 months), suggest average + 25% buffer and mark confidence as low
- Round to nearest 100 for amounts > 1000, nearest 50 for amounts < 1000
- Ensure budget is practical and not too restrictive

Return ONLY the JSON object, no markdown or extra text.`;

	try {
		const apiResponse = await callGeminiAPI(prompt, model);
		const jsonText = apiResponse.text.trim().replace(/^```json\s*|\s*```$/g, '');
		const parsed = JSON.parse(jsonText);

		return {
			suggestedBudget: Math.round(parsed.suggestedBudget || avgMonthlySpending * 1.15),
			reasoning: parsed.reasoning || 'Based on your historical spending patterns.',
			confidence: parsed.confidence || 'medium'
		};
	} catch (error) {
		console.error('Budget suggestion error:', error);
		// Fallback: Use average monthly spending + 15% buffer
		const fallbackBudget = Math.round(avgMonthlySpending * 1.15);
		return {
			suggestedBudget: fallbackBudget,
			reasoning: `Based on your average monthly spending of ₹${avgMonthlySpending.toFixed(0)}, with a 15% buffer for flexibility.`,
			confidence: 'medium'
		};
	}
}

