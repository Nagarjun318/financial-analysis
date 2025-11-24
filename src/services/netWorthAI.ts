import { callGeminiAPI, GEMINI_MODELS, GeminiModel } from './geminiService';
import { Asset, Liability, NetWorthSnapshot } from '../domain/networth/calculateNetWorth';

/**
 * AI-powered net worth analysis and recommendations
 */

export interface FinancialHealthScore {
  score: number; // 0-100
  rating: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Critical';
  summary: string;
  strengths: string[];
  concerns: string[];
  recommendations: string[];
}

export interface AssetSuggestion {
  type: string;
  confidence: 'High' | 'Medium' | 'Low';
  reasoning: string;
}

export interface MarketValueEstimate {
  estimatedValue: number;
  confidence: string;
  marketTrends: string;
  source: string;
}

export interface NetWorthForecast {
  periods: Array<{
    month: string;
    predictedNetWorth: number;
    predictedAssets: number;
    predictedLiabilities: number;
    confidence: string;
  }>;
  insights: string[];
  assumptions: string[];
}

/**
 * Generate AI-powered financial health score and insights
 */
export async function analyzeFinancialHealth(
  assets: Asset[],
  liabilities: Liability[],
  timeline: NetWorthSnapshot[]
): Promise<FinancialHealthScore> {
  const totalAssets = assets.reduce((sum, a) => sum + a.currentValue, 0);
  const totalLiabilities = liabilities.filter(l => !l.name.includes('(Completed)')).reduce((sum, l) => sum + (l.principal || 0), 0);
  const netWorth = totalAssets - totalLiabilities;
  const debtRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;

  // Calculate trends
  const recentMonths = timeline.slice(0, 6);
  const netWorthTrend = recentMonths.length >= 2
    ? ((recentMonths[0].netWorth - recentMonths[recentMonths.length - 1].netWorth) / recentMonths[recentMonths.length - 1].netWorth) * 100
    : 0;

  const prompt = `You are a financial advisor analyzing someone's net worth. Provide a comprehensive financial health assessment.

Current Financial Status:
- Total Assets: ₹${totalAssets.toLocaleString()}
- Total Liabilities: ₹${totalLiabilities.toLocaleString()}
- Net Worth: ₹${netWorth.toLocaleString()}
- Debt Ratio: ${debtRatio.toFixed(1)}%
- 6-Month Net Worth Trend: ${netWorthTrend > 0 ? '+' : ''}${netWorthTrend.toFixed(1)}%

Assets Breakdown:
${assets.map(a => `- ${a.name} (${a.type}): ₹${a.currentValue.toLocaleString()}`).join('\n')}

Liabilities:
${liabilities.filter(l => !l.name.includes('(Completed)')).map(l => `- ${l.name}: ₹${l.principal?.toLocaleString()} @ ${l.interestRateAnnual}% (EMI: ₹${l.monthlyEMI?.toLocaleString()})`).join('\n')}

Provide a response in this exact JSON format (no markdown, just JSON):
{
  "score": <number 0-100>,
  "rating": "<Excellent|Good|Fair|Poor|Critical>",
  "summary": "<2-3 sentence overall assessment>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "concerns": ["<concern 1>", "<concern 2>"],
  "recommendations": ["<specific actionable recommendation 1>", "<recommendation 2>", "<recommendation 3>"]
}`;

  try {
    const response = await callGeminiAPI(prompt, GEMINI_MODELS.FLASH_LATEST);
    const jsonMatch = response.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error('AI analysis failed:', error);
  }

  // Fallback scoring
  let score = 50;
  if (debtRatio < 30) score += 20;
  if (netWorthTrend > 0) score += 15;
  if (netWorth > 0) score += 15;

  return {
    score,
    rating: score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Poor',
    summary: `Your net worth is ₹${netWorth.toLocaleString()} with a ${debtRatio.toFixed(1)}% debt ratio.`,
    strengths: debtRatio < 30 ? ['Low debt ratio'] : [],
    concerns: debtRatio > 50 ? ['High debt burden'] : [],
    recommendations: ['Continue monitoring your financial health']
  };
}

/**
 * AI-powered asset type suggestion based on name
 */
