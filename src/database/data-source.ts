/**
 * TypeORM DataSource for PostgreSQL.
 * Used by CLI (migrations) and optionally by app for connection.
 */

import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { loadEnv } from '../config/env.js';
import { Tenant } from '../entities/tenant.entity.js';
import { User } from '../entities/user.entity.js';
import { Catalogo } from '../entities/catalogo.entity.js';
import { CreateTenants1730000000001 } from './migrations/1730000000001-CreateTenants.js';
import { CreateUsers1730000000002 } from './migrations/1730000000002-CreateUsers.js';
import { CreateCatalogos1730000000003 } from './migrations/1730000000003-CreateCatalogos.js';
import { AddCatalogoFileUrlAndSearchableText1730000000004 } from './migrations/1730000000004-AddCatalogoFileUrlAndSearchableText.js';

const env = loadEnv();

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: env.DATABASE_URL,
  synchronize: false,
  logging: env.NODE_ENV === 'development',
  entities: [Tenant, User, Catalogo],
  migrations: [
    CreateTenants1730000000001,
    CreateUsers1730000000002,
    CreateCatalogos1730000000003,
    AddCatalogoFileUrlAndSearchableText1730000000004,
  ],
  migrationsTableName: 'migrations',
});
