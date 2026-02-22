/**
 * Clerk JWT verification using JWKS.
 */

import * as jose from 'jose';
import type { Env } from '../config/env.js';

/**
 * Verifies a Clerk-issued JWT and returns the payload (sub, iss, exp, etc.).
 * @param token - Raw JWT string (without "Bearer " prefix)
 * @param env - App env containing CLERK_JWKS_URL and CLERK_ISSUER
 * @returns Decoded payload with at least sub
 * @throws Error if verification fails or env is missing
 */
export async function verifyClerkToken(
  token: string,
  env: Pick<Env, 'CLERK_JWKS_URL' | 'CLERK_ISSUER'>
): Promise<{ sub: string }> {
  const { CLERK_JWKS_URL, CLERK_ISSUER } = env;
  if (!CLERK_JWKS_URL || !CLERK_ISSUER) {
    throw new Error('CLERK_JWKS_URL and CLERK_ISSUER must be set to verify tokens');
  }

  const JWKS = jose.createRemoteJWKSet(new URL(CLERK_JWKS_URL));
  const { payload } = await jose.jwtVerify(token, JWKS, {
    issuer: CLERK_ISSUER,
    clockTolerance: 10,
  });

  const sub = payload.sub;
  if (!sub || typeof sub !== 'string') {
    throw new Error('JWT missing sub claim');
  }

  return { sub };
}