export async function suggestAssetType(assetName: string): Promise<AssetSuggestion> {
  const prompt = `Given an asset name, suggest the most appropriate asset type category.

Asset Name: "${assetName}"

Common types: property, gold, vehicle, investment, cash, jewelry, electronics, furniture, art, collectibles, cryptocurrency, stocks, bonds

Respond in JSON format only:
{
  "type": "<suggested type>",
  "confidence": <0.0 to 1.0>,
  "reasoning": "<brief explanation>"
}`;

  try {
    const response = await callGeminiAPI(prompt, GEMINI_MODELS.FLASH_LITE);
    const jsonMatch = response.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error('Type suggestion failed:', error);
  }

  // Simple fallback
  const lowerName = assetName.toLowerCase();
  if (lowerName.includes('gold')) return { type: 'gold', confidence: 'High', reasoning: 'Name contains "gold"' };
  if (lowerName.includes('property') || lowerName.includes('plot') || lowerName.includes('house')) return { type: 'property', confidence: 'High', reasoning: 'Name indicates real estate' };
  if (lowerName.includes('car') || lowerName.includes('vehicle') || lowerName.includes('bike')) return { type: 'vehicle', confidence: 'High', reasoning: 'Name indicates vehicle' };

  return { type: 'other', confidence: 'Low', reasoning: 'Unable to determine specific type' };
}

/**
 * AI-powered market value estimation
 */
export async function estimateMarketValue(
  assetName: string,
  assetType: string,
  currentValue: number,
  location: string = "Chennai, India",
  model: GeminiModel = GEMINI_MODELS.FLASH_LATEST
): Promise<MarketValueEstimate> {
  const prompt = `Estimate the current market value for this asset in ${location}.

Asset: ${assetName}
Type: ${assetType}
Recorded Value: ₹${currentValue.toLocaleString()}

Provide market insights specific to ${location} and suggest if the recorded value seems reasonable.

Respond in JSON format:
{
  "estimatedValue": <number>,
  "confidence": "<high|medium|low>",
  "marketTrends": "<brief market trend analysis for ${location}>",
  "source": "<reasoning for estimate>"
}`;

  try {
    const response = await callGeminiAPI(prompt, model);
    const jsonMatch = response.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error('Market value estimation failed:', error);
  }

  return {
    estimatedValue: currentValue,
    confidence: 'low',
    marketTrends: 'Unable to fetch market data',
    source: 'Current recorded value'
  };
}

/**
 * AI-powered net worth forecasting
 */
export async function forecastNetWorth(
  timeline: NetWorthSnapshot[],
  liabilities: Liability[],
  monthsAhead: number,
  model: GeminiModel = GEMINI_MODELS.FLASH_LATEST
): Promise<NetWorthForecast> {
  const recentData = timeline.slice(0, 6).reverse();

  const prompt = `Forecast net worth for the next ${monthsAhead} months based on historical data.

Historical Net Worth (last 6 months):
${recentData.map(t => `${t.month}: ₹${t.netWorth.toLocaleString()}`).join('\n')}

Active Liabilities:
${liabilities.filter(l => !l.name.includes('(Completed)')).map(l =>
    `- ${l.name}: ₹${l.monthlyEMI?.toLocaleString()}/month`
  ).join('\n')}

Provide a ${monthsAhead}-month forecast assuming:
1. Assets remain stable or grow at historical rate
2. Liabilities decrease based on EMI payments
3. No major life changes

Respond in JSON format:
{
  "periods": [
    {"month": "YYYY-MM", "predictedNetWorth": <number>, "predictedAssets": <number>, "predictedLiabilities": <number>, "confidence": "<high|medium|low>"}
  ],
  "insights": ["<insight 1>", "<insight 2>"],
  "assumptions": ["<assumption 1>", "<assumption 2>"]
}`;

  try {
    const response = await callGeminiAPI(prompt, model);
    const jsonMatch = response.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error('Forecasting failed:', error);
  }

  // Simple linear projection fallback
  const avgGrowth = recentData.length >= 2
    ? (recentData[recentData.length - 1].netWorth - recentData[0].netWorth) / recentData.length
    : 0;

  const lastSnapshot = timeline[0];
  const periods = [];
  for (let i = 1; i <= monthsAhead; i++) {
    const date = new Date(lastSnapshot.month + '-01');
    date.setMonth(date.getMonth() + i);
    periods.push({
      month: date.toISOString().slice(0, 7),
      predictedNetWorth: lastSnapshot.netWorth + (avgGrowth * i),
      predictedAssets: lastSnapshot.totalAssets,
      predictedLiabilities: Math.max(0, lastSnapshot.totalLiabilities - (liabilities.reduce((s, l) => s + (l.monthlyEMI || 0), 0) * i)),
      confidence: 'medium'
    });
  }

  return {
    periods,
    insights: ['Projection based on historical trends'],
    assumptions: ['Assumes stable asset values', 'Regular liability payments']
  };
}

