# Investment Value Calculation - Market-Based Growth

## Overview
Updated the investment current value calculation to reflect **real market performance** from the investment date. Instead of just manually entering values, the system now automatically calculates current value based on actual market growth.

## How It Works

### Formula
```
Current Value = Invested Amount × (1 + Market Growth Percentage)
```

Where:
```
Market Growth % = (Current Price - Historical Price) / Historical Price
```

### Example
**Investment Details:**
- Asset: Bitcoin
- Invested Amount: ₹65,000
- Investment Date: Dec 9, 2024
- Bitcoin Price on Dec 9: $42,000
- Bitcoin Price on Dec 10: $43,000

**Calculation:**
```
Market Growth = (43000 - 42000) / 42000 = 0.0238 (2.38%)
Current Value = ₹65,000 × (1 + 0.0238) = ₹65,547
```

So if Bitcoin goes up 2.38%, your investment automatically shows ₹65,547!

## Two Calculation Methods

The system supports **two ways** to calculate current value:

### Method 1: Quantity-Based (Precise)
**When to use:** You know exactly how many units you bought

```typescript
Current Value = Quantity × Current Market Price
```

**Example:**
- Bought: 0.5 BTC at ₹65,000
- Current BTC Price: $43,000 (₹3,600,000)
- Current Value = 0.5 × ₹3,600,000 = ₹1,800,000

### Method 2: Investment Amount-Based (Simplified)
**When to use:** You don't know the exact quantity, just the invested amount

```typescript
Current Value = Invested Amount × (Current Price / Historical Price)
```

**Example:**
- Invested: ₹65,000 in Bitcoin on Dec 9
- Bitcoin price increased by 2.38%
- Current Value = ₹65,000 × 1.0238 = ₹65,547

## Supported Assets

### ✅ **Crypto** (Full Support)
- Uses CoinGecko API
- Historical prices available from investment date
- Real-time updates every 30 seconds
- Supported: Bitcoin, Ethereum, Solana, Cardano, XRP

**Example Growth Calculation:**
```
Investment: ₹50,000 in Bitcoin on Dec 1
BTC on Dec 1: $40,000
BTC on Dec 10: $43,000
Growth: (43000 - 40000) / 40000 = 7.5%
Current Value: ₹50,000 × 1.075 = ₹53,750
```

### ✅ **Gold** (Partial Support)
- Uses Metal Price API
- Historical prices approximate (free API limitations)
- Real-time updates every 5 minutes
- Tracks price per ounce in USD

**Example Growth Calculation:**
```
Investment: ₹1,00,000 in Gold on Nov 15
Gold on Nov 15: $2,000/oz
Gold on Dec 10: $2,050/oz
Growth: (2050 - 2000) / 2000 = 2.5%
Current Value: ₹1,00,000 × 1.025 = ₹1,02,500
```

### ⚠️ **Stocks** (Manual for now)
- Free APIs don't provide historical stock data
- Requires paid API subscription (Alpha Vantage, Finnhub)
- Currently: manually enter current value
- Future: integrate paid API for auto-updates

## Changes Made

### 1. New Function: `fetchHistoricalPrice()`
**File:** `src/services/marketDataService.ts`

```typescript
export async function fetchHistoricalPrice(
  symbol: string, 
  type: string, 
  date: string
): Promise<number | null>
```

**What it does:**
- Fetches asset price on the investment date
- Uses CoinGecko history API for crypto
- Returns price in USD

**Example:**
```typescript
const historicalPrice = await fetchHistoricalPrice('BTCUSD', 'Crypto', '2024-12-09');
// Returns: 42000 (Bitcoin price on Dec 9)
```

### 2. Updated Function: `updateInvestmentValue()`
**File:** `src/services/marketDataService.ts`

```typescript
export async function updateInvestmentValue(
  investment: { 
    name: string; 
    type: string; 
    investedAmount: number; 
    date: string 
  },
  quantity?: number
): Promise<number | null>
```

**What changed:**
- Added `date` parameter to calculate from investment date
- Fetches both historical and current prices
- Calculates percentage change
- Applies growth to invested amount

**Logic Flow:**
```typescript
// 1. Get current price
const currentPrice = await fetchRealTimePrice(symbol, type);

// 2. If quantity provided, use precise calculation
if (quantity > 0) {
  return quantity × currentPrice;
}

// 3. Otherwise, calculate based on market growth
const historicalPrice = await fetchHistoricalPrice(symbol, type, date);
const priceChangePercent = (currentPrice - historicalPrice) / historicalPrice;
const currentValue = investedAmount × (1 + priceChangePercent);

return currentValue;
```

### 3. Updated InvestmentPage Refresh Logic
**File:** `src/components/InvestmentPage.tsx`

```typescript
const newValue = await updateInvestmentValue(
  {
    name: investment.name,
    type: investment.type,
    investedAmount: investment.investedAmount,
    date: investment.date  // 🆕 Now passes investment date
  },
  investment.quantity
);
```

**What changed:**
- Now passes investment date to calculation function
- Automatically calculates growth from investment date
- Updates database with new current value
- Shows last updated timestamp

