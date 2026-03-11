/**
 * Catalogos routes: list, get, upload, update, download, delete.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import multipart from '@fastify/multipart';
import type { ListCatalogosUseCase } from '../../use-cases/list-catalogos.js';
import type { GetCatalogoUseCase } from '../../use-cases/get-catalogo.js';
import type { UploadCatalogoUseCase } from '../../use-cases/upload-catalogo.js';
import type { UpdateCatalogoUseCase } from '../../use-cases/update-catalogo.js';
import type { GetCatalogoDownloadUseCase } from '../../use-cases/get-catalogo-download.js';
import type { DeleteCatalogoUseCase } from '../../use-cases/delete-catalogo.js';
import { listCatalogosQuerySchema, updateCatalogoBodySchema } from '../../schemas/catalogo.js';
import { createAuthMiddleware, requireUploadRole } from '../../auth/middleware.js';
import type { UserRepository } from '../../repositories/user.repository.js';
import type { Env } from '../../config/env.js';
import { isS3Configured } from '../../config/env.js';
import { saveUploadedFile, resolveFilePath } from '../storage.js';
import { uploadCatalogPdf } from '../../storage/s3.js';
import { extractTextFromPdf } from '../../services/pdf-extract.js';
import fs from 'node:fs';
import path from 'node:path';

interface CatalogosRoutesDeps {
  env: Env;
  userRepository: UserRepository;
  listCatalogos: ListCatalogosUseCase;
  getCatalogo: GetCatalogoUseCase;
  uploadCatalogo: UploadCatalogoUseCase;
  updateCatalogo: UpdateCatalogoUseCase;
  getCatalogoDownload: GetCatalogoDownloadUseCase;
  deleteCatalogo: DeleteCatalogoUseCase;
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

  /** GET /catalogos — list with optional filters: sector, areaId, q, name, mimeType, createdFrom, createdTo, page, limit */
  app.get<{
    Querystring: {
      sector?: string;
      areaId?: string;
      q?: string;
      name?: string;
      mimeType?: string;
      createdFrom?: string;
      createdTo?: string;
      page?: string;
      limit?: string;
    };
  }>(
    '/catalogos',
    { preHandler: [authMiddleware] },
    async (
      request: FastifyRequest<{
        Querystring: {
          sector?: string;
          areaId?: string;
          q?: string;
          name?: string;
          mimeType?: string;
          createdFrom?: string;
          createdTo?: string;
          page?: string;
          limit?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
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

  /** PATCH /catalogos/:id — update metadata (name, sector, areaId); admin or manager only */
  app.patch<{ Params: { id: string } }>(
    '/catalogos/:id',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      if (!requireUploadRole(request, reply)) {
        return;
      }
      const { id } = request.params;
      const parsed = updateCatalogoBodySchema.safeParse(request.body);
      if (!parsed.success) {
        await reply.status(422).send({ error: 'Validation failed', details: parsed.error.flatten() });
        return;
      }
      const auth = request.auth!;
      try {
        const catalogo = await deps.updateCatalogo.execute({
          auth,
          id,
          body: parsed.data,
          baseUrl: deps.env.API_PUBLIC_URL,
        });
        if (!catalogo) {
          await reply.status(404).send({ error: 'Not found' });
          return;
        }
        await reply.send(catalogo);
      } catch (err) {
        if (err instanceof Error && err.message === 'Area not found or does not belong to tenant') {
          await reply.status(422).send({ error: err.message });
          return;
        }
        throw err;
      }
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
      let areaIdRaw: string | undefined;

      for await (const part of request.parts()) {
        if (part.type === 'file' && part.fieldname === 'file') {
          buffer = await part.toBuffer();
          mimeType = part.mimetype || 'application/pdf';
          originalFilename = part.filename ?? '';
        } else if (part.type === 'field') {
          const value = (part as { value?: string }).value ?? '';
          if (part.fieldname === 'name') name = value.trim();
          else if (part.fieldname === 'sector') sectorRaw = value.trim();
          else if (part.fieldname === 'areaId') areaIdRaw = value.trim();
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
      const areaId = areaIdRaw === '' ? null : areaIdRaw ?? null;

      let filePath: string | null = null;
      let fileName: string;
      let fileUrl: string | null = null;
      let searchableText = '';

      const s3Configured = isS3Configured(deps.env);

      if (s3Configured && deps.env.AWS_REGION && deps.env.S3_BUCKET && deps.env.AWS_ACCESS_KEY_ID && deps.env.AWS_SECRET_ACCESS_KEY) {
        try {
          const [s3Result, extracted] = await Promise.all([
            uploadCatalogPdf(
              {
                region: deps.env.AWS_REGION,
                bucket: deps.env.S3_BUCKET,
                prefix: deps.env.S3_PREFIX ?? 'catalogos',
                accessKeyId: deps.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: deps.env.AWS_SECRET_ACCESS_KEY,
              },
              auth.tenantId,
              buffer
            ),
            extractTextFromPdf(buffer),
          ]);
          fileUrl = s3Result.fileUrl;
          fileName = s3Result.fileName;
          filePath = s3Result.fileKey;
          searchableText = extracted;
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'S3 upload failed';
          request.log?.warn?.({ err }, 'S3 upload failed');
          await reply.status(422).send({ error: msg });
          return;
        }
      } else {
        try {
          const saved = await saveUploadedFile(
            deps.env.UPLOAD_STORAGE_PATH,
            auth.tenantId,
            buffer,
            mimeType
          );
          filePath = saved.filePath;
          fileName = saved.fileName;
          searchableText = await extractTextFromPdf(buffer);
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Upload failed';
          await reply.status(422).send({ error: msg });
          return;
        }
      }

      try {
        const result = await deps.uploadCatalogo.execute({
          auth,
          name: displayName,
          sector,
          areaId,
          fileName,
          filePath,
          mimeType,
          fileUrl: fileUrl ?? undefined,
          searchableText: searchableText || null,
          baseUrl: deps.env.API_PUBLIC_URL,
        });
        await reply.status(201).send(result);
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') {
          await reply.status(422).send({ error: 'Invalid sector', details: (err as { errors?: unknown }).errors });
          return;
        }
        if (err instanceof Error && err.message === 'Area not found or does not belong to tenant') {
          await reply.status(422).send({ error: err.message });
          return;
        }
        throw err;
      }
    }
  );

  /** DELETE /catalogos/:id — admin or manager only, tenant-scoped. */
  app.delete<{ Params: { id: string } }>(
    '/catalogos/:id',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      if (!requireUploadRole(request, reply)) {
        return;
      }
      const { id } = request.params;
      const auth = request.auth!;
      const deleted = await deps.deleteCatalogo.execute({ auth, id });
      if (!deleted) {
        await reply.status(404).send({ error: 'Not found' });
        return;
      }
      await reply.status(204).send();
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

      if (download.fileUrl) {
        await reply.redirect(download.fileUrl, 302);
        return;
      }

      const filePath = download.filePath;
      if (filePath == null || filePath === '') {
        await reply.status(404).send({ error: 'File not found' });
        return;
      }

      const absolutePath = resolveFilePath(deps.env.UPLOAD_STORAGE_PATH, filePath);
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