export interface DebtOptimizationInsight {
  refinanceOpportunity: {
    isAvailable: boolean;
    currentMarketRate: number;
    potentialSavings: string;
    recommendation: string;
  };
  prepaymentStrategy: {
    suggestedExtraPayment: number;
    timeSaved: string;
    interestSaved: string;
  };
  debtQuality: {
    score: 'Excellent' | 'Good' | 'Fair' | 'Poor';
    reasoning: string;
  };
}

/**
 * AI-powered debt optimization analysis
 */
export async function analyzeDebtOptimization(
  liabilityName: string,
  liabilityType: string,
  principal: number,
  interestRate: number,
  monthlyEMI: number,
  model: GeminiModel = GEMINI_MODELS.FLASH_LATEST
): Promise<DebtOptimizationInsight> {
  const prompt = `Analyze this debt for optimization opportunities in the Indian market context.

Debt Details:
- Name: ${liabilityName}
- Type: ${liabilityType}
- Outstanding Principal: ₹${principal.toLocaleString()}
- Interest Rate: ${interestRate}%
- Monthly EMI: ₹${monthlyEMI.toLocaleString()}

Provide 3 insights:
1. Refinancing: Compare ${interestRate}% with current Indian market rates for ${liabilityType}. Is it high? Can they save money?
2. Prepayment: Calculate impact of paying 10% extra EMI. How much time/interest is saved?
3. Quality: Rate this debt (Good vs Bad debt).

Respond in JSON format:
{
  "refinanceOpportunity": {
    "isAvailable": <boolean>,
    "currentMarketRate": <number>,
    "potentialSavings": "<text description of savings>",
    "recommendation": "<actionable advice>"
  },
  "prepaymentStrategy": {
    "suggestedExtraPayment": <number (10% of EMI)>,
    "timeSaved": "<text e.g. '1 year 2 months'>",
    "interestSaved": "<text e.g. '₹50,000'>"
  },
  "debtQuality": {
    "score": "<Excellent|Good|Fair|Poor>",
    "reasoning": "<brief explanation>"
  }
}`;

  try {
    const response = await callGeminiAPI(prompt, model);
    const jsonMatch = response.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error('Debt optimization analysis failed:', error);
  }

  // Fallback
  return {
    refinanceOpportunity: {
      isAvailable: false,
      currentMarketRate: interestRate,
      potentialSavings: 'N/A',
      recommendation: 'Unable to analyze market rates'
    },
    prepaymentStrategy: {
      suggestedExtraPayment: Math.round(monthlyEMI * 0.1),
      timeSaved: 'Unknown',
      interestSaved: 'Unknown'
    },
    debtQuality: {
      score: 'Fair',
      reasoning: 'Standard debt'
    }
  };
}

/**
 * AI chat for net worth queries
 */
