import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildForecastCacheKey,
  loadCachedForecast,
  saveForecastToCache,
} from './useForecast.ts';
import { GEMINI_MODELS } from '../services/geminiService.ts';
import type { ForecastResult } from '../types.ts';
import type { Transaction } from '../types.ts';

const transactions = [
  { id: 1, user_id: 'u1', date: '2026-09-01', description: 'Salary', amount: 50000, category: 'Salary', type: 'credit' },
  { id: 2, user_id: 'u1', date: '2026-09-02', description: 'Groceries', amount: -2500, category: 'Food', type: 'debit' },
] as Transaction[];

const forecast = { monthly: [], total: 0 } as unknown as ForecastResult;

beforeEach(() => {
  localStorage.clear();
});

describe('buildForecastCacheKey', () => {
  it('is stable for the same inputs and varies by user/model/data', () => {
    const a = buildForecastCacheKey('u1', transactions, GEMINI_MODELS.FLASH_LITE);
    const b = buildForecastCacheKey('u1', transactions, GEMINI_MODELS.FLASH_LITE);
    expect(a).toBe(b);
    expect(buildForecastCacheKey('u2', transactions, GEMINI_MODELS.FLASH_LITE)).not.toBe(a);
    expect(buildForecastCacheKey('u1', transactions, GEMINI_MODELS.PRO_LATEST)).not.toBe(a);
    expect(buildForecastCacheKey('u1', transactions.slice(0, 1), GEMINI_MODELS.FLASH_LITE)).not.toBe(a);
  });
});

describe('forecast localStorage cache', () => {
  it('round-trips a fresh forecast', () => {
    const key = buildForecastCacheKey('u1', transactions, GEMINI_MODELS.FLASH_LITE);
    expect(loadCachedForecast(key)).toBeNull();
    saveForecastToCache(key, forecast);
    expect(loadCachedForecast(key)).toEqual(forecast);
  });

  it('purges entries older than 24h', () => {
    const key = buildForecastCacheKey('u1', transactions, GEMINI_MODELS.FLASH_LITE);
    localStorage.setItem(
      key,
      JSON.stringify({ forecast, timestamp: new Date(Date.now() - 25 * 3600 * 1000).toISOString() })
    );
    expect(loadCachedForecast(key)).toBeNull();
    expect(localStorage.getItem(key)).toBeNull();
  });

  it('returns null on corrupt entries instead of throwing', () => {
    const key = buildForecastCacheKey('u1', transactions, GEMINI_MODELS.FLASH_LITE);
    localStorage.setItem(key, 'not-json{{{');
    expect(loadCachedForecast(key)).toBeNull();
  });
});
