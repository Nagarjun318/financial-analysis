import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import {
  callGeminiAPI,
  clearGeminiCache,
  GEMINI_MODELS,
  BatchAbortedError,
  predictTransactionCategoriesBatch,
} from './geminiService';
import { updateInvestmentValue, clearMarketCache } from './marketDataService';

beforeEach(() => {
  // Force the legacy direct-provider path: local `.env` may define
  // VITE_FUNCTION_URL, which must never leak into these unit tests.
  vi.stubEnv('VITE_FUNCTION_URL', '');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  clearGeminiCache();
  clearMarketCache();
});

function mockFetchJson(payload: unknown) {
  return vi.fn(async () => ({
    ok: true,
    json: async () => payload,
  }));
}

describe('callGeminiAPI cache', () => {
  it('serves identical model+prompt from cache without refetching', async () => {
    vi.stubEnv('VITE_GEMINI_API_KEY', 'test-key');
    const fetchMock = mockFetchJson({
      candidates: [{ content: { parts: [{ text: 'hello' }] } }],
    });
    vi.stubGlobal('fetch', fetchMock);

    const first = await callGeminiAPI('prompt-a', GEMINI_MODELS.FLASH_LITE);
    const second = await callGeminiAPI('prompt-a', GEMINI_MODELS.FLASH_LITE);
    expect(first.text).toBe('hello');
    expect(second.text).toBe('hello');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('caches per prompt and per model', async () => {
    vi.stubEnv('VITE_GEMINI_API_KEY', 'test-key');
    const fetchMock = mockFetchJson({
      candidates: [{ content: { parts: [{ text: 'x' }] } }],
    });
    vi.stubGlobal('fetch', fetchMock);

    await callGeminiAPI('prompt-a', GEMINI_MODELS.FLASH_LITE);
    await callGeminiAPI('prompt-b', GEMINI_MODELS.FLASH_LITE);
    await callGeminiAPI('prompt-a', GEMINI_MODELS.FLASH_2_0);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

describe('predictTransactionCategoriesBatch abort', () => {
  it('stops at the first failed batch and keeps static partials', async () => {
    // Server path with no auth token → instant 401 (no network, no waiting).
    vi.stubEnv('VITE_FUNCTION_URL', 'https://function.test');
    const err = await predictTransactionCategoriesBatch([
      { id: 1, description: 'SWIGGY order 123', amount: -450 },
      { id: 2, description: 'mystery xyz qqq', amount: -100 },
    ]).catch((e) => e);
    expect(err).toBeInstanceOf(BatchAbortedError);
    expect(err.failedBatch).toBe(1);
    expect(err.partialResults).toEqual([{ id: 1, ai_category: 'Food' }]);
  });
});

describe('market price cache', () => {
  it('caches real-time crypto prices across updateInvestmentValue calls', async () => {
    const fetchMock = mockFetchJson({ bitcoin: { usd: 50000 } });
    vi.stubGlobal('fetch', fetchMock);

    const inv = { name: 'bitcoin', type: 'Crypto', investedAmount: 1000, date: '2024-01-01' };
    const first = await updateInvestmentValue(inv, 2);
    const second = await updateInvestmentValue(inv, 2);
    expect(first).toBe(100000);
    expect(second).toBe(100000);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    clearMarketCache();
    await updateInvestmentValue(inv, 2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