export async function chatAboutNetWorth(
  question: string,
  assets: Asset[],
  liabilities: Liability[],
  timeline: NetWorthSnapshot[],
  model: GeminiModel = GEMINI_MODELS.FLASH_LITE
): Promise<string> {
  const totalAssets = assets.reduce((sum, a) => sum + a.currentValue, 0);
  const totalLiabilities = liabilities.filter(l => !l.name.includes('(Completed)')).reduce((sum, l) => sum + (l.principal || 0), 0);
  const netWorth = totalAssets - totalLiabilities;

  const prompt = `You are a helpful financial assistant. Answer the user's question about their net worth.

User's Financial Summary:
- Net Worth: ₹${netWorth.toLocaleString()}
- Total Assets: ₹${totalAssets.toLocaleString()}
- Total Liabilities: ₹${totalLiabilities.toLocaleString()}

Assets:
${assets.map(a => `- ${a.name}: ₹${a.currentValue.toLocaleString()}`).join('\n')}

Liabilities:
${liabilities.filter(l => !l.name.includes('(Completed)')).map(l => `- ${l.name}: ₹${l.principal?.toLocaleString()}`).join('\n')}

User Question: ${question}

INSTRUCTIONS:
1. Keep response VERY SHORT and CRISP (max 80 words, 2-3 bullet points)
2. Be direct and actionable - use specific numbers from their data
3. Use simple language
4. End EVERY response with "Follow-up questions:" followed by 3 questions the USER might ask YOU next

FORMAT:
[Brief answer in 2-3 bullet points]

Follow-up questions:
- [What user would ask you - e.g., "How can I grow my net worth faster?"]
- [What user would ask you - e.g., "Should I pay off debt or invest?"]
- [What user would ask you - e.g., "What assets should I add?"]`;

  try {
    const response = await callGeminiAPI(prompt, model);
    return response.text;
  } catch (error) {
    console.error('Chat failed:', error);
    return "I'm having trouble processing your question right now. Please try again.";
  }
}
export interface GoalInsight {
  monthlySavingsRequired: number;
  feasibility: 'High' | 'Medium' | 'Low';
  recommendations: string[];
  investmentStrategy: string;
  estimatedCompletionDate?: string;
}

/**
 * AI-powered financial goal analysis
 */
export async function analyzeGoal(
  goalName: string,
  targetAmount: number,
  currentAmount: number,
  deadline: string,
  model: GeminiModel = GEMINI_MODELS.FLASH_LATEST
): Promise<GoalInsight> {
  const today = new Date();
  const targetDate = new Date(deadline);
  const monthsRemaining = Math.max(1, (targetDate.getFullYear() - today.getFullYear()) * 12 + (targetDate.getMonth() - today.getMonth()));
  const amountNeeded = Math.max(0, targetAmount - currentAmount);
  const simpleMonthly = amountNeeded / monthsRemaining;

  const prompt = `Analyze this financial goal and provide a strategy to achieve it in India.

Goal: ${goalName}
Target: ₹${targetAmount.toLocaleString()}
Current Saved: ₹${currentAmount.toLocaleString()}
Deadline: ${deadline} (${monthsRemaining} months away)
Simple Monthly Savings Needed (0% interest): ₹${simpleMonthly.toLocaleString()}

Provide a realistic monthly savings plan considering inflation and investment returns (e.g., SIPs, FDs).
Suggest an investment strategy (e.g., "Start a SIP of ₹X in Nifty 50 Index Fund").

Respond in JSON format:
{
  "monthlySavingsRequired": <number (realistic monthly amount)>,
  "feasibility": "<High|Medium|Low>",
  "recommendations": ["<step 1>", "<step 2>", "<step 3>"],
  "investmentStrategy": "<brief strategy description>",
  "estimatedCompletionDate": "YYYY-MM-DD"
}`;

  try {
    const response = await callGeminiAPI(prompt, model);
    const jsonMatch = response.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error('Goal analysis failed:', error);
  }

  return {
    monthlySavingsRequired: simpleMonthly,
    feasibility: 'Medium',
    recommendations: ['Save consistently every month', 'Review progress quarterly'],
    investmentStrategy: 'Recurring Deposit or Liquid Fund',
    estimatedCompletionDate: deadline
  };
}

export interface SuggestedGoal {
  name: string;
  target_amount: number;
  deadline: string;
  category: 'savings' | 'investment' | 'debt' | 'purchase' | 'other';
  priority: 'high' | 'medium' | 'low';
  reasoning: string;
}

