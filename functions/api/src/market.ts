/**
 * Server-side market price providers (Phase 4). Same provider logic as the
 * client `marketDataService`, but the IndianAPI key lives only here — the
 * browser never sees it. Results are cached per isolate (see index.ts TTLs).
 */

export interface MarketEnv {
  INDIAN_API_KEY?: string;
}

const GOLD_ETF_SYMBOLS = ['GOLDSHARE', 'GOLDBEES', 'SETFGOLD', 'HDFCGOLD', 'ICICIGOLD', 'KOTAKGOLD'];

export function normalizeType(symbol: string, type: string): string {
  return GOLD_ETF_SYMBOLS.includes(symbol) ? 'ETF' : type;
}

export async function fetchRealTimePrice(
  symbol: string,
  type: string,
  env: MarketEnv
): Promise<number | null> {
  try {
    type = normalizeType(symbol, type);

    // Crypto — CoinGecko (no key needed).
    if (type === 'Crypto' && symbol.endsWith('USD')) {
      const cryptoId = symbol.replace('USD', '').toLowerCase();
      const coinGeckoIds: Record<string, string> = {
        btc: 'bitcoin',
        eth: 'ethereum',
        sol: 'solana',
        ada: 'cardano',
        xrp: 'ripple',
      };
      const id = coinGeckoIds[cryptoId] || cryptoId;
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`
      );
      if (response.ok) {
        const data = await response.json();
        if (data[id]?.usd) return data[id].usd;
      }
    }

    // Physical gold — free endpoint with fixed fallback.
    if (type === 'Gold' || symbol === 'XAUUSD') {
      try {
        const response = await fetch(
          'https://api.metalpriceapi.com/v1/latest?api_key=demo&base=USD&currencies=XAU'
        );
        if (response.ok) {
          const data = await response.json();
          if (data.rates?.XAU) return 1 / data.rates.XAU;
        }
      } catch {
        // fall through to fixed approximation
      }
      return 2050;
    }

    const apiKey = env.INDIAN_API_KEY;
    if (!apiKey) {
      console.warn('[market] INDIAN_API_KEY not configured');
      return null;
    }

    // Indian stocks / ETFs.
    if (type === 'Stock' || type === 'ETF') {
      try {
        const response = await fetch(
          `https://stock.indianapi.in/stock?name=${encodeURIComponent(symbol)}`,
          { headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' } }
        );
        if (response.ok) {
          const data = await response.json();
          if (data.currentPrice?.NSE) {
            const price = parseFloat(data.currentPrice.NSE);
            if (!isNaN(price)) return price;
          }
          if (data.currentPrice?.BSE) {
            const price = parseFloat(data.currentPrice.BSE);
            if (!isNaN(price)) return price;
          }
        } else {
          console.error(`[market] IndianAPI.in error: ${response.status}`);
        }
      } catch (apiError) {
        console.error('[market] Error fetching from IndianAPI.in:', apiError);
      }
      return null;
    }

    // Mutual funds — NAV endpoint.
    if (type === 'Mutual Fund') {
      try {
        const response = await fetch(
          `https://stock.indianapi.in/mutual_funds_details?stock_name=${encodeURIComponent(symbol)}`,
          { headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' } }
        );
        if (response.ok) {
          const data = await response.json();
          if (data.nav) {
            const price = parseFloat(data.nav);
            if (!isNaN(price)) return price;
          }
          if (data.currentPrice) {
            const price = parseFloat(data.currentPrice);
            if (!isNaN(price)) return price;
          }
        } else {
          console.error(`[market] IndianAPI.in MF error: ${response.status}`);
        }
      } catch (apiError) {
        console.error('[market] Error fetching mutual fund:', apiError);
      }
      return null;
    }

    return null;
  } catch (error) {
    console.error('[market] Error fetching real-time price:', error);
    return null;
  }
}

export async function fetchHistoricalPrice(
  symbol: string,
  type: string,
  date: string,
  env: MarketEnv
): Promise<number | null> {
  try {
    type = normalizeType(symbol, type);

    // Crypto — CoinGecko history.
    if (type === 'Crypto' && symbol.endsWith('USD')) {
      const cryptoId = symbol.replace('USD', '').toLowerCase();
      const coinGeckoIds: Record<string, string> = {
        btc: 'bitcoin',
        eth: 'ethereum',
        sol: 'solana',
        ada: 'cardano',
        xrp: 'ripple',
      };
      const id = coinGeckoIds[cryptoId] || cryptoId;
      const dateObj = new Date(date);
      const day = String(dateObj.getDate()).padStart(2, '0');
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const year = dateObj.getFullYear();
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/${id}/history?date=${day}-${month}-${year}`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.market_data?.current_price?.usd) {
          return data.market_data.current_price.usd;
        }
      }
    }

    if (type === 'Gold' || symbol === 'XAUUSD') {
      return 2000;
    }

    if (type === 'Stock' || type === 'ETF') {
      const apiKey = env.INDIAN_API_KEY;
      if (!apiKey) {
        console.warn('[market] INDIAN_API_KEY not configured');
        return null;
      }
      try {
        const investmentDate = new Date(date);
        const daysDiff = Math.floor(
          (Date.now() - investmentDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        const response = await fetch(
          `https://stock.indianapi.in/stock?name=${encodeURIComponent(symbol)}`,
          { headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' } }
        );
        if (response.ok) {
          const data = await response.json();
          if (data.stockTechnicalData && Array.isArray(data.stockTechnicalData)) {
            const technicalData = data.stockTechnicalData;
            let closestPeriod = technicalData[0];
            let minDiff = Math.abs(daysDiff - technicalData[0].days);
            for (const period of technicalData) {
              const diff = Math.abs(daysDiff - period.days);
              if (diff < minDiff) {
                minDiff = diff;
                closestPeriod = period;
              }
            }
            if (closestPeriod.nsePrice) {
              const price = parseFloat(closestPeriod.nsePrice);
              if (!isNaN(price)) return price;
            }
            if (closestPeriod.bsePrice) {
              const price = parseFloat(closestPeriod.bsePrice);
              if (!isNaN(price)) return price;
            }
          }
          if (data.currentPrice?.NSE) {
            return parseFloat(data.currentPrice.NSE);
          }
        }
      } catch (apiError) {
        console.error('[market] Error fetching historical data:', apiError);
      }
      return null;
    }

    if (type === 'Mutual Fund') {
      console.warn('[market] Historical MF data unavailable; using current NAV.');
      return await fetchRealTimePrice(symbol, type, env);
    }

    return null;
  } catch (error) {
    console.error('[market] Error fetching historical price:', error);
    return null;
  }
}
