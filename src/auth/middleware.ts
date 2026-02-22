/**
 * Auth middleware: verifies Clerk JWT and resolves user (tenant_id, role, sector_access).
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { verifyClerkToken } from './jwt.js';
import type { AuthContext } from './types.js';
import type { UserRepository } from '../repositories/user.repository.js';
import type { Env } from '../config/env.js';

declare module 'fastify' {
  interface FastifyRequest {
    auth?: AuthContext;
  }
}

/**
 * Extracts Bearer token from Authorization header.
 */
function getBearerToken(request: FastifyRequest): string | null {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7).trim() || null;
}

/**
 * Creates an auth middleware that verifies JWT and attaches AuthContext to request.
 */
export function createAuthMiddleware(
  env: Env,
  userRepository: UserRepository
) {
  return async function authMiddleware(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const token = getBearerToken(request);
    if (!token) {
      await reply.status(401).send({ error: 'Missing or invalid Authorization header' });
      return;
    }

    let sub: string;
    try {
      const payload = await verifyClerkToken(token, env);
      sub = payload.sub;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid token';
      await reply.status(401).send({ error: message });
      return;
    }

    const user = await userRepository.findByClerkUserId(sub);
    if (!user) {
      await reply.status(404).send({ error: 'User not found in users table for this Clerk account' });
      return;
    }

    request.auth = {
      clerkUserId: user.clerk_user_id,
      userId: user.id,
      tenantId: user.tenant_id,
      role: user.role,
      sectorAccess: user.sector_access,
    };
  };
}

/**
 * Guard: requires role admin or manager (e.g. for upload).
 */
export function requireUploadRole(request: FastifyRequest, reply: FastifyReply): boolean {
  const auth = request.auth;
  if (!auth) {
    reply.status(401).send({ error: 'Unauthorized' });
    return false;
  }
  if (auth.role !== 'admin' && auth.role !== 'manager') {
    reply.status(403).send({ error: 'Forbidden: admin or manager role required' });
    return false;
  }
  return true;
}

/**
 * Guard: requires role admin (e.g. for admin-only endpoints).
 */
export function requireAdmin(request: FastifyRequest, reply: FastifyReply): boolean {
  const auth = request.auth;
  if (!auth) {
    reply.status(401).send({ error: 'Unauthorized' });
    return false;
  }
  if (auth.role !== 'admin') {
    reply.status(403).send({ error: 'Forbidden: admin role required' });
    return false;
  }
  return true;
}
