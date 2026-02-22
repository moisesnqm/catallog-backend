/**
 * Admin routes — update user role/sector_access (admin only).
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createAuthMiddleware, requireAdmin } from '../../auth/middleware.js';
import type { UserRepository } from '../../repositories/user.repository.js';
import type { Env } from '../../config/env.js';
import { updateUserRoleBodySchema } from '../../schemas/admin.js';

interface AdminRoutesDeps {
  env: Env;
  userRepository: UserRepository;
}

export async function registerAdminRoutes(
  app: FastifyInstance,
  deps: AdminRoutesDeps
): Promise<void> {
  const authMiddleware = createAuthMiddleware(deps.env, deps.userRepository);

  /**
   * PATCH /admin/users/by-clerk/:clerkUserId
   * Update role and/or sector_access for a user (by Clerk user ID).
   * Only admins can call; target user must be in the same tenant.
   */
  app.patch<{
    Params: { clerkUserId: string };
    Body: { role?: string; sector_access?: string };
  }>(
    '/admin/users/by-clerk/:clerkUserId',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest<{ Params: { clerkUserId: string }; Body: { role?: string; sector_access?: string } }>, reply: FastifyReply) => {
      if (!requireAdmin(request, reply)) return;
      const auth = request.auth!;
      const { clerkUserId } = request.params;

      const parsed = updateUserRoleBodySchema.safeParse(request.body);
      if (!parsed.success) {
        await reply.status(422).send({ error: 'Validation failed', details: parsed.error.flatten() });
        return;
      }

      const user = await deps.userRepository.findByClerkUserId(clerkUserId);
      if (!user) {
        await reply.status(404).send({ error: 'User not found' });
        return;
      }

      if (user.tenant_id !== auth.tenantId) {
        await reply.status(403).send({ error: 'Forbidden: cannot update user from another tenant' });
        return;
      }

      const updated = await deps.userRepository.updateRoleAndSector(user, {
        role: parsed.data.role,
        sector_access: parsed.data.sector_access,
      });

      await reply.send({
        id: updated.id,
        clerk_user_id: updated.clerk_user_id,
        tenant_id: updated.tenant_id,
        role: updated.role,
        sector_access: updated.sector_access,
      });
    }
  );
}
