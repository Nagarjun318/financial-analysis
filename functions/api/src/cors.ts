/**
 * CORS for direct browser → Function calls (the SPA calls the Function
 * directly so long AI/market streams never pass through a host timeout).
 * Auth uses Bearer JWTs (no cookies), so echoing an allowlisted origin is
 * sufficient — no `Access-Control-Allow-Credentials` needed.
 */

const DEFAULT_PATTERNS = [
  'http://localhost:5173',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
  'https://*.github.io',
  // Production SPA (Vercel) + preview deploys. Without this, browsers block
  // every direct Function call with "No 'Access-Control-Allow-Origin'".
  'https://*.vercel.app',
];

export function corsPatterns(env: { ALLOWED_ORIGINS?: string }): string[] {
  const raw = (env.ALLOWED_ORIGINS ?? '').trim();
  const extra = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  // Merge (don't replace): setting ALLOWED_ORIGINS must never silently drop
  // the built-in localhost/Pages/Vercel origins. De-duplicated, defaults first.
  const seen = new Set<string>();
  const out: string[] = [];
  for (const pattern of [...DEFAULT_PATTERNS, ...extra]) {
    const key = pattern.toLowerCase().replace(/\/+$/, '');
    if (!seen.has(key)) {
      seen.add(key);
      out.push(pattern);
    }
  }
  return out;
}

/** Pure helper (unit-tested): does `origin` match an allowlist pattern? */
export function isAllowedOrigin(origin: string, patterns: string[]): boolean {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  const actual = `${url.protocol}//${url.host}`;
  return patterns.some((pattern) => {
    const noScheme = pattern.toLowerCase().replace(/^https?:\/\//, '');
    if (noScheme.startsWith('*.')) {
      const want = noScheme.slice(2);
      if (!want) return false;
      const host = url.host.toLowerCase();
      return host === want || host.endsWith(`.${want}`);
    }
    return actual.toLowerCase() === pattern.toLowerCase().replace(/\/+$/, '');
  });
}

export function corsHeaders(request: Request, patterns: string[]): Record<string, string> {
  const origin = request.headers.get('origin') ?? '';
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
  };
  if (origin && isAllowedOrigin(origin, patterns)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Vary'] = 'Origin';
  }
  return headers;
}
