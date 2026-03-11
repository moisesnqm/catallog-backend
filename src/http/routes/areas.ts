/**
 * Catalog areas routes: list, get, create, update, delete (tenant-scoped).
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { ListAreasUseCase } from '../../use-cases/list-areas.js';
import type { GetAreaUseCase } from '../../use-cases/get-area.js';
import type { CreateAreaUseCase } from '../../use-cases/create-area.js';
import type { UpdateAreaUseCase } from '../../use-cases/update-area.js';
import type { DeleteAreaUseCase } from '../../use-cases/delete-area.js';
import {
  listAreasQuerySchema,
  createAreaBodySchema,
  updateAreaBodySchema,
} from '../../schemas/catalog-area.js';
import { createAuthMiddleware, requireUploadRole } from '../../auth/middleware.js';
import type { UserRepository } from '../../repositories/user.repository.js';
import type { Env } from '../../config/env.js';

interface AreasRoutesDeps {
  env: Env;
  userRepository: UserRepository;
  listAreas: ListAreasUseCase;
  getArea: GetAreaUseCase;
  createArea: CreateAreaUseCase;
  updateArea: UpdateAreaUseCase;
  deleteArea: DeleteAreaUseCase;
}

export async function registerAreasRoutes(
  app: FastifyInstance,
  deps: AreasRoutesDeps
): Promise<void> {
  const authMiddleware = createAuthMiddleware(deps.env, deps.userRepository);

  /** GET /areas — list areas for current tenant */
  app.get<{
    Querystring: { sortBy?: string; sortOrder?: string };
  }>(
    '/areas',
    { preHandler: [authMiddleware] },
    async (
      request: FastifyRequest<{ Querystring: { sortBy?: string; sortOrder?: string } }>,
      reply: FastifyReply
    ) => {
      const parsed = listAreasQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        await reply.status(422).send({ error: 'Validation failed', details: parsed.error.flatten() });
        return;
      }
      const auth = request.auth!;
      const items = await deps.listAreas.execute({ auth, query: parsed.data });
      await reply.send(items);
    }
  );

  /** GET /areas/:id */
  app.get<{ Params: { id: string } }>(
    '/areas/:id',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;
      const auth = request.auth!;
      const area = await deps.getArea.execute({ auth, id });
      if (!area) {
        await reply.status(404).send({ error: 'Not found' });
        return;
      }
      await reply.send(area);
    }
  );

  /** POST /areas — admin or manager only */
  app.post(
    '/areas',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!requireUploadRole(request, reply)) {
        return;
      }
      const parsed = createAreaBodySchema.safeParse(request.body);
      if (!parsed.success) {
        await reply.status(422).send({ error: 'Validation failed', details: parsed.error.flatten() });
        return;
      }
      const auth = request.auth!;
      const area = await deps.createArea.execute({ auth, body: parsed.data });
      await reply.status(201).send(area);
    }
  );

  /** PATCH /areas/:id — admin or manager only */
  app.patch<{ Params: { id: string } }>(
    '/areas/:id',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      if (!requireUploadRole(request, reply)) {
        return;
      }
      const { id } = request.params;
      const parsed = updateAreaBodySchema.safeParse(request.body);
      if (!parsed.success) {
        await reply.status(422).send({ error: 'Validation failed', details: parsed.error.flatten() });
        return;
      }
      const auth = request.auth!;
      const area = await deps.updateArea.execute({ auth, id, body: parsed.data });
      if (!area) {
        await reply.status(404).send({ error: 'Not found' });
        return;
      }
      await reply.send(area);
    }
  );

  /** DELETE /areas/:id — admin or manager only */
  app.delete<{ Params: { id: string } }>(
    '/areas/:id',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      if (!requireUploadRole(request, reply)) {
        return;
      }
      const { id } = request.params;
      const auth = request.auth!;
      const deleted = await deps.deleteArea.execute({ auth, id });
      if (!deleted) {
        await reply.status(404).send({ error: 'Not found' });
        return;
      }
      await reply.status(204).send();
    }
  );
}
