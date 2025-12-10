export interface Liability {
  id: string;
  name: string;
  type: 'loan' | 'credit' | 'other';
  principal: number; // Original loan amount
  interestRateAnnual: number; // %
  monthlyEMI: number;
  startDate: string; // YYYY-MM-DD
  extraPaymentMonthly?: number;
  lastUpdated?: string;
  // Deprecated fields for backward compatibility
  openingPrincipal?: number;
  currentPrincipal?: number;
}

export interface Asset {
  id: string;
  name: string;
  type: string; // Allow any string for custom asset types (e.g., gold, vehicle, property, investment, etc.)
  currentValue: number;
  lastUpdated?: string;
  createdOn?: string; // YYYY-MM-DD - when the asset was created/acquired
  isSuggested?: boolean; // Marks auto-suggested assets that need user confirmation
}

export interface NetWorthSnapshot {
  month: string;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  liabilityBreakdown?: Record<string, number>; // e.g., { "CAR LOAN": 500000, "GOLD LOAN": 200000 }
  assetBreakdown?: Record<string, number>; // e.g., { "Cash Balance": 100000, "Investment (Auto)": 50000 }
}

interface Tx {
  date: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  category: string;
}

/**
 * Aggregate assets from:
 * - Cash (derived from transactions net)
 * - User‑entered assets list
 * - Investment categories (auto-tracked from transactions)
 * - Suggested property assets (when property loans are detected)
 * - Real investments from investments table
 */
export function deriveAssets(
  transactions: Tx[], 
  userAssets: Asset[], 
  liabilities?: Liability[],
  investments?: Array<{
    id: string;
    name: string;
    type: string;
    currentValue: number;
    date: string;
    lastUpdated?: string;
  }>
): Asset[] {
  const totalCredits = transactions.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
  const totalDebits = transactions.filter(t => t.type === 'debit').reduce((s, t) => s + Math.abs(t.amount), 0);
  const cashValue = totalCredits - totalDebits;

  // Track investment categories from transactions
  const investmentCategories = ['Investment', 'Mutual Fund', 'Stocks', 'SIP', 'NPS', 'PPF', 'FD', 'Bonds'];
  const investmentTotals: Record<string, number> = {};
  const investmentFirstDates: Record<string, string> = {};
  
  transactions.forEach(t => {
    const category = t.category || '';
    const isInvestment = investmentCategories.some(ic => category.toLowerCase().includes(ic.toLowerCase()));
    
    if (isInvestment && t.type === 'debit') {
      // Investment purchase (debit means money going out to buy)
      investmentTotals[category] = (investmentTotals[category] || 0) + Math.abs(t.amount);
      
      // Track first transaction date for this investment category
      if (!investmentFirstDates[category] || t.date < investmentFirstDates[category]) {
        investmentFirstDates[category] = t.date;
      }
    } else if (isInvestment && t.type === 'credit') {
      // Investment redemption (credit means money coming back)
      investmentTotals[category] = (investmentTotals[category] || 0) - Math.abs(t.amount);
    }
  });

  const assets = userAssets.map(a => ({ ...a }));
  
  // Add auto-tracked investments
  Object.entries(investmentTotals).forEach(([category, value]) => {
    if (value > 0) {
      const existingAsset = assets.find(a => a.name === `${category} (Auto)` || a.id === `auto-inv-${category.toLowerCase().replace(/\s+/g, '-')}`);
      const createdOn = investmentFirstDates[category];
      
      if (!existingAsset) {
        assets.push({
          id: `auto-inv-${category.toLowerCase().replace(/\s+/g, '-')}`,
          name: `${category} (Auto)`,
          type: 'investment',
          currentValue: value,
          lastUpdated: new Date().toISOString().split('T')[0],
          createdOn
        });
      } else {
        const idx = assets.findIndex(a => a.id === existingAsset.id);
        if (idx >= 0) {
          assets[idx].currentValue = value;
          assets[idx].lastUpdated = new Date().toISOString().split('T')[0];
          if (!assets[idx].createdOn) {
            assets[idx].createdOn = createdOn;
          }
        }
      }
    }
  });

  // Add cash balance
  const existingCashAsset = assets.find(a => a.id === 'cash-auto');
  const roundedCashValue = Math.round(cashValue * 100) / 100; // Round to 2 decimal places
  
  // Find first transaction date for cash (earliest transaction)
  const cashCreatedOn = transactions.length > 0 
    ? transactions.sort((a, b) => a.date.localeCompare(b.date))[0].date 
    : new Date().toISOString().split('T')[0];
  
  if (!existingCashAsset) {
    assets.push({
      id: 'cash-auto',
      name: 'Cash Balance',
      type: 'cash',
      currentValue: roundedCashValue,
      lastUpdated: new Date().toISOString().split('T')[0],
      createdOn: cashCreatedOn
    });
  } else {
    const idx = assets.findIndex(a => a.id === 'cash-auto');
    if (idx >= 0) {
      assets[idx].currentValue = roundedCashValue;
      assets[idx].lastUpdated = new Date().toISOString().split('T')[0];
      if (!assets[idx].createdOn) {
        assets[idx].createdOn = cashCreatedOn;
      }
    }
  }
  
  // Add real investments from investments table (Stock, Mutual Fund, Crypto, ETF, etc.)
  if (investments && investments.length > 0) {
    investments.forEach(investment => {
      // Check if not already added
      const exists = assets.some(a => a.id === `investment-${investment.id}`);
      
      if (!exists) {
        assets.push({
          id: `investment-${investment.id}`,
          name: `${investment.name} (${investment.type})`,
          type: 'investment', // Standardized type for net worth
          currentValue: investment.currentValue,
          lastUpdated: investment.lastUpdated || new Date().toISOString().split('T')[0],
          createdOn: investment.date
        });
      }
    });
  }
  
  // Add suggested property assets based on property loans
  if (liabilities && liabilities.length > 0) {
    const suggestedProperties = derivePropertyAssetsFromLoans(transactions, liabilities);
    suggestedProperties.forEach(suggestedAsset => {
      // Only add if not already exists (user might have manually added it)
      const exists = assets.some(a => 
        a.type === 'property' && 
        a.name.toLowerCase().includes(suggestedAsset.name.replace(' (Suggested)', '').toLowerCase())
      );
      if (!exists) {
        assets.push(suggestedAsset);
      }
    });
    
    // Add suggested gold assets based on completed gold loans
    const suggestedGold = deriveGoldAssetsFromCompletedLoans(transactions, liabilities);
    suggestedGold.forEach(suggestedAsset => {
      // Only add if not already exists with the same name (user might have manually added it)
      const exists = assets.some(a => 
        a.name.toLowerCase().replace(' (suggested)', '').trim() === 
        suggestedAsset.name.toLowerCase().replace(' (suggested)', '').trim()
      );
      if (!exists) {
        assets.push(suggestedAsset);
      }
    });
  }
  
  return assets;
}

