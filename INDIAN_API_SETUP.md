# IndianAPI.in Integration Setup Guide

## Overview
Your investment tracker now supports **real-time tracking** for Indian Stocks, ETFs, and Mutual Funds using IndianAPI.in!

## Setup Steps

### 1. Get Your API Key
1. Visit: https://stock.indianapi.in
2. Sign up for an account
3. Navigate to API Keys section
4. Copy your API key

### 2. Add API Key to Environment
Add the following line to your `.env.local` file:

```env
VITE_INDIAN_API_KEY=your_actual_api_key_here
```

**Example `.env.local` file:**
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_INDIAN_API_KEY=ind_api_xxxxxxxxxxxxx
```

### 3. Restart Development Server
```bash
npm run dev
```

## Supported Assets

### ✅ Indian Stocks (NSE)
**Auto-tracked symbols:**
- Reliance Industries → `RELIANCE`
- TCS → `TCS`
- Infosys → `INFY`
- HDFC Bank → `HDFCBANK`
- ICICI Bank → `ICICIBANK`
- Bharti Airtel → `BHARTIARTL`
- ITC → `ITC`
- State Bank of India → `SBIN`
- Hindustan Unilever → `HINDUNILVR`
- Maruti → `MARUTI`
- Bajaj Finance → `BAJFINANCE`
- Asian Paints → `ASIANPAINT`
- Wipro → `WIPRO`
- Titan → `TITAN`
- Adani Enterprises → `ADANIENT`
- Tata Motors → `TATAMOTORS`
- Mahindra & Mahindra → `M&M`
- Axis Bank → `AXISBANK`
- Kotak Bank → `KOTAKBANK`
- L&T → `LT`

### ✅ ETFs
**Auto-tracked symbols:**
- UTI Gold ETF → `GOLDSHARE`
- Nippon India Gold BeES → `GOLDBEES`
- SBI Gold ETF → `SETFGOLD`
- HDFC Gold ETF → `HDFCGOLD`
- ICICI Prudential Gold ETF → `ICICIGOLD`
- Kotak Gold ETF → `KOTAKGOLD`
- Nifty BeES → `NIFTYBEES`
- Bank BeES → `BANKBEES`

### ✅ Mutual Funds
**Auto-tracked symbols:**
- HDFC Top 100 → `HDFC-TOP-100`
- SBI Bluechip → `SBI-BLUECHIP`
- ICICI Prudential → `ICICI-PRUD`
- Axis Bluechip → `AXIS-BLUECHIP`
- Mirae Asset → `MIRAE-ASSET`

## How It Works

### Real-Time Price Tracking
**IndianAPI.in provides:**
- Current market price (LTP - Last Traded Price)
- Historical price data
- Live market updates during trading hours

### Calculation Methods

#### Method 1: Quantity-Based
```typescript
Current Value = Quantity × Current Market Price
```

**Example:**
- Invested: ₹50,000 in TCS
- Quantity: 100 shares
- Current TCS Price: ₹3,600
- Current Value: 100 × ₹3,600 = ₹3,60,000

#### Method 2: Market Growth-Based
```typescript
Current Value = Invested Amount × (Current Price / Historical Price)
```

**Example:**
- Invested: ₹50,000 in TCS on Dec 1
- TCS Price on Dec 1: ₹3,500
- TCS Price on Dec 10: ₹3,600
- Growth: (3600 - 3500) / 3500 = 2.86%
- Current Value: ₹50,000 × 1.0286 = ₹51,430

### Auto-Refresh Intervals
- **Stocks**: Every 60 seconds (1 minute)
- **ETFs**: Every 60 seconds (1 minute)
- **Mutual Funds**: Every 300 seconds (5 minutes)
- **Crypto**: Every 30 seconds
- **Gold**: Every 300 seconds (5 minutes)

## Usage Example

### Adding a Stock Investment

1. **Click "Add Investment"**
2. **Enter Asset Name:** "Reliance Industries"
3. **AI Auto-Suggests:**
   - Type: Stock
   - Symbol: RELIANCE
4. **Enter Details:**
   - Invested Amount: ₹65,000
   - Investment Date: Dec 9, 2024
   - Quantity: 20 shares (optional)
5. **Enable Auto-Refresh**
6. **Watch Real-Time Updates!**

### Dashboard Display
```
Asset: Reliance Industries
Type: Stock
Symbol: RELIANCE
Quantity: 20 shares
Invested: ₹65,000
Current Value: ₹67,500 (auto-updated)
Profit: ₹2,500 (+3.85%)
Last Updated: Dec 10, 2024 3:45 PM
```

## API Endpoints Used

### Stock/ETF Current Price
```http
GET https://stock.indianapi.in/stock?name=GOLDSHARE
Headers:
  X-Api-Key: your_api_key
  Content-Type: application/json