export async function suggestFinancialGoals(
  netWorth: number,
  monthlyIncome: number,
  monthlyExpenses: number,
  assets: Asset[],
  liabilities: Liability[],
  model: GeminiModel = GEMINI_MODELS.FLASH_LATEST
): Promise<SuggestedGoal[]> {
  const monthlySavings = monthlyIncome - monthlyExpenses;
  const savingsRate = monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0;
  const totalDebt = liabilities.filter(l => !l.name.includes('(Completed)')).reduce((sum, l) => sum + (l.principal || 0), 0);

  const prompt = `You are a financial advisor in India. Based on this user's financial profile, suggest 3-5 personalized financial goals.

Financial Profile:
- Net Worth: ₹${netWorth.toLocaleString()}
- Monthly Income: ₹${monthlyIncome.toLocaleString()}
- Monthly Expenses: ₹${monthlyExpenses.toLocaleString()}
- Monthly Savings: ₹${monthlySavings.toLocaleString()} (${savingsRate.toFixed(1)}%)
- Total Debt: ₹${totalDebt.toLocaleString()}

Suggest realistic, India-specific goals. Respond in JSON:
{
  "goals": [
    {
      "name": "<goal>",
      "target_amount": <number>,
      "deadline": "YYYY-MM-DD",
      "category": "<savings|investment|debt|purchase|other>",
      "priority": "<high|medium|low>",
      "reasoning": "<why>"
    }
  ]
}`;

  try {
    const response = await callGeminiAPI(prompt, model);
    const jsonMatch = response.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.goals || [];
    }
  } catch (error) {
    console.error('Goal suggestion failed:', error);
  }

  const fallbackGoals: SuggestedGoal[] = [];
  if (monthlySavings > 0) {
    fallbackGoals.push({
      name: 'Emergency Fund',
      target_amount: monthlyExpenses * 6,
      deadline: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      category: 'savings',
      priority: 'high',
      reasoning: 'Build a safety net covering 6 months of expenses'
    });
  }
  return fallbackGoals;
}

/**
 * AI chat for financial goals queries
 */
export async function chatAboutGoals(
  question: string,
  goals: any[],
  netWorth: number,
  monthlyIncome: number,
  monthlyExpenses: number,
  model: GeminiModel = GEMINI_MODELS.FLASH_LITE
): Promise<string> {
  const monthlySavings = monthlyIncome - monthlyExpenses;
  const totalTargetAmount = goals.reduce((sum, g) => sum + (g.target_amount || 0), 0);
  const totalCurrentAmount = goals.reduce((sum, g) => sum + (g.current_amount || 0), 0);

  const prompt = `You are a helpful financial goals advisor in India. Answer the user's question about their financial goals.

User's Financial Summary:
- Net Worth: ₹${netWorth.toLocaleString()}
- Monthly Income: ₹${monthlyIncome.toLocaleString()}
- Monthly Expenses: ₹${monthlyExpenses.toLocaleString()}
- Monthly Savings: ₹${monthlySavings.toLocaleString()}

Active Goals (${goals.length}):
${goals.map(g => `- ${g.name}: ₹${g.current_amount?.toLocaleString() || 0} / ₹${g.target_amount?.toLocaleString() || 0} (Deadline: ${g.deadline})`).join('\n')}

Total Goal Target: ₹${totalTargetAmount.toLocaleString()}
Total Saved: ₹${totalCurrentAmount.toLocaleString()}

User Question: ${question}

INSTRUCTIONS:
1. Keep response VERY SHORT and CRISP (max 80 words, 2-3 bullet points)
2. Be direct and actionable - use specific numbers from their data
3. Focus on India-specific advice (SIP, FD, PPF, etc.)
4. End EVERY response with "Follow-up questions:" followed by 3 questions the USER might ask YOU next

FORMAT:
[Brief answer in 2-3 bullet points]

Follow-up questions:
- [What user would ask you - e.g., "How can I achieve my goals faster?"]
- [What user would ask you - e.g., "Which goal should I prioritize?"]
- [What user would ask you - e.g., "Should I start a SIP?"]`;

  try {
    const response = await callGeminiAPI(prompt, model);
    return response.text;
  } catch (error) {
    console.error('Chat failed:', error);
    return "I'm having trouble processing your question right now. Please try again.";
  }
}
