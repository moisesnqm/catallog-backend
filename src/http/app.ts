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
import { CatalogAreaRepositoryImpl } from '../repositories/catalog-area.repository.js';
import { ListCatalogosUseCaseImpl } from '../use-cases/list-catalogos.js';
import { ListAreasUseCaseImpl } from '../use-cases/list-areas.js';
import { GetAreaUseCaseImpl } from '../use-cases/get-area.js';
import { CreateAreaUseCaseImpl } from '../use-cases/create-area.js';
import { UpdateAreaUseCaseImpl } from '../use-cases/update-area.js';
import { DeleteAreaUseCaseImpl } from '../use-cases/delete-area.js';
import { GetCatalogoUseCaseImpl } from '../use-cases/get-catalogo.js';
import { UploadCatalogoUseCaseImpl } from '../use-cases/upload-catalogo.js';
import { UpdateCatalogoUseCaseImpl } from '../use-cases/update-catalogo.js';
import { GetCatalogoDownloadUseCaseImpl } from '../use-cases/get-catalogo-download.js';
import { DeleteCatalogoUseCaseImpl } from '../use-cases/delete-catalogo.js';
import { registerCatalogosRoutes } from './routes/catalogos.js';
import { registerAreasRoutes } from './routes/areas.js';
import { registerAdminRoutes } from './routes/admin.js';
import { registerWebhookRoutes } from './routes/webhooks.js';
import { registerMeRoutes } from './routes/me.js';
import { getClerkUserByEmail } from '../clerk/get-user-by-email.js';
import { LinkUserToTenantUseCaseImpl } from '../use-cases/link-user-to-tenant.js';
import { UnlinkUserFromTenantUseCaseImpl } from '../use-cases/unlink-user-from-tenant.js';
import { ListTenantUsersUseCaseImpl } from '../use-cases/list-tenant-users.js';

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
  const catalogAreaRepository = new CatalogAreaRepositoryImpl(dataSource);

  const listCatalogos = new ListCatalogosUseCaseImpl(catalogoRepository);
  const getCatalogo = new GetCatalogoUseCaseImpl(catalogoRepository);
  const uploadCatalogo = new UploadCatalogoUseCaseImpl(catalogoRepository, catalogAreaRepository);
  const updateCatalogo = new UpdateCatalogoUseCaseImpl(catalogoRepository, catalogAreaRepository);
  const getCatalogoDownload = new GetCatalogoDownloadUseCaseImpl(catalogoRepository);
  const deleteCatalogo = new DeleteCatalogoUseCaseImpl(catalogoRepository);

  const listAreas = new ListAreasUseCaseImpl(catalogAreaRepository);
  const getArea = new GetAreaUseCaseImpl(catalogAreaRepository);
  const createArea = new CreateAreaUseCaseImpl(catalogAreaRepository);
  const updateArea = new UpdateAreaUseCaseImpl(catalogAreaRepository);
  const deleteArea = new DeleteAreaUseCaseImpl(catalogAreaRepository);

  await registerMeRoutes(app, { env: config, userRepository, tenantRepository });

  await registerAreasRoutes(app, {
    env: config,
    userRepository,
    listAreas,
    getArea,
    createArea,
    updateArea,
    deleteArea,
  });

  await registerCatalogosRoutes(app, {
    env: config,
    userRepository,
    listCatalogos,
    getCatalogo,
    uploadCatalogo,
    updateCatalogo,
    getCatalogoDownload,
    deleteCatalogo,
  });

  const getClerkUserByEmailFn = (email: string) =>
    getClerkUserByEmail(email, config.CLERK_SECRET_KEY);
  const linkUserToTenant = new LinkUserToTenantUseCaseImpl(
    userRepository,
    getClerkUserByEmailFn
  );
  const unlinkUserFromTenant = new UnlinkUserFromTenantUseCaseImpl(userRepository);
  const listTenantUsers = new ListTenantUsersUseCaseImpl(userRepository);

  await registerAdminRoutes(app, {
    env: config,
    userRepository,
    linkUserToTenant,
    unlinkUserFromTenant,
    listTenantUsers,
  });

  return app;
}
