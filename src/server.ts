/**
 * Academy backend entry point.
 * Bootstraps Fastify, config, database, and HTTP routes.
 */

import 'dotenv/config';
import 'reflect-metadata';
import { buildApp } from './http/app.js';

const start = async (): Promise<void> => {
  const app = await buildApp();
  const port = app.config.PORT;
  const host = app.config.HOST;

  await app.listen({ port, host });
  console.log(`Server listening at http://${host}:${port}`);
};

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
