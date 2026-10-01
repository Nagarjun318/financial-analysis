import { createRemoteJWKSet, jwtVerify } from 'jose';

/**
 * Server-side auth for the api Function.
 * Verifies the caller's Managed Auth JWT against the branch JWKS and returns
 * the `sub` as the authoritative user id. Client-supplied user ids are never
 * trusted — userId always comes from the verified token.
 */

function issuerFromBaseUrl(baseUrl: string): string {
  return new URL(baseUrl).origin;
}

let cachedJwks: ReturnType<typeof createRemoteJWKSet> | null = null;
let cachedJwksUrl: string | null = null;

function getJwks(jwksUrl: string): ReturnType<typeof createRemoteJWKSet> {
  if (!cachedJwks || cachedJwksUrl !== jwksUrl) {
    cachedJwks = createRemoteJWKSet(new URL(jwksUrl));
    cachedJwksUrl = jwksUrl;
  }
  return cachedJwks;
}

export interface VerifiedIdentity {
  userId: string;
}

/** Pure helper (unit-tested): pull the raw token out of an Authorization header. */
export function bearerToken(header: string | null): string | null {
  if (!header) return null;
  const match = header.match(/^bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

export async function verifyRequest(
  request: Request,
  env: { NEON_AUTH_JWKS_URL?: string; NEON_AUTH_BASE_URL?: string }
): Promise<VerifiedIdentity | null> {
  const token = bearerToken(request.headers.get('authorization'));
  const jwksUrl = env.NEON_AUTH_JWKS_URL;
  const baseUrl = env.NEON_AUTH_BASE_URL;
  if (!token || !jwksUrl || !baseUrl) return null;
  try {
    const { payload } = await jwtVerify(token, getJwks(jwksUrl), {
      issuer: issuerFromBaseUrl(baseUrl),
    });
    if (typeof payload.sub !== 'string' || payload.sub.length === 0) return null;
    return { userId: payload.sub };
  } catch {
    return null;
  }
}

/** For tests only — resets the module-scope JWKS cache. */
export function __resetJwksCache(): void {
  cachedJwks = null;
  cachedJwksUrl = null;
}
