import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { initMonitoring, isMonitoringEnabled, reportError, __resetMonitoringForTests } from './monitoring.ts';

describe('monitoring', () => {
  beforeEach(() => {
    __resetMonitoringForTests();
    vi.stubEnv('VITE_SENTRY_DSN', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    __resetMonitoringForTests();
  });

  it('is disabled without a DSN and init is a no-op', () => {
    expect(isMonitoringEnabled()).toBe(false);
    expect(() => initMonitoring()).not.toThrow();
  });

  it('falls back to console.error without a DSN', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    reportError(new Error('boom'), { where: 'test' });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('is idempotent across repeated init calls', () => {
    initMonitoring();
    initMonitoring();
    expect(isMonitoringEnabled()).toBe(false);
  });
});
