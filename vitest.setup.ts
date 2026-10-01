import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Mirror RTL's globals-mode auto-cleanup (vitest runs without globals here).
afterEach(() => {
  cleanup();
});

// This jsdom setup exposes a `localStorage` stub without the Storage API
// (opaque origin). Provide a minimal in-memory implementation when broken so
// persistence-keyed components (onboarding, dashboard prefs) are testable.
{
  const stub = globalThis as Record<string, unknown>;
  const current = stub.localStorage as
    | { getItem?: unknown; setItem?: unknown; removeItem?: unknown }
    | undefined;
  if (!current || typeof current.removeItem !== 'function') {
    const store = new Map<string, string>();
    Object.defineProperty(stub, 'localStorage', {
      value: {
        getItem: (key: string) => (store.has(key) ? (store.get(key) as string) : null),
        setItem: (key: string, value: string) => {
          store.set(key, String(value));
        },
        removeItem: (key: string) => {
          store.delete(key);
        },
        clear: () => {
          store.clear();
        },
        get length() {
          return store.size;
        },
      },
      configurable: true,
      writable: true,
    });
  }
}

