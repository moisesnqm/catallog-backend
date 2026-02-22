/**
 * Fastify app builder: CORS, Swagger, auth, catalogos routes.
 */

import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { loadEnv } from '../config/env.js';
import type { Env } from '../config/env.js';
import { getDataSource } from '../database/connection.js';
import { UserRepositoryImpl } from '../repositories/user.repository.js';
import { TenantRepositoryImpl } from '../repositories/tenant.repository.js';
import { CatalogoRepositoryImpl } from '../repositories/catalogo.repository.js';
import { ListCatalogosUseCaseImpl } from '../use-cases/list-catalogos.js';
import { GetCatalogoUseCaseImpl } from '../use-cases/get-catalogo.js';
import { UploadCatalogoUseCaseImpl } from '../use-cases/upload-catalogo.js';
import { GetCatalogoDownloadUseCaseImpl } from '../use-cases/get-catalogo-download.js';
import { registerCatalogosRoutes } from './routes/catalogos.js';
import { registerAdminRoutes } from './routes/admin.js';
import { registerWebhookRoutes } from './routes/webhooks.js';
import { registerMeRoutes } from './routes/me.js';

export type App = FastifyInstance & { config: Env };

export async function buildApp(): Promise<App> {
  const config = loadEnv();

  const app = Fastify({ logger: config.NODE_ENV === 'development' }) as unknown as App;
  app.config = config;

  await app.register(cors, {
    origin: config.CORS_ORIGIN === '*' ? true : config.CORS_ORIGIN.split(',').map((o) => o.trim()),
    allowedHeaders: ['Authorization', 'Content-Type'],
  });

  await app.register(swagger, {
    openapi: {
      info: { title: 'Academy API', version: '1.0.0' },
      servers: [{ url: config.API_PUBLIC_URL ?? `http://localhost:${config.PORT}` }],
    },
  });
  await app.register(swaggerUi, { routePrefix: '/docs' });

  app.get('/health', async (_, reply) => {
    await reply.send({ status: 'ok' });
  });

  const dataSource = await getDataSource();
  const userRepository = new UserRepositoryImpl(dataSource);
  const tenantRepository = new TenantRepositoryImpl(dataSource);

  await app.register(
    async (instance) => {
      instance.addContentTypeParser(
        'application/json',
        { parseAs: 'buffer' },
        (_req, body, done) => {
          done(null, body as Buffer);
        }
      );
      await registerWebhookRoutes(instance, { env: config, userRepository });
    },
    { prefix: '/webhooks' }
  );
  const catalogoRepository = new CatalogoRepositoryImpl(dataSource);

  const listCatalogos = new ListCatalogosUseCaseImpl(catalogoRepository);
  const getCatalogo = new GetCatalogoUseCaseImpl(catalogoRepository);
  const uploadCatalogo = new UploadCatalogoUseCaseImpl(catalogoRepository);
  const getCatalogoDownload = new GetCatalogoDownloadUseCaseImpl(catalogoRepository);

  await registerMeRoutes(app, { env: config, userRepository, tenantRepository });

  await registerCatalogosRoutes(app, {
    env: config,
    userRepository,
    listCatalogos,
    getCatalogo,
    uploadCatalogo,
    getCatalogoDownload,
  });

  await registerAdminRoutes(app, { env: config, userRepository });

  return app;
}
