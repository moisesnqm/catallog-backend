/**
 * Runs pending TypeORM migrations.
 * Usage: npm run migration:run (or tsx src/database/run-migrations.ts)
 */

import 'dotenv/config';
import 'reflect-metadata';
import { AppDataSource } from './data-source.js';

async function run(): Promise<void> {
  await AppDataSource.initialize();
  try {
    const executed = await AppDataSource.runMigrations();
    console.log(`Ran ${executed.length} migration(s):`, executed.map((m) => m.name));
  } finally {
    await AppDataSource.destroy();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
