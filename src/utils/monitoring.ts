/**
 * Error/product monitoring (Phase 5). Sentry initializes only when
 * `VITE_SENTRY_DSN` is set — local dev, CI, and tests are a silent no-op.
 * `@sentry/react` is always loaded via dynamic `import()` so it never lands
 * in the initial bundle (see the bundle-budget gate).
 */

let initialized = false;

export function isMonitoringEnabled(): boolean {
  return Boolean(import.meta.env.VITE_SENTRY_DSN as string | undefined);
}

/** Idempotent: safe to call from main.tsx on every boot. */
export function initMonitoring(): void {
  if (initialized) return;
  initialized = true;
  if (!isMonitoringEnabled()) return;
  void import('@sentry/react').then((Sentry) => {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN as string,
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0,
    });
  });
}

/**
 * Report a caught error: Sentry when configured, `console.error` otherwise.
 * This replaces console.error-only paths one call site at a time.
 */
export function reportError(error: unknown, context?: Record<string, string>): void {
  if (!isMonitoringEnabled()) {
    console.error('[app]', error, context ?? '');
    return;
  }
  void import('@sentry/react').then((Sentry) => {
    Sentry.captureException(error, context ? { extra: context } : undefined);
  });
}

/** For tests only — resets the init-once flag. */
export function __resetMonitoringForTests(): void {
  initialized = false;
}
