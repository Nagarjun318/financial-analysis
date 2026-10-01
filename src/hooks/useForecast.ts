import React from 'react';
import { Transaction, ForecastResult } from '../types.ts';
import { generateAIForecast, type GeminiModel } from '../services/geminiService.ts';
import { buildForecast } from '../domain/analytics/forecast.ts';

/**
 * AI forecast state machine (extracted from Dashboard). Generates an AI
 * forecast when transactions change, caches it in localStorage for 24h,
 * falls back to the traditional forecast on errors, and supports manual
 * regeneration + AI/traditional mode toggling.
 */

const CACHE_TTL_HOURS = 24;

/** Pure helper (unit-tested): stable key for the forecast cache entry. */
export function buildForecastCacheKey(
  userId: string,
  transactions: Transaction[],
  model: GeminiModel
): string {
  const count = transactions.length;
  const lastDate = transactions.length > 0 ? transactions[transactions.length - 1].date : '';
  const totalAmount = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  return `forecast_${userId}_${count}_${lastDate}_${model}_${totalAmount.toFixed(0)}`;
}

/** Returns the cached forecast when fresh, otherwise null (and purges stale). */
export function loadCachedForecast(cacheKey: string): ForecastResult | null {
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      const cacheTime = new Date(parsed.timestamp).getTime();
      const now = new Date().getTime();
      const hoursDiff = (now - cacheTime) / (1000 * 60 * 60);

      if (hoursDiff < CACHE_TTL_HOURS) {
        return parsed.forecast as ForecastResult;
      } else {
        // Cache expired, remove it
        localStorage.removeItem(cacheKey);
      }
    }
  } catch (error) {
    console.error('Error loading cached forecast:', error);
  }
  return null;
}

