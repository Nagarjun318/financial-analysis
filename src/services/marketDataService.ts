/**
 * Market Data Service - Real-time investment value tracking
 * Supports stocks, crypto, gold, and other asset types
 */

interface MarketPrice {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  lastUpdated: string;
}

interface AssetSymbolMapping {
  name: string;
  symbol: string;
  type: string;
}

// Common asset mappings
const CRYPTO_SYMBOLS: Record<string, string> = {
  'bitcoin': 'BTCUSD',
  'ethereum': 'ETHUSD',
  'btc': 'BTCUSD',
  'eth': 'ETHUSD',
  'solana': 'SOLUSD',
  'sol': 'SOLUSD',
  'cardano': 'ADAUSD',
  'ada': 'ADAUSD',
  'ripple': 'XRPUSD',
  'xrp': 'XRPUSD',
};

const GOLD_SYMBOLS = ['gold', 'gold etf', 'sovereign gold bond', 'sgb', 'digital gold'];

// Indian Market Symbols for IndianAPI.in
const INDIAN_STOCKS: Record<string, string> = {
  'reliance': 'RELIANCE',
  'tcs': 'TCS',
  'infosys': 'INFY',
  'hdfc bank': 'HDFCBANK',
  'icici bank': 'ICICIBANK',
  'bharti airtel': 'BHARTIARTL',
  'airtel': 'BHARTIARTL',
  'itc': 'ITC',
  'state bank': 'SBIN',
  'sbi': 'SBIN',
  'hindustan unilever': 'HINDUNILVR',
  'hul': 'HINDUNILVR',
  'maruti': 'MARUTI',
  'bajaj finance': 'BAJFINANCE',
  'asian paints': 'ASIANPAINT',
  'wipro': 'WIPRO',
  'titan': 'TITAN',
  'adani': 'ADANIENT',
  'tata motors': 'TATAMOTORS',
  'mahindra': 'M&M',
  'axis bank': 'AXISBANK',
  'kotak': 'KOTAKBANK',
  'larsen': 'LT',
  'l&t': 'LT',
};

const INDIAN_ETFS: Record<string, string> = {
  'uti gold': 'GOLDSHARE',
  'goldshare': 'GOLDSHARE',
  'gold bees': 'GOLDBEES',
  'nippon gold': 'GOLDBEES',
  'sbi gold': 'SETFGOLD',
  'hdfc gold': 'HDFCGOLD',
  'icici gold': 'ICICIGOLD',
  'kotak gold': 'KOTAKGOLD',
  'nifty bees': 'NIFTYBEES',
  'bank bees': 'BANKBEES',
};

const INDIAN_MUTUAL_FUNDS: Record<string, string> = {
  'hdfc top 100': 'HDFC-TOP-100',
  'sbi bluechip': 'SBI-BLUECHIP',
  'icici prudential': 'ICICI-PRUD',
  'axis bluechip': 'AXIS-BLUECHIP',
  'mirae asset': 'MIRAE-ASSET',
};

/**
 * Extract ticker symbol from investment name
 */
export function extractSymbol(name: string, type: string): string | null {
  const nameLower = name.toLowerCase().trim();
  
  // Check for Gold ETFs first (before checking type) to handle mis-categorization
  // Common gold ETF patterns
  const goldEtfPatterns = ['gold etf', 'uti gold', 'goldshare', 'gold bees', 'goldbees', 
                           'sbi gold', 'hdfc gold', 'icici gold', 'kotak gold'];
  
  for (const pattern of goldEtfPatterns) {
    if (nameLower.includes(pattern)) {
      // It's a Gold ETF, not physical gold
      for (const [key, symbol] of Object.entries(INDIAN_ETFS)) {
        if (nameLower.includes(key)) {
          console.log(`Detected Gold ETF: ${name} → ${symbol}`);
          return symbol;
        }
      }
      // Default gold ETF
      console.log(`Detected Gold ETF (default): ${name} → GOLDSHARE`);
      return 'GOLDSHARE';
    }
  }
  
  // Crypto
  if (type === 'Crypto') {
    for (const [key, symbol] of Object.entries(CRYPTO_SYMBOLS)) {
      if (nameLower.includes(key)) {
        return symbol;
      }
    }
    return null;
  }
  
  // Physical Gold (only if not an ETF)
  if (type === 'Gold') {
    console.log(`Detected Physical Gold: ${name} → XAUUSD`);
    return 'XAUUSD'; // Gold spot price in USD
  }
  
  // Indian Stocks - extract symbols for IndianAPI.in
  if (type === 'Stock') {
    for (const [key, symbol] of Object.entries(INDIAN_STOCKS)) {
      if (nameLower.includes(key)) {
        return symbol;
      }
    }
    return null;
  }
  
  // ETFs
  if (type === 'ETF') {
    for (const [key, symbol] of Object.entries(INDIAN_ETFS)) {
      if (nameLower.includes(key)) {
        return symbol;
      }
    }
    // Check if it's a gold ETF
    if (nameLower.includes('gold')) {
      return 'GOLDSHARE';
    }
    return null;
  }
  
  // Mutual Funds
  if (type === 'Mutual Fund') {
    for (const [key, symbol] of Object.entries(INDIAN_MUTUAL_FUNDS)) {
      if (nameLower.includes(key)) {
        return symbol;
      }
    }
    return null;
  }
  
  return null;
}

