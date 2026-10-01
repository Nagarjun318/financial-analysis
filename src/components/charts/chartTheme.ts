import React from 'react';

/**
 * Single chart theme (Phase 6). One categorical palette + semantic series
 * colors + a dark-aware hook for grid/tick/tooltip chrome, replacing the
 * copy-pasted hex constants that lived in every chart file.
 */

/** Canonical categorical palette (16, colorblind-tolerant order). */
export const CATEGORY_PALETTE = [
  '#6366f1', // indigo
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f43f5e', // rose
  '#8b5cf6', // violet
  '#84cc16', // lime
  '#14b8a6', // teal
  '#f97316', // orange
  '#22d3ee', // sky
  '#d946ef', // fuchsia
  '#a3e635', // light green
  '#fb7185', // light rose
  '#2dd4bf', // light teal
  '#fbbf24', // light amber
] as const;

/** Semantic series colors — income/expense/savings read the same everywhere. */
export const SEMANTIC = {
  income: '#10b981',
  expense: '#f43f5e',
  savings: '#6366f1',
  neutral: '#9ca3af',
} as const;

export function paletteColor(index: number): string {
  return CATEGORY_PALETTE[index % CATEGORY_PALETTE.length];
}

export interface ChartChrome {
  isDark: boolean;
  grid: string;
  tick: string;
  tooltip: {
    contentStyle: React.CSSProperties;
    labelStyle: React.CSSProperties;
    itemStyle: React.CSSProperties;
  };
}

function chromeFor(isDark: boolean): ChartChrome {
  return {
    isDark,
    grid: isDark ? '#374151' : '#e5e7eb',
    tick: isDark ? '#9ca3af' : '#6b7280',
    tooltip: isDark
      ? {
          contentStyle: {
            backgroundColor: 'rgba(31, 41, 55, 0.92)',
            borderColor: '#4b5563',
            borderRadius: '0.5rem',
          },
          labelStyle: { color: '#f9fafb' },
          itemStyle: { color: '#f9fafb' },
        }
      : {
          contentStyle: {
            backgroundColor: 'rgba(255, 255, 255, 0.96)',
            borderColor: '#e5e7eb',
            borderRadius: '0.5rem',
          },
          labelStyle: { color: '#111827' },
          itemStyle: { color: '#111827' },
        },
  };
}

/**
 * Dark-aware chart chrome. Follows the app theme (`documentElement.dark`
 * class, managed by ThemeSwitcher incl. `app:theme` events) instead of
 * hardcoding one mode's tooltip/grid colors.
 */
export function useChartTheme(): ChartChrome {
  const [isDark, setIsDark] = React.useState(
    () =>
      typeof document !== 'undefined' &&
      document.documentElement.classList.contains('dark')
  );

  React.useEffect(() => {
    const root = document.documentElement;
    const sync = () => setIsDark(root.classList.contains('dark'));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    window.addEventListener('app:theme', sync);
    return () => {
      observer.disconnect();
      window.removeEventListener('app:theme', sync);
    };
  }, []);

  return React.useMemo(() => chromeFor(isDark), [isDark]);
}
