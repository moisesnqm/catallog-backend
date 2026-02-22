/**
 * Clerk webhook route — user.created, user.updated, user.deleted.
 * Creates/updates/deletes users in our DB; uses raw body for signature verification.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { verifyWebhook } from '@clerk/backend/webhooks';
import type { UserRepository } from '../../repositories/user.repository.js';
import type { Env } from '../../config/env.js';

interface ClerkWebhookDeps {
  env: Env;
  userRepository: UserRepository;
}

/**
 * Builds a Web API Request from Fastify request and raw body (for Svix verification).
 */
function toWebRequest(request: FastifyRequest, rawBody: Buffer): Request {
  const url =
    (request.protocol ?? 'http') +
    '://' +
    (request.hostname ?? 'localhost') +
    request.url;
  const headers = new Headers();
  for (const [key, value] of Object.entries(request.headers)) {
    if (value !== undefined && value !== null)
      headers.set(key.toLowerCase(), Array.isArray(value) ? value.join(', ') : String(value));
  }
  return new Request(url, { method: 'POST', headers, body: rawBody });
}

export async function registerWebhookRoutes(
  app: FastifyInstance,
  deps: ClerkWebhookDeps
): Promise<void> {
  const { env, userRepository } = deps;

  /**
   * POST /webhooks/clerk — Clerk sends user.created, user.updated, user.deleted.
   * No auth; verification is via Svix signature (CLERK_WEBHOOK_SIGNING_SECRET).
   */
  app.post<{ Body: Buffer }>(
    '/clerk',
    async (request: FastifyRequest<{ Body: Buffer }>, reply: FastifyReply) => {
      const rawBody = request.body;
      if (!rawBody || !Buffer.isBuffer(rawBody)) {
        await reply.status(400).send({ error: 'Missing or invalid body' });
        return;
      }

      if (!env.CLERK_WEBHOOK_SIGNING_SECRET || !env.CLERK_WEBHOOK_DEFAULT_TENANT_ID) {
        await reply.status(503).send({
          error: 'Webhook not configured: set CLERK_WEBHOOK_SIGNING_SECRET and CLERK_WEBHOOK_DEFAULT_TENANT_ID',
        });
        return;
      }

      let evt: Awaited<ReturnType<typeof verifyWebhook>>;
      try {
        const webRequest = toWebRequest(request, rawBody);
        evt = await verifyWebhook(webRequest, {
          signingSecret: env.CLERK_WEBHOOK_SIGNING_SECRET,
        });
      } catch (err) {
        request.log.warn(err, 'Clerk webhook verification failed');
        await reply.status(400).send({ error: 'Webhook verification failed' });
        return;
      }

      const clerkUserId = evt.data && 'id' in evt.data ? evt.data.id : undefined;
      if (!clerkUserId) {
        await reply.status(200).send();
        return;
      }

      if (evt.type === 'user.created') {
        const existing = await userRepository.findByClerkUserId(clerkUserId);
        if (existing) {
          await reply.status(200).send();
          return;
        }
        try {
          await userRepository.createUser({
            tenant_id: env.CLERK_WEBHOOK_DEFAULT_TENANT_ID,
            clerk_user_id: clerkUserId,
            role: env.CLERK_WEBHOOK_DEFAULT_ROLE,
            sector_access: env.CLERK_WEBHOOK_DEFAULT_SECTOR_ACCESS,
          });
        } catch (err) {
          const isConflict =
            err instanceof Error && 'code' in err && (err as { code: string }).code === '23505';
          if (isConflict) {
            await reply.status(200).send();
            return;
          }
          request.log.error(err, 'Failed to create user from webhook');
          await reply.status(500).send({ error: 'Failed to create user' });
          return;
        }
      } else if (evt.type === 'user.deleted') {
        await userRepository.deleteByClerkUserId(clerkUserId);
      }
      await reply.status(200).send();
    }
  );
}