/** Persists a forecast with the current timestamp. Failures are non-fatal. */
export function saveForecastToCache(cacheKey: string, forecast: ForecastResult): void {
  try {
    const cacheData = {
      forecast,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
  } catch (error) {
    console.error('Error saving forecast to cache:', error);
  }
}

function isTemporaryErrorMessage(message: string): boolean {
  return (
    message.includes('temporarily unavailable') ||
    message.includes('overloaded') ||
    message.includes('503')
  );
}

export interface ForecastViewModel {
  enhancedForecast: ForecastResult | undefined;
  isGeneratingForecast: boolean;
  forecastError: string | null;
  useAIForecast: boolean;
  selectedForecastModel: GeminiModel;
  showForecastModelSelector: boolean;
  hasCachedForecast: boolean;
  isForecastExpanded: boolean;
  toggleForecastMode: () => void;
  handleRegenerateForecast: () => Promise<void>;
  setSelectedForecastModel: (model: GeminiModel) => void;
  setShowForecastModelSelector: (show: boolean) => void;
  setIsForecastExpanded: (expanded: boolean) => void;
}

export function useForecast(
  allTransactions: Transaction[],
  baseForecast: ForecastResult | undefined,
  userId: string,
  defaultModel: GeminiModel
): ForecastViewModel {
  const [enhancedForecast, setEnhancedForecast] = React.useState(baseForecast as ForecastResult | undefined);
  const [isGeneratingForecast, setIsGeneratingForecast] = React.useState(false);
  const [forecastError, setForecastError] = React.useState(null as string | null);
  const [useAIForecast, setUseAIForecast] = React.useState(true);
  const [selectedForecastModel, setSelectedForecastModel] = React.useState(defaultModel);
  const [showForecastModelSelector, setShowForecastModelSelector] = React.useState(false);
  const [forecastCacheKey, setForecastCacheKey] = React.useState('');
  const [hasCachedForecast, setHasCachedForecast] = React.useState(false);
  const [isForecastExpanded, setIsForecastExpanded] = React.useState(false);

  // Generate AI forecast on mount and when transactions change
  React.useEffect(() => {
    const generateForecast = async () => {
      if (!useAIForecast || allTransactions.length === 0) {
        setEnhancedForecast(baseForecast);
        setHasCachedForecast(false);
        return;
      }

      // Generate cache key
      const cacheKey = buildForecastCacheKey(userId, allTransactions, selectedForecastModel);

      // Check if cache key changed
      if (cacheKey === forecastCacheKey && hasCachedForecast) {
        // Cache is still valid, don't regenerate
        return;
      }

      // Try to load from cache first
      const cachedForecast = loadCachedForecast(cacheKey);
      if (cachedForecast) {
        setEnhancedForecast(cachedForecast);
        setForecastCacheKey(cacheKey);
        setHasCachedForecast(true);
        setForecastError(null);
        return;
      }

      // No valid cache, generate new forecast
      setIsGeneratingForecast(true);
      setForecastError(null);

      try {
        const aiForecastData = await generateAIForecast(allTransactions, selectedForecastModel);
        const enhancedResult = buildForecast(allTransactions, 3, aiForecastData);
        setEnhancedForecast(enhancedResult);

        // Save to cache
        saveForecastToCache(cacheKey, enhancedResult);
        setForecastCacheKey(cacheKey);
        setHasCachedForecast(true);
      } catch (error) {
        console.error('Failed to generate AI forecast:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to generate AI forecast';

        if (isTemporaryErrorMessage(errorMessage)) {
          setForecastError('AI service temporarily unavailable. Showing traditional forecast. Please try regenerating in a few minutes.');
        } else {
          setForecastError(errorMessage);
        }

        // Fallback to traditional forecast
        setEnhancedForecast(baseForecast);
        setHasCachedForecast(false);

        // Auto-clear error after 10 seconds for temporary issues
        if (isTemporaryErrorMessage(errorMessage)) {
          setTimeout(() => setForecastError(null), 10000);
        }
      } finally {
        setIsGeneratingForecast(false);
      }
    };

    generateForecast();
  }, [allTransactions, baseForecast, useAIForecast, selectedForecastModel, forecastCacheKey, hasCachedForecast, userId]);

  const handleRegenerateForecast = React.useCallback(async () => {
    if (allTransactions.length === 0) return;

    // Clear cache to force regeneration
    setHasCachedForecast(false);
    setForecastCacheKey('');

    setIsGeneratingForecast(true);
    setForecastError(null);

    try {
      const aiForecastData = await generateAIForecast(allTransactions, selectedForecastModel);
      const enhancedResult = buildForecast(allTransactions, 3, aiForecastData);
      setEnhancedForecast(enhancedResult);

      // Save to cache
      const cacheKey = buildForecastCacheKey(userId, allTransactions, selectedForecastModel);
      saveForecastToCache(cacheKey, enhancedResult);
      setForecastCacheKey(cacheKey);
      setHasCachedForecast(true);
    } catch (error) {
      console.error('Failed to regenerate AI forecast:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to regenerate AI forecast';

      if (isTemporaryErrorMessage(errorMessage)) {
        setForecastError('AI service temporarily unavailable. Please try again in a few minutes.');
      } else {
        setForecastError(errorMessage);
      }

      // Auto-clear error after 10 seconds for temporary issues
      if (isTemporaryErrorMessage(errorMessage)) {
        setTimeout(() => setForecastError(null), 10000);
      }
    } finally {
      setIsGeneratingForecast(false);
    }
  }, [allTransactions, selectedForecastModel, userId]);

  const toggleForecastMode = () => {
    if (useAIForecast) {
      // Switching to traditional
      setEnhancedForecast(baseForecast);
    }
    setUseAIForecast(!useAIForecast);
  };

  return {
    enhancedForecast,
    isGeneratingForecast,
    forecastError,
    useAIForecast,
    selectedForecastModel,
    showForecastModelSelector,
    hasCachedForecast,
    isForecastExpanded,
    toggleForecastMode,
    handleRegenerateForecast,
    setSelectedForecastModel,
    setShowForecastModelSelector,
    setIsForecastExpanded,
  };
}
