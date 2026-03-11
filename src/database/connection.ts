/**
 * TypeORM DataSource singleton for the running app.
 */

import { DataSource } from 'typeorm';
import { loadEnv } from '../config/env.js';
import { Tenant } from '../entities/tenant.entity.js';
import { User } from '../entities/user.entity.js';
import { Catalogo } from '../entities/catalogo.entity.js';
import { CatalogArea } from '../entities/catalog-area.entity.js';

let dataSource: DataSource | null = null;

/**
 * Returns the app DataSource, initializing it on first call.
 */
export async function getDataSource(): Promise<DataSource> {
  if (dataSource?.isInitialized) {
    return dataSource;
  }
  const env = loadEnv();
  dataSource = new DataSource({
    type: 'postgres',
    url: env.DATABASE_URL,
    synchronize: false,
    logging: env.NODE_ENV === 'development',
    entities: [Tenant, User, Catalogo, CatalogArea],
  });
  await dataSource.initialize();
  return dataSource;
}
