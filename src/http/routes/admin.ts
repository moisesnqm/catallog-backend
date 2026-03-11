/**
 * Admin routes — update user role/sector_access, link/unlink users (admin only).
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createAuthMiddleware, requireAdmin } from '../../auth/middleware.js';
import type { UserRepository } from '../../repositories/user.repository.js';
import type { Env } from '../../config/env.js';
import { updateUserRoleBodySchema, linkUserBodySchema } from '../../schemas/admin.js';
import type { LinkUserToTenantUseCase } from '../../use-cases/link-user-to-tenant.js';
import type { UnlinkUserFromTenantUseCase } from '../../use-cases/unlink-user-from-tenant.js';
import type { ListTenantUsersUseCase } from '../../use-cases/list-tenant-users.js';
import { LINK_USER_NOT_FOUND, LINK_USER_ALREADY_LINKED } from '../../use-cases/link-user-to-tenant.js';

interface AdminRoutesDeps {
  env: Env;
  userRepository: UserRepository;
  linkUserToTenant: LinkUserToTenantUseCase;
  unlinkUserFromTenant: UnlinkUserFromTenantUseCase;
  listTenantUsers: ListTenantUsersUseCase;
}

export async function registerAdminRoutes(
  app: FastifyInstance,
  deps: AdminRoutesDeps
): Promise<void> {
  const authMiddleware = createAuthMiddleware(deps.env, deps.userRepository);

  /**
   * GET /admin/users — List users of the current tenant (admin only).
   */
  app.get(
    '/admin/users',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!requireAdmin(request, reply)) return;
      const auth = request.auth!;
      const users = await deps.listTenantUsers.execute({ auth });
      await reply.send(users);
    }
  );

  /**
   * POST /admin/users/link — Link a Clerk user (by email) to the current tenant (admin only).
   */
  app.post<{ Body: { email: string; role?: string; sector_access?: string } }>(
    '/admin/users/link',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest<{ Body: { email: string; role?: string; sector_access?: string } }>, reply: FastifyReply) => {
      if (!requireAdmin(request, reply)) return;
      const auth = request.auth!;
      if (!deps.env.CLERK_SECRET_KEY) {
        await reply.status(503).send({
          error: 'Link by email is not configured; set CLERK_SECRET_KEY',
        });
        return;
      }
      const parsed = linkUserBodySchema.safeParse(request.body);
      if (!parsed.success) {
        await reply.status(422).send({ error: 'Validation failed', details: parsed.error.flatten() });
        return;
      }
      try {
        const result = await deps.linkUserToTenant.execute({
          auth,
          email: parsed.data.email,
          role: parsed.data.role,
          sector_access: parsed.data.sector_access,
        });
        await reply.status(201).send(result);
      } catch (err) {
        const code = err instanceof Error && 'code' in err ? (err as Error & { code: string }).code : undefined;
        if (code === LINK_USER_NOT_FOUND) {
          await reply.status(404).send({ error: 'No user found with this email' });
          return;
        }
        if (code === LINK_USER_ALREADY_LINKED) {
          await reply.status(409).send({ error: 'User already linked to this tenant' });
          return;
        }
        throw err;
      }
    }
  );

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

  /**
   * DELETE /admin/users/by-clerk/:clerkUserId — Unlink user from current tenant (admin only).
   */
  app.delete<{ Params: { clerkUserId: string } }>(
    '/admin/users/by-clerk/:clerkUserId',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest<{ Params: { clerkUserId: string } }>, reply: FastifyReply) => {
      if (!requireAdmin(request, reply)) return;
      const auth = request.auth!;
      const { clerkUserId } = request.params;
      const removed = await deps.unlinkUserFromTenant.execute({ auth, clerkUserId });
      if (!removed) {
        await reply.status(404).send({ error: 'User not found in this tenant' });
        return;
      }
      await reply.status(204).send();
    }
  );
}
