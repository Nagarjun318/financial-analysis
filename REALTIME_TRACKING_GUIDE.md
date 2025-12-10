# Real-Time Investment Tracking

## Overview
The investment portfolio now supports real-time price updates for Crypto and Gold investments using free public APIs.

## Features

### ✨ Real-Time Price Updates
- **Cryptocurrencies**: Bitcoin, Ethereum, Solana, Cardano, Ripple (via CoinGecko API)
- **Gold**: Live gold spot prices in USD (via Metal Price API)
- **Stocks**: Coming soon (requires API key)

### 🔄 Auto-Refresh
- Enable automatic price updates at configurable intervals
- **Crypto**: Updates every 30 seconds
- **Gold**: Updates every 5 minutes
- **Stocks**: Updates every 1 minute (when supported)

### 📊 Manual Refresh
- Click "Refresh Prices" button to update all tracked investments instantly
- Shows loading indicator during refresh
- Displays last refresh time

## Setup

### 1. Database Migration
Run the migration to add required columns:
```sql
-- See ADD_REALTIME_TRACKING.sql
ALTER TABLE investments ADD COLUMN quantity DECIMAL;
ALTER TABLE investments ADD COLUMN symbol VARCHAR(20);
ALTER TABLE investments ADD COLUMN last_updated TIMESTAMP;
ALTER TABLE investments ADD COLUMN auto_refresh BOOLEAN DEFAULT FALSE;
```

### 2. Adding Tracked Investments
When adding a new investment:
1. Enter the asset name (e.g., "Bitcoin", "Gold ETF")
2. Select the type (Crypto, Gold, Stock)
3. **Important**: Enter the quantity (e.g., 0.5 BTC, 10 shares)
4. The system will automatically detect the symbol

### 3. Enable Real-Time Tracking
- Click the "Auto-Refresh" button to enable automatic updates
- The button will turn blue and show "Live" when active
- Price updates happen in the background

## Supported Assets

### Cryptocurrencies
- **Bitcoin** (BTC): Detects from "Bitcoin", "BTC", "BTCUSD"
- **Ethereum** (ETH): Detects from "Ethereum", "ETH", "ETHUSD"
- **Solana** (SOL): Detects from "Solana", "SOL", "SOLUSD"
- **Cardano** (ADA): Detects from "Cardano", "ADA", "ADAUSD"
- **Ripple** (XRP): Detects from "Ripple", "XRP", "XRPUSD"

### Gold
- Detects from "Gold", "Gold ETF", "Sovereign Gold Bond", "Digital Gold"
- Uses live spot price in USD per ounce

### Stocks (Partial Support)
**Indian Stocks:**
- Reliance, TCS, Infosys, HDFC Bank, ICICI Bank
- Bharti Airtel, ITC, SBI, HUL, Maruti
- Bajaj Finance, Asian Paints, Wipro, Titan

**US Stocks:**
- Apple, Microsoft, Google, Amazon, Tesla
- Meta, NVIDIA, Netflix

*Note: Stock prices require additional API configuration*

## How It Works

### Price Calculation
```
Current Value = Quantity × Current Market Price
```

Example:
- You own **0.5 BTC**
- Current BTC price: **$45,000**
- Your current value: **$22,500**

### Symbol Detection
The system automatically detects ticker symbols from your investment name:
- "Bitcoin" → BTCUSD
- "Reliance Industries" → RELIANCE.NS
- "Apple Stock" → AAPL

### API Sources
- **CoinGecko API**: Free, no API key required, 50 calls/minute
- **Metal Price API**: Demo mode, free access
- **Stock APIs**: Requires configuration (finnhub.io, Alpha Vantage, etc.)

## Usage Tips

### Best Practices
1. **Always enter quantity** for accurate real-time tracking
2. **Use standard names** (e.g., "Bitcoin" not "BTC coin")
3. **Enable auto-refresh** only when you need live updates
4. **Disable auto-refresh** when not actively monitoring to save API calls

### Limitations
- Stock prices require additional API keys (not yet configured)
- Free APIs have rate limits (usually sufficient for personal use)
- Real Estate, Mutual Funds, and Bonds don't support real-time prices
- Gold prices are in USD (may need currency conversion for INR)

## Adding More Assets

To support additional cryptocurrencies or stocks, edit:
```typescript
// src/services/marketDataService.ts

const CRYPTO_SYMBOLS: Record<string, string> = {
  'newcoin': 'NEWCOINUSD',
  // Add more...
};

const indianStocks: Record<string, string> = {
  'company name': 'SYMBOL.NS',
  // Add more...
};
```

## API Configuration (Advanced)

For stock price support, add API keys to `.env.local`:
```env
VITE_ALPHA_VANTAGE_KEY=your_key_here
VITE_FINNHUB_KEY=your_key_here
```

Then update `fetchRealTimePrice()` function to use these APIs.

## Troubleshooting

### Prices not updating?
- Check that quantity is entered
- Verify the asset name is recognized
- Check console for API errors
- Ensure internet connection is stable

### "No symbol found" error?
- The asset name isn't in our database
- Try a more standard name (e.g., "Bitcoin" instead of "BTC")
- Add custom mapping in `marketDataService.ts`

### API rate limit reached?
- Disable auto-refresh temporarily
- Increase refresh intervals
- Consider upgrading to paid API plans

## Future Enhancements
- [ ] Currency conversion (USD to INR)
- [ ] Support for more stock exchanges
- [ ] Historical price charts
- [ ] Price alerts and notifications
- [ ] Portfolio rebalancing suggestions
- [ ] Mutual fund NAV tracking