Response:
{
  "companyName": "Uti Gold Fund Etf",
  "currentPrice": {
    "BSE": "108.20",
    "NSE": "108.20"
  },
  "stockTechnicalData": [
    {
      "days": 5,
      "bsePrice": "107.94",
      "nsePrice": "107.95"
    },
    {
      "days": 10,
      "bsePrice": "107.05",
      "nsePrice": "107.04"
    },
    {
      "days": 20,
      "bsePrice": "105.60",
      "nsePrice": "105.56"
    },
    {
      "days": 50,
      "bsePrice": "102.99",
      "nsePrice": "102.95"
    },
    {
      "days": 100,
      "bsePrice": "94.27",
      "nsePrice": "94.23"
    },
    {
      "days": 300,
      "bsePrice": "86.55",
      "nsePrice": "86.53"
    }
  ],
  "percentChange": "0.01",
  "yearHigh": "111.27",
  "yearLow": "63.55",
  "stockDetailsReusableData": {
    "close": "108.19",
    "date": "10 Dec 2025",
    "time": "06:07:27",
    "price": "108.20"
  }
}
```

### Mutual Fund NAV
```http
GET https://stock.indianapi.in/mutual_funds_details?stock_name=HDFC-TOP-100
Headers:
  X-Api-Key: your_api_key
  Content-Type: application/json

Response:
{
  "fundName": "HDFC Top 100 Fund",
  "nav": "845.67",
  "date": "2024-12-09"
}
```

### Historical Price Calculation
The system uses `stockTechnicalData` from the `/stock` endpoint to estimate historical prices by finding the closest matching time period (5, 10, 20, 50, 100, or 300 days ago).

## Features

### ✅ Automatic Symbol Detection
- AI automatically suggests the correct symbol
- Type "Reliance" → AI suggests "RELIANCE"
- Type "UTI Gold ETF" → AI suggests "GOLDSHARE"
- No need to manually look up symbols

### ✅ Real-Time NSE Prices
- Fetches current NSE (National Stock Exchange) prices
- Falls back to BSE if NSE unavailable
- Updates automatically during market hours
- Auto-refresh can be toggled on/off
- Manual refresh button available

### ✅ Historical Returns
- Calculates growth from your investment date
- Uses technical data for approximate historical prices
- Shows accurate profit/loss
- Percentage returns displayed

### ✅ Quantity Tracking
- Optional: Enter number of shares/units
- More precise calculation with quantity
- Falls back to market-growth method without quantity

### ✅ Last Updated Timestamp
- Shows when price was last fetched
- Indicates data freshness
- Updates with each refresh

## Troubleshooting

### API Key Not Working
**Check:**
1. API key correctly added to `.env.local`
2. Variable name is exactly: `VITE_INDIAN_API_KEY`
3. Development server restarted after adding key
4. No extra spaces in the key

### Symbol Not Found
**Solution:**
- Manually enter the symbol in the Symbol field
- Check NSE symbol on: https://www.nseindia.com
- For mutual funds, check AMFI code

### Prices Not Updating
**Possible Causes:**
1. **Market Closed**: Indian markets operate 9:15 AM - 3:30 PM IST
2. **API Rate Limit**: Check your API plan limits
3. **Network Issue**: Check console for errors
4. **Auto-Refresh Disabled**: Toggle auto-refresh on

### Historical Data Missing
**Note:** Historical data availability depends on:
- IndianAPI.in plan limits
- Symbol availability
- Date range (older dates may not be available)

**Fallback:** System will use current price for calculations if historical data unavailable

## Benefits

### 1. **Accurate Portfolio Tracking**
- Real market prices, not manual guesses
- Updated during trading hours
- Historical growth calculations

### 2. **Time Saving**
- No need to check prices manually
- Auto-refresh handles updates
- AI suggests correct symbols

### 3. **Indian Market Focus**
- NSE/BSE stocks fully supported
- Popular ETFs included
- Common mutual funds tracked

### 4. **Flexible Calculation**
- Works with or without quantity
- Adapts to available data
- Multiple fallback methods

## Adding Custom Symbols

If your stock/ETF/mutual fund isn't in the default mappings, you can:

1. **Manually enter the symbol** in the Symbol field when adding investment
2. **Or add it to the mapping** in `marketDataService.ts`:

```typescript
const INDIAN_STOCKS: Record<string, string> = {
  'your company name': 'NSE_SYMBOL',
  // ... existing mappings
};
```

## API Pricing

Visit https://stock.indianapi.in/pricing for latest pricing.

**Typical Plans:**
- **Free Tier**: Limited requests per month
- **Basic**: ~₹500-1000/month for regular use
- **Pro**: Higher limits for active tracking

**Recommendation:** Start with Basic plan for personal portfolio tracking.

## Next Steps

1. ✅ Set up API key
2. ✅ Add your stock investments
3. ✅ Enable auto-refresh
4. ✅ Watch your portfolio grow in real-time!

## Support

For IndianAPI.in support:
- Website: https://stock.indianapi.in
- Documentation: Check their API docs
- Support: Contact through their website

For app issues:
- Check browser console for errors
- Verify environment variables
- Ensure API key is valid

## Summary

Your investment tracker now provides **real-time tracking for Indian stocks, ETFs, and mutual funds** using IndianAPI.in! Simply add your API key, enable auto-refresh, and watch your portfolio update automatically! 📈
