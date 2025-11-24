# Net Worth & Liabilities Page

## Overview

The Net Worth page provides a comprehensive view of your financial health by tracking assets, liabilities, and calculating your net worth over time.

## Features

### 1. **Net Worth Summary**
- **Total Assets**: Sum of all your assets (cash, investments, property, etc.)
- **Total Liabilities**: Sum of all loans and debts
- **Net Worth**: Assets minus Liabilities
- **Debt Ratio**: Percentage of liabilities relative to assets

### 2. **Monthly Timeline**
- View historical net worth trends by month
- Track how assets and liabilities change over time
- Visual representation of financial progress

### 3. **Liability Management**
- Add and track multiple liabilities (loans, credit cards)
- Track for each liability:
  - Current principal amount
  - Interest rate (annual %)
  - Monthly EMI
  - Extra monthly payments
  - Start date
- **Automatic Payoff Forecast**: Calculates months remaining and projected payoff date

### 4. **Asset Management**
- Track multiple asset types:
  - Cash (auto-calculated from transactions)
  - Investments (mutual funds, NPS, stocks)
  - Property (real estate, land)
  - Other assets
- Manual value updates for non-cash assets

### 5. **Asset Allocation**
- View percentage breakdown of assets
- Understand your investment diversification

## How to Use

### Adding Liabilities

1. Click **"+ Add Liability"**
2. Enter liability details:
   - Name (e.g., "Car Loan", "Home Loan")
   - Principal amount
   - Interest rate (annual %)
   - Monthly EMI
   - Extra payment (optional)
3. System automatically calculates:
   - Months remaining
   - Projected payoff date

### Adding Assets

1. Click **"+ Add Asset"**
2. Enter asset details:
   - Name (e.g., "Mutual Funds", "Plot")
   - Type (investment, property, other)
   - Current value
3. Update values periodically to track appreciation/depreciation

### Cash Balance (Automatic)

The system automatically calculates your cash balance from your Finance transactions:
- Cash = Total Credits - Total Debits
- Updated in real-time as you add transactions

## Sample Data

The page comes pre-loaded with sample data:

**Sample Liabilities:**
- Plot Loan: ₹845,000 @ 8.5% (EMI: ₹18,000)
- Car Loan: ₹410,000 @ 9.2% (EMI: ₹15,500 + ₹2,000 extra)

**Sample Assets:**
- Mutual Funds: ₹350,000
- NPS: ₹120,000
- Plot (Book Value): ₹1,500,000

## Integration with Finance Page

The Net Worth page integrates with your Finance transactions:
- Automatically derives cash balance from transaction history
- Uses transaction dates to build monthly timeline
- Provides holistic view combining transaction data with assets/liabilities

## Best Practices

1. **Update Asset Values Regularly**: Monthly or quarterly updates help track accurate net worth
2. **Track Extra Payments**: Add extra payment amounts to see accelerated loan payoff
3. **Review Monthly Timeline**: Identify trends and ensure you're making financial progress
4. **Maintain Low Debt Ratio**: Aim to keep debt ratio below 30-40%

## Future Enhancements

Potential additions:
- Persist assets/liabilities to database
- Charts for net worth trends
- Debt payoff strategies (snowball vs avalanche)
- Interest saved calculator for extra payments
- Goal-based tracking (e.g., "Become debt-free by 2027")
- Import/export functionality
- Tax implications on asset sales

## Technical Details

### Files Structure
```
src/
  domain/networth/
    calculateNetWorth.ts   # Core business logic
  data/
    sampleLiabilities.ts   # Sample loan data
    sampleAssets.ts        # Sample asset data
  components/
    NetWorthPage.tsx       # Main UI component
```

### Key Functions

- `deriveAssets()`: Calculates cash from transactions + user assets
- `forecastLiability()`: Predicts loan payoff timeline
- `buildNetWorthTimeline()`: Creates monthly historical snapshots
- `summarizeNetWorth()`: Aggregates totals and ratios

### Data Types

```typescript
interface Liability {
  id: string;
  name: string;
  type: 'loan' | 'credit' | 'other';
  currentPrincipal: number;
  interestRateAnnual: number;
  monthlyEMI: number;
  extraPaymentMonthly?: number;
}

interface Asset {
  id: string;
  name: string;
  type: 'cash' | 'investment' | 'property' | 'other';
  currentValue: number;
}
```

## Navigation

Access the Net Worth page via the **Wallet** icon in the navigation bar.
