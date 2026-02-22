/**
 * Reverts the last executed TypeORM migration.
 * Usage: npm run migration:revert
 */

import 'dotenv/config';
import 'reflect-metadata';
import { AppDataSource } from './data-source.js';

async function run(): Promise<void> {
  await AppDataSource.initialize();
  try {
    await AppDataSource.undoLastMigration();
    console.log('Reverted last migration.');
  } finally {
    await AppDataSource.destroy();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
