import { describe, it, expect } from 'vitest';
import { bearerToken } from './auth.ts';
import { isAllowedOrigin, corsPatterns } from './cors.ts';
import { TtlCache } from './cache.ts';
import { parseCompleteRequest, ALLOWED_MODELS } from './ai.ts';
import { parseCoords } from './weather.ts';
import { limitFor } from './ratelimit.ts';

describe('bearerToken', () => {
  it('extracts the token case-insensitively', () => {
    expect(bearerToken('Bearer abc123')).toBe('abc123');
    expect(bearerToken('bearer xyz')).toBe('xyz');
  });

  it('rejects missing / malformed headers', () => {
    expect(bearerToken(null)).toBeNull();
    expect(bearerToken('Basic abc')).toBeNull();
    expect(bearerToken('Bearer ')).toBeNull();
  });
});

describe('isAllowedOrigin', () => {
  it('matches exact origins', () => {
    expect(isAllowedOrigin('http://localhost:5173', ['http://localhost:5173'])).toBe(true);
    expect(isAllowedOrigin('http://localhost:9999', ['http://localhost:5173'])).toBe(false);
  });

  it('supports *.github.io wildcards for the Pages deploy', () => {
    expect(isAllowedOrigin('https://user.github.io', ['https://*.github.io'])).toBe(true);
    expect(isAllowedOrigin('https://evil.com', ['https://*.github.io'])).toBe(false);
  });

  it('rejects garbage', () => {
    expect(isAllowedOrigin('not-a-url', ['http://localhost:5173'])).toBe(false);
  });

  it('reads ALLOWED_ORIGINS env with localhost+Pages defaults', () => {
    expect(corsPatterns({})).toContain('https://*.github.io');
    expect(corsPatterns({ ALLOWED_ORIGINS: 'https://app.example.com, http://localhost:5173' })).toEqual([
      'https://app.example.com',
      'http://localhost:5173',
    ]);
  });
});

describe('TtlCache', () => {
  it('expires entries past their TTL', async () => {
    const cache = new TtlCache<string>();
    cache.set('k', 'v', 10);
    expect(cache.get('k')).toBe('v');
    await new Promise((r) => setTimeout(r, 20));
    expect(cache.get('k')).toBeNull();
  });

  it('evicts the oldest entry when full', () => {
    const cache = new TtlCache<string>(2);
    cache.set('a', '1', 60_000);
    cache.set('b', '2', 60_000);
    cache.set('c', '3', 60_000);
    expect(cache.get('a')).toBeNull();
    expect(cache.get('c')).toBe('3');
  });
});

describe('parseCompleteRequest', () => {
  const model = [...ALLOWED_MODELS][0];

  it('accepts a valid request', () => {
    expect(parseCompleteRequest({ model, prompt: 'hi' })).toEqual({ ok: true, model, prompt: 'hi' });
  });

  it('rejects missing/oversize prompts and unknown models', () => {
    expect(parseCompleteRequest(null).ok).toBe(false);
    expect(parseCompleteRequest({ model, prompt: '' }).ok).toBe(false);
    expect(parseCompleteRequest({ model, prompt: 'x'.repeat(12_001) })).toMatchObject({ ok: false, status: 413 });
    expect(parseCompleteRequest({ model: 'gpt-9', prompt: 'hi' })).toMatchObject({ ok: false, status: 400 });
  });
});

describe('parseCoords', () => {
  it('parses lat,lon and validates ranges', () => {
    expect(parseCoords('19.07, 72.87')).toEqual({ lat: 19.07, lon: 72.87 });
    expect(parseCoords('Mumbai, India')).toBeNull();
    expect(parseCoords('200, 10')).toBeNull();
  });
});

describe('limitFor', () => {
  it('uses env overrides with safe defaults', () => {
    expect(limitFor('ai', {})).toBe(60);
    expect(limitFor('market', {})).toBe(600);
    expect(limitFor('ai', { AI_HOURLY_LIMIT: '5' })).toBe(5);
    expect(limitFor('ai', { AI_HOURLY_LIMIT: 'junk' })).toBe(60);
  });
});
