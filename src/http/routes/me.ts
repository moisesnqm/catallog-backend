/**
 * Current user profile — GET /me (role, tenantId, tenantName from our DB).
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createAuthMiddleware } from '../../auth/middleware.js';
import type { UserRepository } from '../../repositories/user.repository.js';
import type { TenantRepository } from '../../repositories/tenant.repository.js';
import type { Env } from '../../config/env.js';

interface MeRoutesDeps {
  env: Env;
  userRepository: UserRepository;
  tenantRepository: TenantRepository;
}

export async function registerMeRoutes(
  app: FastifyInstance,
  deps: MeRoutesDeps
): Promise<void> {
  const authMiddleware = createAuthMiddleware(deps.env, deps.userRepository);

  /**
   * GET /me — Returns current user's role, tenantId and optional tenantName from our database (for RBAC on frontend).
   */
  app.get(
    '/me',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const auth = request.auth!;
      const tenant = await deps.tenantRepository.findById(auth.tenantId);
      const body: { role: string; tenantId: string; tenantName?: string } = {
        role: auth.role,
        tenantId: auth.tenantId,
      };
      if (tenant) {
        body.tenantName = tenant.name;
      }
      await reply.send(body);
    }
  );
}
