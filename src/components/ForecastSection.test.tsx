// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ForecastSection from './ForecastSection.tsx';
import type { ForecastViewModel } from '../hooks/useForecast.ts';
import { GEMINI_MODELS } from '../services/geminiService.ts';

function viewModel(overrides: Partial<ForecastViewModel> = {}): ForecastViewModel {
  return {
    enhancedForecast: undefined,
    isGeneratingForecast: false,
    forecastError: null,
    useAIForecast: true,
    selectedForecastModel: GEMINI_MODELS.FLASH_LITE,
    showForecastModelSelector: false,
    hasCachedForecast: false,
    isForecastExpanded: true,
    toggleForecastMode: vi.fn(),
    handleRegenerateForecast: vi.fn(),
    setSelectedForecastModel: vi.fn(),
    setShowForecastModelSelector: vi.fn(),
    setIsForecastExpanded: vi.fn(),
    ...overrides,
  };
}

describe('ForecastSection', () => {
  it('shows the error banner when generation failed', () => {
    render(<ForecastSection forecast={viewModel({ forecastError: 'boom' })} />);
    expect(screen.getByText(/forecast error/i)).toBeInTheDocument();
  });

  it('shows the cached indicator for a fresh cached AI forecast', () => {
    render(<ForecastSection forecast={viewModel({ hasCachedForecast: true })} />);
    expect(screen.getByText(/using cached forecast/i)).toBeInTheDocument();
  });

  it('toggle button switches modes', async () => {
    const user = userEvent.setup();
    const toggleForecastMode = vi.fn();
    render(<ForecastSection forecast={viewModel({ toggleForecastMode })} />);
    await user.click(screen.getByRole('button', { name: /ai forecast/i }));
    expect(toggleForecastMode).toHaveBeenCalledTimes(1);
  });

  it('regenerate button triggers regeneration', async () => {
    const user = userEvent.setup();
    const handleRegenerateForecast = vi.fn();
    render(<ForecastSection forecast={viewModel({ handleRegenerateForecast })} />);
    await user.click(screen.getByRole('button', { name: /regenerate/i }));
    expect(handleRegenerateForecast).toHaveBeenCalledTimes(1);
  });
});