/**
 * Normalize category name by removing payment method suffixes
 */
function normalizeLoanCategory(category: string): string {
  return category
    .replace(/-UPI$/i, '')
    .replace(/-NEFT$/i, '')
    .replace(/-IMPS$/i, '')
    .replace(/-RTGS$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Detect property/plot loans and suggest corresponding assets
 * Returns suggested property assets based on loan amounts
 */
function derivePropertyAssetsFromLoans(transactions: Tx[], liabilities: Liability[]): Asset[] {
  const propertyKeywords = ['plot', 'land', 'property', 'home loan', 'house loan', 'mortgage'];
  const suggestedAssets: Asset[] = [];

  liabilities.forEach(liability => {
    const loanName = liability.name.toLowerCase();
    const isPropertyLoan = propertyKeywords.some(keyword => loanName.includes(keyword));
    
    if (isPropertyLoan) {
      const principal = getPrincipal(liability);
      
      // Estimate property value (typically 1.2x to 1.5x of loan amount for down payment consideration)
      // Using 1.27x as a reasonable estimate (assuming 20% down payment means loan is ~80% of value)
      const estimatedValue = Math.round(principal * 1.27);
      
      // Extract property name from loan name
      const propertyName = liability.name
        .replace(/loan/gi, '')
        .replace(/emi/gi, '')
        .replace(/\(auto\)/gi, '')
        .replace(/\(completed\)/gi, '')
        .trim();
      
      const assetId = `suggested-property-${liability.id}`;
      
      // Set createdOn to the loan start date (when property was acquired)
      const createdOn = liability.startDate || new Date().toISOString().split('T')[0];
      
      suggestedAssets.push({
        id: assetId,
        name: `${propertyName || 'Property'} (Suggested)`,
        type: 'property',
        currentValue: estimatedValue,
        lastUpdated: new Date().toISOString().split('T')[0],
        createdOn,
        isSuggested: true
      });
    }
  });

  return suggestedAssets;
}

/**
 * Detect completed gold loans and suggest corresponding gold assets
 * Uses the same separation logic as deriveGoldLoans to create individual assets
 */
function deriveGoldAssetsFromCompletedLoans(transactions: Tx[], liabilities: Liability[]): Asset[] {
  const suggestedAssets: Asset[] = [];
  
  // Use the same logic as deriveGoldLoans to separate gold loan periods
  const allGoldLoanTxs = transactions
    .filter(t => t.category.toLowerCase().includes('gold loan'))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const startEvents = allGoldLoanTxs.filter(
    t => t.type === 'credit' && t.amount > 50000
  );

  if (startEvents.length === 0) {
    return [];
  }

  for (let i = 0; i < startEvents.length; i++) {
    const startEvent = startEvents[i];
    const nextStartEvent = startEvents[i + 1];

    const startEventIndex = allGoldLoanTxs.findIndex(t => t === startEvent);
    const nextStartEventIndex = nextStartEvent
      ? allGoldLoanTxs.findIndex(t => t === nextStartEvent)
      : allGoldLoanTxs.length;

    const periodTxs = allGoldLoanTxs.slice(
      startEventIndex,
      nextStartEventIndex
    );

    const principal = startEvent.amount;
    const startDate = startEvent.date;

    // Check if this loan period is completed (same logic as deriveGoldLoans)
    const closureThreshold = principal * 0.8;
    const closureTxFound = periodTxs.find(
      t => t.type === 'debit' && Math.abs(t.amount) > closureThreshold
    );
    const isCompleted = !!closureTxFound;

    // Only create asset suggestion for completed loans
    if (isCompleted) {
      // Estimate gold value based on loan amount
      // Typically gold loans are 75% of gold value, so gold worth ~1.33x loan amount
      const estimatedGoldValue = Math.round(principal * 1.33);
      
      // Create name matching the liability naming pattern
      const goldName = startEvents.length > 1
        ? `GOLD ${i + 1}`
        : 'GOLD';
      
      const assetId = `suggested-gold-${i}-${startDate}`;
      
      // Set createdOn to the closure date (when gold was returned)
      const createdOn = closureTxFound ? closureTxFound.date : new Date().toISOString().split('T')[0];
      
      suggestedAssets.push({
        id: assetId,
        name: `${goldName} (Suggested)`,
        type: 'other',
        currentValue: estimatedGoldValue,
        lastUpdated: new Date().toISOString().split('T')[0],
        createdOn,
        isSuggested: true
      });
    }
  }

  return suggestedAssets;
}

function deriveGoldLoans(transactions: Tx[]): Liability[] {
  const allGoldLoanTxs = transactions
    .filter(t => t.category.toLowerCase().includes('gold loan'))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const startEvents = allGoldLoanTxs.filter(
    t => t.type === 'credit' && t.amount > 50000
  );

  if (startEvents.length === 0) {
    return [];
  }

  const derivedLiabilities: Liability[] = [];

  for (let i = 0; i < startEvents.length; i++) {
    const startEvent = startEvents[i];
    const nextStartEvent = startEvents[i + 1];

    const startEventIndex = allGoldLoanTxs.findIndex(t => t === startEvent);
    const nextStartEventIndex = nextStartEvent
      ? allGoldLoanTxs.findIndex(t => t === nextStartEvent)
      : allGoldLoanTxs.length;

    const periodTxs = allGoldLoanTxs.slice(
      startEventIndex,
      nextStartEventIndex
    );

    const period = {
      principal: startEvent.amount,
      startDate: startEvent.date,
    };

    // The closure transaction must be a debit and have an amount greater than 80% of the principal
    const closureThreshold = period.principal * 0.8;
    const closureTxFound = periodTxs.find(
      t => t.type === 'debit' && Math.abs(t.amount) > closureThreshold
    );
    const isCompleted = !!closureTxFound;

    const name =
      startEvents.length > 1
        ? `GOLD LOAN ${i + 1} (Auto)`
        : 'GOLD LOAN (Auto)';

    const finalName = isCompleted ? `${name} (Completed)` : name;

    // Calculate average EMI from debit transactions (excluding the large closure payment)
    const emiPayments = periodTxs.filter(
      t => t.type === 'debit' && Math.abs(t.amount) < closureThreshold
    );
    const avgEMI = emiPayments.length > 0
      ? emiPayments.reduce((sum, t) => sum + Math.abs(t.amount), 0) / emiPayments.length
      : 0;

    const liability = {
      id: `auto-gold-${i}-${startEvent.date}`,
      name: finalName,
      type: 'loan' as const,
      principal: period.principal,
      interestRateAnnual: 12, // Assume 12% for gold loans
      monthlyEMI: Math.round(avgEMI),
      startDate: period.startDate,
      is_auto_tracked: true,
      transactions: periodTxs,
    };
    derivedLiabilities.push(liability as Liability);
  }

  return derivedLiabilities;
}

function deriveLiabilitiesFromEmi(
  transactions: Tx[],
  userLiabilities: Liability[]
): Liability[] {
  const loanCategories = ['Loan', 'EMI', 'Mortgage', 'Credit Card'];
  const loanPayments: Record<
    string,
    {
      monthlyTotals: Record<string, number>;
      dates: string[];
    }
  > = {};

  transactions.forEach(t => {
    const category = t.category || '';
    const isLoan = loanCategories.some(lc =>
      category.toLowerCase().includes(lc.toLowerCase())
    );

    if (isLoan && t.type === 'debit') {
      // Normalize category to group similar payment methods together
      const normalizedCategory = normalizeLoanCategory(category);

      if (!loanPayments[normalizedCategory]) {
        loanPayments[normalizedCategory] = {
          monthlyTotals: {},
          dates: [],
        };
      }
      const month = t.date.substring(0, 7); // YYYY-MM
      loanPayments[normalizedCategory].monthlyTotals[month] =
        (loanPayments[normalizedCategory].monthlyTotals[month] || 0) +
        Math.abs(t.amount);
      loanPayments[normalizedCategory].dates.push(t.date);
    }
  });

  const autoTrackedLiabilities: Liability[] = [];

  for (const category in loanPayments) {
    const paymentData = loanPayments[category];
    paymentData.dates.sort();

    let currentLoanPeriod: {
      startDate: string;
      endDate: string;
      txDates: string[];
    } | null = null;
    const loanPeriods: {
      startDate: string;
      endDate: string;
      txDates: string[];
    }[] = [];

    for (let i = 0; i < paymentData.dates.length; i++) {
      const currentDate = new Date(paymentData.dates[i]);
      if (!currentLoanPeriod) {
        currentLoanPeriod = {
          startDate: paymentData.dates[i],
          endDate: paymentData.dates[i],
          txDates: [paymentData.dates[i]],
        };
      } else {
        const prevDate = new Date(paymentData.dates[i - 1]);
        const monthDiff =
          (currentDate.getFullYear() - prevDate.getFullYear()) * 12 +
          (currentDate.getMonth() - prevDate.getMonth());

        if (monthDiff > 3) {
          // Gap of more than 3 months indicates a new loan
          loanPeriods.push(currentLoanPeriod);
          currentLoanPeriod = {
            startDate: paymentData.dates[i],
            endDate: paymentData.dates[i],
            txDates: [paymentData.dates[i]],
          };
        } else {
          currentLoanPeriod.endDate = paymentData.dates[i];
          currentLoanPeriod.txDates.push(paymentData.dates[i]);
        }
      }
    }
    if (currentLoanPeriod) {
      loanPeriods.push(currentLoanPeriod);
    }

    loanPeriods.forEach((period, index) => {
      const periodTransactions = transactions.filter(
        t =>
          period.txDates.includes(t.date) &&
          normalizeLoanCategory(t.category) === category
      );

      const monthlyPayments = Object.values(paymentData.monthlyTotals);
      const averageEmi =
        monthlyPayments.reduce((a, b) => a + b, 0) / monthlyPayments.length;

      const name =
        loanPeriods.length > 1
          ? `${category} ${index + 1} (Auto)`
          : `${category} (Auto)`;

      // Avoid creating auto-tracked liabilities for which a manual one exists for the same period
      const manualLiabilityExists = userLiabilities.some(
        l =>
          normalizeLoanCategory(l.name) === category &&
          new Date(l.startDate) >= new Date(period.startDate) &&
          new Date(l.startDate) <= new Date(period.endDate)
      );

      if (!manualLiabilityExists) {
        // Estimate principal: Assume loan duration based on payment count
        // For ongoing loans, assume 5 years total; for completed ones, use actual payment count
        const paymentCount = period.txDates.length;
        const estimatedTotalMonths = paymentCount < 60 ? 60 : paymentCount; // Assume at least 5 years
        const estimatedPrincipal = Math.round(averageEmi * estimatedTotalMonths * 0.75); // ~75% to account for interest

        autoTrackedLiabilities.push({
          id: `auto-${category}-${index}-${period.startDate}`,
          name,
          type: 'loan',
          principal: estimatedPrincipal,
          interestRateAnnual: 10, // Assume 10% for general loans
          monthlyEMI: Math.round(averageEmi),
          startDate: period.startDate,
          is_auto_tracked: true,
          transactions: periodTransactions,
        } as Liability);
      }
    });
  }
  return autoTrackedLiabilities;
}

/**
 * Derive liabilities from loan/EMI transactions
 * Only creates auto-tracked loans for categories, not individual loan instances
 * Users should manually add specific loans if they want detailed tracking
 */
export function deriveLiabilities(
  transactions: Tx[],
  userLiabilities: Liability[]
): Liability[] {
  // Handle Gold Loans with special logic first
  const goldLoans = deriveGoldLoans(transactions);

  // Filter out gold loan transactions for general processing
  const nonGoldLoanTxs = transactions.filter(
    t => !t.category?.toLowerCase().includes('gold loan')
  );

  const emiBasedLiabilities = deriveLiabilitiesFromEmi(
    nonGoldLoanTxs,
    userLiabilities
  );

  const autoTracked = [...goldLoans, ...emiBasedLiabilities];

  // Filter out auto-tracked liabilities that have a corresponding manual entry
  const filteredAutoTracked = autoTracked.filter(auto => {
    const manualMatch = userLiabilities.find(manual => {
      const autoName = auto.name
        .replace(/ \d+ \(Auto\)/, ' (Auto)')
        .replace(' (Completed)', '');
      const manualName = manual.name + ' (Auto)';
      return autoName === manualName;
    });
    return !manualMatch;
  });

  // Combine manual liabilities from DB with filtered auto-tracked liabilities
  return [...userLiabilities, ...filteredAutoTracked];
}

/**
 * Get the principal amount (original loan amount)
 * Supports both old (openingPrincipal) and new (principal) formats
 */
export function getPrincipal(liability: Liability): number {
  return liability.principal ?? liability.openingPrincipal ?? 0;
}

/**
 * Calculate current remaining principal based on payments made
 * @param liability - The liability to calculate for
 * @param transactions - Transaction history (should be filtered to specific point in time for timeline)
 */
export function getCurrentPrincipal(liability: Liability, transactions?: Tx[]): number {
  const principal = getPrincipal(liability);
  
  if (!transactions || transactions.length === 0) {
    return liability.currentPrincipal ?? principal;
  }
  
  const monthlyRate = liability.interestRateAnnual / 12 / 100;
  const totalMonthlyPayment = liability.monthlyEMI + (liability.extraPaymentMonthly || 0);
  
  // Find all payments for this loan in the provided transaction set
  // Extract base category name (e.g., "GOLD LOAN 2 (Auto)" -> "GOLD LOAN")
  const loanName = liability.name
    .replace(/ \d+ \(Auto\)/, '') // Remove " 2 (Auto)"
    .replace(' (Auto)', '') // Remove " (Auto)"
    .replace(' (Completed)', ''); // Remove " (Completed)"
  const loanPayments = transactions.filter(t => 
    t.category?.toUpperCase().includes(loanName.toUpperCase()) && 
    t.type === 'debit'
  );
  
  if (loanPayments.length === 0) {
    // No payments yet in this time period
    return principal;
  }
  
  // Count unique months with payments
  const uniqueMonths = new Set(loanPayments.map(t => t.date.slice(0, 7)));
  const monthsPaid = uniqueMonths.size;
  
  // Calculate remaining principal based on number of payments made
  const remaining = calculateRemainingPrincipal(principal, monthlyRate, totalMonthlyPayment, monthsPaid);
  
  // Ensure we don't return NaN
  return isFinite(remaining) && !isNaN(remaining) ? remaining : principal;
}

/**
 * Calculate remaining principal after N months of payments using amortization
 */
function calculateRemainingPrincipal(
  openingPrincipal: number,
  monthlyRate: number,
  monthlyPayment: number,
  monthsPaid: number
): number {
  // Validate inputs
  if (openingPrincipal <= 0 || monthlyPayment <= 0) {
    return openingPrincipal;
  }

  if (monthlyRate === 0) {
    const remaining = openingPrincipal - (monthlyPayment * monthsPaid);
    // If loan is paid off (or overpaid), return 0
    return remaining <= 0 ? 0 : remaining;
  }
  
  // Check if payment covers at least the interest
  if (monthlyPayment <= openingPrincipal * monthlyRate) {
    // Payment doesn't cover interest, loan will never be paid off
    // Return a simple calculation instead
    return Math.max(0, openingPrincipal - (monthlyPayment * monthsPaid * 0.5));
  }
  
  // Use amortization formula to calculate remaining balance
  // Remaining = P * [(1 + r)^n - (1 + r)^p] / [(1 + r)^n - 1]
  // where P = opening principal, r = monthly rate, n = total months, p = months paid
  
  const onePlusR = 1 + monthlyRate;
  const numerator = Math.log(1 - (openingPrincipal * monthlyRate / monthlyPayment));
  const denominator = Math.log(onePlusR);
  const totalMonths = Math.ceil(-numerator / denominator);
  
  // Validate totalMonths
  if (!isFinite(totalMonths) || isNaN(totalMonths) || totalMonths < 0) {
    // Fallback to simple calculation
    return Math.max(0, openingPrincipal - (monthlyPayment * monthsPaid * 0.7));
  }
  
  // If paid equal or more months than total, loan is complete
  if (monthsPaid >= totalMonths) {
    return 0;
  }
  
  // Calculate remaining balance after p payments
  const remaining = openingPrincipal * (Math.pow(onePlusR, totalMonths) - Math.pow(onePlusR, monthsPaid)) / (Math.pow(onePlusR, totalMonths) - 1);
  
  // Validate result
  if (!isFinite(remaining) || isNaN(remaining) || remaining < 0) {
    // Fallback to simple calculation
    return Math.max(0, openingPrincipal - (monthlyPayment * monthsPaid * 0.7));
  }
  
  // Return 0 if remaining is negligible (< ₹10)
  return remaining < 10 ? 0 : remaining;
}

/**
 * Calculate remaining months for loan payoff using proper amortization formula
 * Also calculates total months and months already paid based on transaction history
 */
export function forecastLiability(liability: Liability, transactions?: Tx[]): {
  monthsRemaining: number | typeof Infinity;
  projectedPayoffDate: string;
  totalMonths?: number;
  monthsPaid?: number;
  adjustedCurrentPrincipal?: number;
  currentPrincipal: number;
} {
  if (liability.monthlyEMI <= 0) return { monthsRemaining: 0, projectedPayoffDate: 'N/A', currentPrincipal: 0 };
  
  const principal = getPrincipal(liability);
  const currentPrincipal = getCurrentPrincipal(liability, transactions);
  const monthlyRate = liability.interestRateAnnual / 12 / 100;
  const totalMonthlyPayment = liability.monthlyEMI + (liability.extraPaymentMonthly || 0);
  
  // Check if payment covers at least the interest
  const minInterest = currentPrincipal * monthlyRate;
  if (totalMonthlyPayment <= minInterest) {
    return { monthsRemaining: Infinity, projectedPayoffDate: 'Uncertain', currentPrincipal };
  }
  
  // Calculate total months from principal
  let totalMonths: number | undefined;
  if (monthlyRate === 0) {
    totalMonths = Math.ceil(principal / totalMonthlyPayment);
  } else {
    const numeratorTotal = Math.log(1 - (principal * monthlyRate / totalMonthlyPayment));
    const denominatorTotal = Math.log(1 + monthlyRate);
    totalMonths = Math.ceil(-numeratorTotal / denominatorTotal);
    // Validate totalMonths
    if (!isFinite(totalMonths) || totalMonths < 0 || isNaN(totalMonths)) {
      totalMonths = undefined;
    }
  }
  
  // Calculate months already paid from transaction history
  let monthsPaid: number | undefined;
  if (transactions && liability.startDate) {
    // Extract base category name (e.g., "GOLD LOAN 2 (Auto)" -> "GOLD LOAN")
    const loanName = liability.name
      .replace(/ \d+ \(Auto\)/, '') // Remove " 2 (Auto)"
      .replace(' (Auto)', '') // Remove " (Auto)"
      .replace(' (Completed)', ''); // Remove " (Completed)"
    const loanPayments = transactions.filter(t => 
      t.category?.toUpperCase().includes(loanName.toUpperCase()) && 
      t.type === 'debit' &&
      new Date(t.date) >= new Date(liability.startDate)
    );
    
    // Count unique months with payments
    const uniqueMonths = new Set(loanPayments.map(t => t.date.slice(0, 7)));
    monthsPaid = uniqueMonths.size;
  }
  
  // Use calculated current principal
  const adjustedCurrentPrincipal = currentPrincipal;
  const wasAdjusted = liability.currentPrincipal !== undefined && Math.abs(currentPrincipal - liability.currentPrincipal) > 1000;
  
  // Calculate remaining months from current principal
  let monthsRemaining: number;
  if (monthlyRate === 0) {
    // No interest case
    monthsRemaining = Math.ceil(adjustedCurrentPrincipal / totalMonthlyPayment);
  } else {
    // With interest - proper amortization formula
    const numerator = Math.log(1 - (adjustedCurrentPrincipal * monthlyRate / totalMonthlyPayment));
    const denominator = Math.log(1 + monthlyRate);
    monthsRemaining = Math.ceil(-numerator / denominator);
  }
  
  // Validate monthsRemaining
  if (!isFinite(monthsRemaining) || monthsRemaining < 0 || isNaN(monthsRemaining)) {
    return {
      monthsRemaining: 0,
      projectedPayoffDate: 'N/A',
      totalMonths,
      monthsPaid,
      adjustedCurrentPrincipal: wasAdjusted ? adjustedCurrentPrincipal : undefined,
      currentPrincipal
    };
  }
  
  const payoff = new Date();
  payoff.setMonth(payoff.getMonth() + monthsRemaining);
  
  return {
    monthsRemaining,
    projectedPayoffDate: payoff.toISOString().split('T')[0],
    totalMonths,
    monthsPaid,
    adjustedCurrentPrincipal: wasAdjusted ? adjustedCurrentPrincipal : undefined,
    currentPrincipal
  };
}

/**
 * Build historical net worth snapshots by month (uses end-of-month rolling asset/liability values)
 * Calculates liability balance as of each specific month based on payment history up to that point.
 */
export function buildNetWorthTimeline(transactions: Tx[], assets: Asset[], liabilities: Liability[]): NetWorthSnapshot[] {
  const months = Array.from(new Set(transactions.map(t => t.date.slice(0, 7)))).sort().reverse();
  return months.map(m => {
    const monthTx = transactions.filter(t => t.date.startsWith(m));
    const transactionsUpToMonth = transactions.filter(t => t.date.slice(0, 7) <= m);
    const monthAssets = deriveAssets(transactionsUpToMonth, assets.filter(a => a.type !== 'cash'));
    
    // Filter assets to only include those that existed in this specific month
    const filteredAssets = monthAssets.filter(a => {
      // Use createdOn date if available, otherwise fall back to lastUpdated
      const assetCreationDate = a.createdOn || a.lastUpdated;
      
      if (!assetCreationDate) {
        // No date info - include only if it has value
        return a.currentValue > 0;
      }
      
      // Asset should only appear in months on or after its creation date
      const assetMonth = assetCreationDate.slice(0, 7);
      return assetMonth <= m && a.currentValue > 0;
    });
    
    const totalAssets = filteredAssets.reduce((s, a) => s + a.currentValue, 0);
    
    // Build asset breakdown
    const assetBreakdown: Record<string, number> = {};
    filteredAssets.forEach(a => {
      if (a.currentValue > 0) {
        assetBreakdown[a.name] = a.currentValue;
      }
    });
    
    // Calculate liabilities as of this specific month
    const liabilityBreakdown: Record<string, number> = {};
    const activeLiabilities = liabilities.filter(l => {
      // Exclude completed loans
      if (l.name.includes('(Completed)')) return false;
      
      // For auto-tracked loans with stored transactions, use those
      if ((l as any).transactions && Array.isArray((l as any).transactions)) {
        const loanTxs = (l as any).transactions as Tx[];
        if (loanTxs.length === 0) return false;
        
        // Get first and last payment dates from the loan's own transactions
        const sortedTxs = loanTxs.filter(t => t.type === 'debit').sort((a, b) => a.date.localeCompare(b.date));
        if (sortedTxs.length === 0) return false;
        
        const firstPaymentMonth = sortedTxs[0].date.slice(0, 7);
        const lastPaymentMonth = sortedTxs[sortedTxs.length - 1].date.slice(0, 7);
        
        // Only include if this month is within the loan's active period
        return m >= firstPaymentMonth && m <= lastPaymentMonth;
      }
      
      // For manual loans, check if the start date is in or before this month
      if (l.startDate) {
        const startMonth = l.startDate.slice(0, 7);
        return m >= startMonth;
      }
      
      // Fallback: check transaction history
      const loanName = l.name
        .replace(/ \d+ \(Auto\)/, '')
        .replace(' (Auto)', '')
        .replace(' (Completed)', '');
      const allPayments = transactions.filter(t => 
        t.category?.toUpperCase().includes(loanName.toUpperCase()) && 
        t.type === 'debit'
      );
      
      if (allPayments.length === 0) return false;
      
      const firstPaymentDate = allPayments.sort((a, b) => a.date.localeCompare(b.date))[0].date.slice(0, 7);
      return firstPaymentDate <= m;
    });

    const totalLiabilities = activeLiabilities.reduce((s, l) => {
      const principal = getPrincipal(l);
      
      // Determine first payment month for this specific loan
      let firstPaymentMonth: string;
      
      if ((l as any).transactions && Array.isArray((l as any).transactions)) {
        const loanTxs = (l as any).transactions as Tx[];
        const sortedTxs = loanTxs.filter(t => t.type === 'debit').sort((a, b) => a.date.localeCompare(b.date));
        firstPaymentMonth = sortedTxs[0].date.slice(0, 7);
      } else {
        // Extract base category name for transaction matching
        const loanName = l.name
          .replace(/ \d+ \(Auto\)/, '')
          .replace(' (Auto)', '')
          .replace(' (Completed)', '');
        const allPayments = transactions.filter(t => 
          t.category?.toUpperCase().includes(loanName.toUpperCase()) && 
          t.type === 'debit'
        );
        firstPaymentMonth = allPayments.sort((a, b) => a.date.localeCompare(b.date))[0].date.slice(0, 7);
      }
      
      let loanBalance: number;
      // If this is theFIRST month of the loan, show full principal
      if (firstPaymentMonth === m) {
        loanBalance = principal;
      } else {
        // Otherwise, calculate remaining balance based on payments up to this month
        const transactionsUpToMonth = transactions.filter(t => t.date.slice(0, 7) <= m);
        loanBalance = getCurrentPrincipal(l, transactionsUpToMonth);
      }

      // Add to breakdown (use the display name for better readability)
      liabilityBreakdown[l.name] = loanBalance;
      
      return s + loanBalance;
    }, 0);
    
    return {
      month: m,
      totalAssets,
      totalLiabilities,
      netWorth: totalAssets - totalLiabilities,
      liabilityBreakdown,
      assetBreakdown
    };
  });
}

export function summarizeNetWorth(assets: Asset[], liabilities: Liability[], transactions?: Tx[]) {
  const totalAssets = assets.reduce((s, a) => s + a.currentValue, 0);
  // Exclude completed loans from liability calculation
  const activeLiabilities = liabilities.filter(l => !l.name.includes('(Completed)'));
  const totalLiabilities = activeLiabilities.reduce((s, l) => s + getCurrentPrincipal(l, transactions), 0);
  return {
    totalAssets,
    totalLiabilities,
    netWorth: totalAssets - totalLiabilities,
    debtRatio: totalAssets === 0 ? 0 : totalLiabilities / totalAssets
  };
}

// Legacy export using currentPrincipal for backward compatibility
export function summarizeNetWorthLegacy(assets: Asset[], liabilities: Liability[]) {
  const totalAssets = assets.reduce((s, a) => s + a.currentValue, 0);
  const totalLiabilities = liabilities.reduce((s, l) => s + (l.currentPrincipal ?? 0), 0);
  return {
    totalAssets,
    totalLiabilities,
    netWorth: totalAssets - totalLiabilities,
    debtRatio: totalAssets === 0 ? 0 : totalLiabilities / totalAssets
  };
}