## User Experience

### Scenario 1: Adding New Investment
**User Actions:**
1. Enters "Bitcoin" as asset name
2. Enters ₹65,000 as invested amount
3. Selects Dec 9, 2024 as investment date
4. Optionally enters quantity (0.5 BTC)
5. Clicks "Add Asset"

**System Response:**
- AI suggests Type: Crypto, Symbol: BTCUSD
- Saves investment with date
- On refresh: fetches Dec 9 Bitcoin price
- Calculates growth: (current - historical) / historical
- Updates current value automatically

### Scenario 2: Viewing Dashboard
**Dashboard displays:**
- Invested Amount: ₹65,000 (fixed)
- Current Value: ₹65,547 (auto-calculated)
- Profit: ₹547 (current - invested)
- Return: +0.84% (profit / invested × 100)
- Last Updated: Dec 10, 2024 3:45 PM

### Scenario 3: Auto-Refresh
**With auto-refresh enabled:**
- Every 30 seconds (crypto) or 5 minutes (gold)
- System fetches current market price
- Recalculates: invested × (current_price / historical_price)
- Updates display in real-time
- User sees value increase/decrease live

## Benefits

### 1. **Accurate Returns**
- Shows real market performance
- Not just guesswork or manual entry
- Reflects actual profit/loss

### 2. **Historical Context**
- Knows your entry price (from date)
- Calculates from your specific purchase date
- Not just "today's value"

### 3. **Automatic Updates**
- No need to manually check prices
- No need to calculate returns yourself
- Real-time portfolio tracking

### 4. **Flexible**
- Works with quantity (precise)
- Works without quantity (estimated)
- Adapts to available data

## Limitations & Future Improvements

### Current Limitations

1. **Stock Historical Data**
   - Free APIs don't provide stock history
   - Requires paid subscription
   - **Workaround:** Manual entry for now

2. **Gold Historical Accuracy**
   - Uses approximate averages
   - Free APIs have limited history
   - **Workaround:** Good enough for estimates

3. **Currency Conversion**
   - Prices fetched in USD
   - Need to convert to INR
   - **Workaround:** System handles conversion

### Planned Improvements

1. **Add Stock Support**
   - Integrate Alpha Vantage or Finnhub
   - Paid tier for historical data
   - Support NSE/BSE stocks

2. **Multiple Purchases**
   - Track multiple buys of same asset
   - Calculate weighted average cost
   - Show individual transaction returns

3. **Currency Selection**
   - Support multiple base currencies
   - Real-time forex conversion
   - User preference setting

4. **Performance Charts**
   - Graph value over time
   - Show growth trajectory
   - Compare to benchmarks

## API Usage

### CoinGecko (Free Tier)
**Historical Price:**
```
GET https://api.coingecko.com/api/v3/coins/{id}/history?date=09-12-2024
Response: {
  market_data: {
    current_price: { usd: 42000 }
  }
}
```

**Current Price:**
```
GET https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd
Response: { bitcoin: { usd: 43000 } }
```

### Metal Price API (Free Demo)
**Gold Price:**
```
GET https://api.metalpriceapi.com/v1/latest?api_key=demo&base=USD&currencies=XAU
Response: {
  rates: { XAU: 0.000488 }  // USD per ounce = 1 / 0.000488 = $2050
}
```

## Testing Checklist

- [x] Build completes successfully
- [x] Import updateInvestmentValue function
- [x] Pass investment date to calculation
- [x] Fetch historical price from API
- [x] Calculate percentage change
- [x] Apply growth to invested amount
- [x] Update database with new value
- [x] Display in UI with proper formatting

## Example Calculations

### Bitcoin Investment
```
Invested: ₹65,000 on Dec 9, 2024
BTC Price on Dec 9: $42,000
BTC Price on Dec 10: $43,000

Calculation:
Growth = (43000 - 42000) / 42000 = 2.38%
Current Value = 65000 × 1.0238 = ₹65,547
Profit = 65547 - 65000 = ₹547
Return = (547 / 65000) × 100 = 0.84%
```

### Gold Investment
```
Invested: ₹1,00,000 on Nov 15, 2024
Gold Price on Nov 15: $2,000/oz
Gold Price on Dec 10: $2,050/oz

Calculation:
Growth = (2050 - 2000) / 2000 = 2.5%
Current Value = 100000 × 1.025 = ₹1,02,500
Profit = 102500 - 100000 = ₹2,500
Return = (2500 / 100000) × 100 = 2.5%
```

## Console Logging

The system logs calculations for debugging:

```javascript
console.log(`Price change for Bitcoin: 2.38%`);
console.log(`Invested: ₹65000, Current: ₹65547.00`);
```

This helps verify calculations are working correctly.

## Summary

The new calculation method provides **accurate, market-based current values** that reflect real investment performance from the date of purchase. Whether you invested yesterday or months ago, the system tracks your actual returns based on real market data.

**Key Formula:**
```
Current Value = Invested Amount × (Today's Price / Investment Date Price)
```

This ensures your portfolio always shows real, accurate values! 📈