/**
 * Fetch historical price on a specific date (for calculating returns from investment date)
 */
export async function fetchHistoricalPrice(symbol: string, type: string, date: string): Promise<number | null> {
  try {
    // Check if symbol is a Gold ETF (should use stock API, not gold API)
    const goldEtfSymbols = ['GOLDSHARE', 'GOLDBEES', 'SETFGOLD', 'HDFCGOLD', 'ICICIGOLD', 'KOTAKGOLD'];
    const isGoldEtf = goldEtfSymbols.includes(symbol);
    
    if (isGoldEtf) {
      console.log(`${symbol} is a Gold ETF, using IndianAPI.in for historical data`);
      // Override type to ensure it uses stock API
      type = 'ETF';
    }
    
    // For Crypto - use CoinGecko historical API
    if (type === 'Crypto' && symbol.endsWith('USD')) {
      const cryptoId = symbol.replace('USD', '').toLowerCase();
      const coinGeckoIds: Record<string, string> = {
        'btc': 'bitcoin',
        'eth': 'ethereum',
        'sol': 'solana',
        'ada': 'cardano',
        'xrp': 'ripple',
      };
      
      const id = coinGeckoIds[cryptoId] || cryptoId;
      
      // Convert date to dd-mm-yyyy format required by CoinGecko
      const dateObj = new Date(date);
      const day = String(dateObj.getDate()).padStart(2, '0');
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const year = dateObj.getFullYear();
      const formattedDate = `${day}-${month}-${year}`;
      
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/${id}/history?date=${formattedDate}`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.market_data?.current_price?.usd) {
          return data.market_data.current_price.usd;
        }
      }
    }
    
    // For Gold - approximate based on known price movements
    // Note: Free APIs don't provide historical gold data easily
    // You could use historical averages or a paid API
    if (type === 'Gold' || symbol === 'XAUUSD') {
      // Fallback: use approximate historical average
      // This is a simplified approach - consider using a paid API for accurate data
      return 2000; // Approximate average gold price
    }
    
    // For Indian Stocks and ETFs - use IndianAPI.in stock technical data
    if (type === 'Stock' || type === 'ETF') {
      const apiKey = import.meta.env.VITE_INDIAN_API_KEY;
      
      if (!apiKey) {
        console.warn('IndianAPI.in API key not configured');
        return null;
      }
      
      try {
        // Calculate days difference from investment date to today
        const investmentDate = new Date(date);
        const today = new Date();
        const daysDiff = Math.floor((today.getTime() - investmentDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // Fetch stock data with technical history
        const response = await fetch(
          `https://stock.indianapi.in/stock?name=${encodeURIComponent(symbol)}`,
          {
            headers: {
              'X-Api-Key': apiKey,
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          
          // stockTechnicalData contains price at 5, 10, 20, 50, 100, 300 days ago
          if (data.stockTechnicalData && Array.isArray(data.stockTechnicalData)) {
            // Find the closest matching period
            const technicalData = data.stockTechnicalData;
            
            // Find closest days period
            let closestPeriod = technicalData[0];
            let minDiff = Math.abs(daysDiff - technicalData[0].days);
            
            for (const period of technicalData) {
              const diff = Math.abs(daysDiff - period.days);
              if (diff < minDiff) {
                minDiff = diff;
                closestPeriod = period;
              }
            }
            
            // Use NSE price from closest period
            if (closestPeriod.nsePrice) {
              const price = parseFloat(closestPeriod.nsePrice);
              if (!isNaN(price)) {
                console.log(`Historical price for ${symbol} (~${closestPeriod.days} days ago): ₹${price}`);
                return price;
              }
            }
            
            // Fallback to BSE
            if (closestPeriod.bsePrice) {
              const price = parseFloat(closestPeriod.bsePrice);
              if (!isNaN(price)) {
                return price;
              }
            }
          }
          
          console.warn(`No historical data found for ${symbol}. Using current price as fallback.`);
          // Fallback: use current price (assumes no change)
          if (data.currentPrice?.NSE) {
            return parseFloat(data.currentPrice.NSE);
          }
        }
      } catch (apiError) {
        console.error('Error fetching historical data from IndianAPI.in:', apiError);
      }
      
      return null;
    }
    
    // For Mutual Funds - historical data may not be available in the same way
    // Use current NAV as approximation
    if (type === 'Mutual Fund') {
      console.warn('Historical mutual fund data not available. Using current NAV.');
      return await fetchRealTimePrice(symbol, type);
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching historical price:', error);
    return null;
  }
}

/**
 * Fetch real-time price from multiple free APIs with fallbacks
 */
export async function fetchRealTimePrice(symbol: string, type: string): Promise<number | null> {
  try {
    // Check if symbol is a Gold ETF (should use stock API, not gold API)
    const goldEtfSymbols = ['GOLDSHARE', 'GOLDBEES', 'SETFGOLD', 'HDFCGOLD', 'ICICIGOLD', 'KOTAKGOLD'];
    const isGoldEtf = goldEtfSymbols.includes(symbol);
    
    if (isGoldEtf) {
      console.log(`${symbol} is a Gold ETF, using IndianAPI.in stock endpoint`);
      // Override type to ensure it uses stock API
      type = 'ETF';
    }
    
    // For Crypto - use CoinGecko API (free, no API key needed)
    if (type === 'Crypto' && symbol.endsWith('USD')) {
      const cryptoId = symbol.replace('USD', '').toLowerCase();
      const coinGeckoIds: Record<string, string> = {
        'btc': 'bitcoin',
        'eth': 'ethereum',
        'sol': 'solana',
        'ada': 'cardano',
        'xrp': 'ripple',
      };
      
      const id = coinGeckoIds[cryptoId] || cryptoId;
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data[id]?.usd) {
          return data[id].usd;
        }
      }
    }
    
    // For Gold - use free gold API
    if (type === 'Gold' || symbol === 'XAUUSD') {
      const response = await fetch('https://api.metalpriceapi.com/v1/latest?api_key=demo&base=USD&currencies=XAU');
      if (response.ok) {
        const data = await response.json();
        if (data.rates?.XAU) {
          // Convert to price per ounce (rates give USD per ounce)
          return 1 / data.rates.XAU;
        }
      }
      
      // Fallback: use a fixed approximate gold price (updated periodically)
      return 2050; // Approximate USD per ounce
    }
    
    // For Indian Stocks and ETFs - use IndianAPI.in /stock endpoint
    if (type === 'Stock' || type === 'ETF') {
      const apiKey = import.meta.env.VITE_INDIAN_API_KEY;
      
      if (!apiKey) {
        console.warn('IndianAPI.in API key not configured. Set VITE_INDIAN_API_KEY in .env file');
        return null;
      }
      
      try {
        // IndianAPI.in stock endpoint - accepts symbol name
        const response = await fetch(`https://stock.indianapi.in/stock?name=${encodeURIComponent(symbol)}`, {
          headers: {
            'X-Api-Key': apiKey,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          
          // Extract NSE price from currentPrice object
          if (data.currentPrice?.NSE) {
            const price = parseFloat(data.currentPrice.NSE);
            if (!isNaN(price)) {
              console.log(`Fetched ${symbol} price from NSE: ₹${price}`);
              return price;
            }
          }
          
          // Fallback to BSE if NSE not available
          if (data.currentPrice?.BSE) {
            const price = parseFloat(data.currentPrice.BSE);
            if (!isNaN(price)) {
              console.log(`Fetched ${symbol} price from BSE: ₹${price}`);
              return price;
            }
          }
          
          console.warn(`No valid price found for ${symbol}`, data);
        } else {
          console.error(`IndianAPI.in error: ${response.status} - ${response.statusText}`);
        }
      } catch (apiError) {
        console.error('Error fetching from IndianAPI.in:', apiError);
      }
      
      return null;
    }
    
    // For Mutual Funds - use IndianAPI.in /mutual_funds_details endpoint
    if (type === 'Mutual Fund') {
      const apiKey = import.meta.env.VITE_INDIAN_API_KEY;
      
      if (!apiKey) {
        console.warn('IndianAPI.in API key not configured');
        return null;
      }
      
      try {
        // IndianAPI.in mutual funds endpoint
        const response = await fetch(`https://stock.indianapi.in/mutual_funds_details?stock_name=${encodeURIComponent(symbol)}`, {
          headers: {
            'X-Api-Key': apiKey,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          
          // Extract NAV (Net Asset Value) for mutual funds
          if (data.nav) {
            const price = parseFloat(data.nav);
            if (!isNaN(price)) {
              console.log(`Fetched ${symbol} NAV: ₹${price}`);
              return price;
            }
          }
          
          // Alternative field names
          if (data.currentPrice) {
            const price = parseFloat(data.currentPrice);
            if (!isNaN(price)) {
              return price;
            }
          }
          
          console.warn(`No valid NAV found for mutual fund ${symbol}`, data);
        } else {
          console.error(`IndianAPI.in MF error: ${response.status} - ${response.statusText}`);
        }
      } catch (apiError) {
        console.error('Error fetching mutual fund from IndianAPI.in:', apiError);
      }
      
      return null;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching real-time price:', error);
    return null;
  }
}

/**
 * Update investment value based on quantity and current market price
 * Or calculate based on invested amount and price change since investment date
 */
export async function updateInvestmentValue(
  investment: { name: string; type: string; investedAmount: number; date: string },
  quantity?: number
): Promise<number | null> {
  console.log('\n=== UPDATE INVESTMENT VALUE ===');
  console.log('Investment:', {
    name: investment.name,
    type: investment.type,
    investedAmount: investment.investedAmount,
    date: investment.date,
    quantity: quantity
  });
  
  const symbol = extractSymbol(investment.name, investment.type);
  
  console.log('Extracted Symbol:', symbol);
  
  if (!symbol) {
    console.log(`❌ No symbol found for ${investment.name}`);
    return null;
  }
  
  const currentPrice = await fetchRealTimePrice(symbol, investment.type);
  
  console.log('Current Market Price:', currentPrice);
  
  if (!currentPrice) {
    console.log(`❌ No price data available for ${symbol}`);
    return null;
  }
  
  // If quantity is provided, calculate based on quantity * price
  if (quantity && quantity > 0) {
    const calculatedValue = quantity * currentPrice;
    console.log('\n--- QUANTITY-BASED CALCULATION ---');
    console.log(`Quantity: ${quantity}`);
    console.log(`Current Price: ₹${currentPrice}`);
    console.log(`Current Value = ${quantity} × ₹${currentPrice} = ₹${calculatedValue.toFixed(2)}`);
    console.log('================================\n');
    return calculatedValue;
  }
  
  // Calculate based on invested amount and market growth since investment date
  const historicalPrice = await fetchHistoricalPrice(symbol, investment.type, investment.date);
  
  console.log('Historical Price (on investment date):', historicalPrice);
  
  if (historicalPrice && historicalPrice > 0) {
    // Calculate percentage change
    const priceChangePercent = ((currentPrice - historicalPrice) / historicalPrice);
    
    // Apply to invested amount
    const currentValue = investment.investedAmount * (1 + priceChangePercent);
    
    console.log('\n--- MARKET-GROWTH CALCULATION ---');
    console.log(`Historical Price: ₹${historicalPrice}`);
    console.log(`Current Price: ₹${currentPrice}`);
    console.log(`Price Change: ${(priceChangePercent * 100).toFixed(2)}%`);
    console.log(`Invested Amount: ₹${investment.investedAmount}`);
    console.log(`Current Value = ₹${investment.investedAmount} × (1 + ${(priceChangePercent * 100).toFixed(2)}%) = ₹${currentValue.toFixed(2)}`);
    console.log('================================\n');
    
    return currentValue;
  }
  
  console.log('❌ No historical data available, cannot calculate returns');
  // If no historical data, estimate quantity from current price
  // Assume user bought at roughly current price if no historical data available
  return null;
}

/**
 * Batch update multiple investments
 */
export async function batchUpdateInvestmentValues(
  investments: Array<{ id: string; name: string; type: string; investedAmount: number; currentValue: number }>
): Promise<Map<string, number>> {
  const updates = new Map<string, number>();
  
  for (const investment of investments) {
    const symbol = extractSymbol(investment.name, investment.type);
    if (symbol && (investment.type === 'Crypto' || investment.type === 'Gold')) {
      const price = await fetchRealTimePrice(symbol, investment.type);
      if (price) {
        // For crypto/gold, we need to know quantity
        // Estimate: if user hasn't changed value, calculate based on initial investment
        const estimatedQuantity = investment.investedAmount / (investment.currentValue / investment.investedAmount || 1);
        updates.set(investment.id, price * estimatedQuantity);
      }
    }
  }
  
  return updates;
}

/**
 * Auto-refresh configuration
 */
export const REFRESH_INTERVALS = {
  CRYPTO: 30000, // 30 seconds
  GOLD: 300000, // 5 minutes
  STOCK: 60000, // 1 minute
  ETF: 60000, // 1 minute
  MUTUAL_FUND: 300000, // 5 minutes (mutual funds update less frequently)
  DEFAULT: 300000, // 5 minutes
};

export function getRefreshInterval(type: string): number {
  switch (type) {
    case 'Crypto':
      return REFRESH_INTERVALS.CRYPTO;
    case 'Gold':
      return REFRESH_INTERVALS.GOLD;
    case 'Stock':
      return REFRESH_INTERVALS.STOCK;
    case 'ETF':
      return REFRESH_INTERVALS.ETF;
    case 'Mutual Fund':
      return REFRESH_INTERVALS.MUTUAL_FUND;
    default:
      return REFRESH_INTERVALS.DEFAULT;
  }
}
