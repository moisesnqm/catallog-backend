/**
 * Catalogos routes: list, get, upload, download.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import multipart from '@fastify/multipart';
import type { ListCatalogosUseCase } from '../../use-cases/list-catalogos.js';
import type { GetCatalogoUseCase } from '../../use-cases/get-catalogo.js';
import type { UploadCatalogoUseCase } from '../../use-cases/upload-catalogo.js';
import type { GetCatalogoDownloadUseCase } from '../../use-cases/get-catalogo-download.js';
import { listCatalogosQuerySchema } from '../../schemas/catalogo.js';
import { createAuthMiddleware, requireUploadRole } from '../../auth/middleware.js';
import type { UserRepository } from '../../repositories/user.repository.js';
import type { Env } from '../../config/env.js';
import { saveUploadedFile, resolveFilePath } from '../storage.js';
import fs from 'node:fs';
import path from 'node:path';

interface CatalogosRoutesDeps {
  env: Env;
  userRepository: UserRepository;
  listCatalogos: ListCatalogosUseCase;
  getCatalogo: GetCatalogoUseCase;
  uploadCatalogo: UploadCatalogoUseCase;
  getCatalogoDownload: GetCatalogoDownloadUseCase;
}

export async function registerCatalogosRoutes(
  app: FastifyInstance,
  deps: CatalogosRoutesDeps
): Promise<void> {
  const authMiddleware = createAuthMiddleware(deps.env, deps.userRepository);

  await app.register(multipart, {
    limits: {
      fileSize: deps.env.UPLOAD_MAX_BYTES,
    },
  });

  /** GET /catalogos */
  app.get<{
    Querystring: { sector?: string; page?: string; limit?: string };
  }>(
    '/catalogos',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest<{ Querystring: { sector?: string; page?: string; limit?: string } }>, reply: FastifyReply) => {
      const parsed = listCatalogosQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        await reply.status(422).send({ error: 'Validation failed', details: parsed.error.flatten() });
        return;
      }
      const auth = request.auth!;
      const result = await deps.listCatalogos.execute({
        auth,
        query: parsed.data,
        baseUrl: deps.env.API_PUBLIC_URL,
      });
      await reply.send(result);
    }
  );

  /** GET /catalogos/:id */
  app.get<{ Params: { id: string } }>(
    '/catalogos/:id',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;
      const auth = request.auth!;
      const catalogo = await deps.getCatalogo.execute({
        auth,
        id,
        baseUrl: deps.env.API_PUBLIC_URL,
      });
      if (!catalogo) {
        await reply.status(404).send({ error: 'Not found' });
        return;
      }
      await reply.send(catalogo);
    }
  );

  /** POST /catalogos/upload */
  app.post(
    '/catalogos/upload',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!requireUploadRole(request, reply)) {
        return;
      }
      const auth = request.auth!;

      let buffer: Buffer | null = null;
      let mimeType = 'application/pdf';
      let originalFilename = '';
      let name = '';
      let sectorRaw: string | undefined;

      for await (const part of request.parts()) {
        if (part.type === 'file' && part.fieldname === 'file') {
          buffer = await part.toBuffer();
          mimeType = part.mimetype || 'application/pdf';
          originalFilename = part.filename ?? '';
        } else if (part.type === 'field') {
          const value = (part as { value?: string }).value ?? '';
          if (part.fieldname === 'name') name = value.trim();
          else if (part.fieldname === 'sector') sectorRaw = value.trim();
        }
      }

      if (!buffer || buffer.length === 0) {
        await reply.status(400).send({ error: 'Missing file' });
        return;
      }

      if (mimeType !== 'application/pdf') {
        await reply.status(400).send({ error: 'Only PDF files are allowed' });
        return;
      }

      const displayName = name || originalFilename;
      const sector = sectorRaw === '' ? null : sectorRaw ?? null;

      let filePath: string;
      let fileName: string;
      try {
        const saved = await saveUploadedFile(
          deps.env.UPLOAD_STORAGE_PATH,
          auth.tenantId,
          buffer,
          mimeType
        );
        filePath = saved.filePath;
        fileName = saved.fileName;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Upload failed';
        await reply.status(422).send({ error: msg });
        return;
      }

      try {
        const result = await deps.uploadCatalogo.execute({
          auth,
          name: displayName,
          sector,
          fileName,
          filePath,
          mimeType,
          baseUrl: deps.env.API_PUBLIC_URL,
        });
        await reply.status(201).send(result);
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') {
          await reply.status(422).send({ error: 'Invalid sector', details: (err as { errors?: unknown }).errors });
          return;
        }
        throw err;
      }
    }
  );

  /** GET /catalogos/:id/download */
  app.get<{ Params: { id: string } }>(
    '/catalogos/:id/download',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;
      const auth = request.auth!;
      const download = await deps.getCatalogoDownload.execute({ auth, id });
      if (!download) {
        await reply.status(404).send({ error: 'Not found' });
        return;
      }

      const absolutePath = resolveFilePath(deps.env.UPLOAD_STORAGE_PATH, download.filePath);
      if (!fs.existsSync(absolutePath)) {
        await reply.status(404).send({ error: 'File not found' });
        return;
      }

      await reply.header('Content-Disposition', `attachment; filename="${path.basename(download.fileName)}"`);
      await reply.header('Content-Type', download.mimeType);
      await reply.send(fs.createReadStream(absolutePath));
    }
  );
}
