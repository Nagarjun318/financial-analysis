import { describe, it, expect } from 'vitest';
import app from './index.ts';

const VERCEL_ORIGIN = 'https://financial-analysis-ivory.vercel.app';

describe('function CORS (vercel SPA)', () => {
  it('answers preflight from the Vercel origin with Allow-Origin', async () => {
    const res = await app.request('/api/ai/complete', {
      method: 'OPTIONS',
      headers: { Origin: VERCEL_ORIGIN },
    });
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(VERCEL_ORIGIN);
  });

  it('includes CORS headers on the public health route', async () => {
    const res = await app.request('/api/health', {
      headers: { Origin: VERCEL_ORIGIN },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(VERCEL_ORIGIN);
  });

  it('includes CORS headers on 404s so browsers surface the body', async () => {
    // NOTE: unknown /api/* paths 401 first (auth middleware runs before
    // routing), so exercise notFound via a non-API path.
    const res = await app.request('/nope-not-here', {
      headers: { Origin: VERCEL_ORIGIN },
    });
    expect(res.status).toBe(404);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(VERCEL_ORIGIN);
  });

  it('includes CORS headers on unauthenticated API calls (401)', async () => {
    const res = await app.request('/api/ai/complete', {
      method: 'POST',
      headers: { Origin: VERCEL_ORIGIN, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'x', prompt: 'hi' }),
    });
    expect(res.status).toBe(401);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(VERCEL_ORIGIN);
  });

  it('omits Allow-Origin for non-allowlisted origins', async () => {
    const res = await app.request('/api/health', {
      headers: { Origin: 'https://evil.example.com' },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });
});
