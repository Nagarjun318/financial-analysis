import React from 'react';

/**
 * Canonical sections <-> URL paths. The router is the source of truth for
 * which view is active; `App` derives `currentSection` from the location.
 * Heavy views are lazy-loaded so the initial bundle stays small.
 */
export const SECTION_IDS = [
  'home',
  'about',
  'services',
  'finance',
  'investment',
  'groceries',
  'networth',
  'goals',
  'analytics',
] as const;

export type SectionId = (typeof SECTION_IDS)[number];

/**
 * Basename derived from Vite `base` (e.g. `/financial-analysis` in prod,
 * `/` on Vercel). BrowserRouter strips it for matching, but our manual
 * `sectionFromPath` helper must strip it too or every deep link reads as
 * the basename segment and falls back to home.
 */
export function getBasename(): string {
  try {
    const base = import.meta.env.BASE_URL ?? '/';
    const path = new URL(base, 'http://localhost').pathname.replace(/\/+$/g, '');
    return path || '';
  } catch {
    return '';
  }
}

export function sectionFromPath(pathname: string): SectionId {
  const basename = getBasename();
  let path = pathname;
  if (basename && (path === basename || path.startsWith(`${basename}/`))) {
    path = path.slice(basename.length) || '/';
  }
  const seg = path.replace(/^\/+|\/+$/g, '').split('/')[0] || 'home';
  return (SECTION_IDS as readonly string[]).includes(seg)
    ? (seg as SectionId)
    : 'home';
}

export function pathForSection(section: SectionId): string {
  // Home is canonical `/` so `/` and `/home` both work; sidebar links to `/`.
  if (section === 'home') return '/';
  return `/${section}`;
}

// Eager: landing views (cheap, needed for first paint).
export { default as HomePage } from '../components/HomePage.tsx';
export { default as AboutPage } from '../components/AboutPage.tsx';

// Lazy: data-heavy views (charts, editors, lists).
export const ServicesPage = React.lazy(() => import('../components/ServicesPage.tsx'));
export const Dashboard = React.lazy(() => import('../components/Dashboard.tsx'));
export const InvestmentPage = React.lazy(
  () => import('../components/InvestmentPage.tsx')
);
export const GroceriesPage = React.lazy(
  () => import('../components/GroceriesPage.tsx')
);
export const NetWorthPage = React.lazy(
  () => import('../components/NetWorthPage.tsx')
);
export const GoalsPage = React.lazy(() => import('../components/GoalsPage.tsx'));
export const AnalyticsPage = React.lazy(() =>
  import('../components/AnalyticsPage.tsx').then((m) => ({
    default: m.AnalyticsPage,
  }))
);
