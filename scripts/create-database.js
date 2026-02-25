#!/usr/bin/env node
/**
 * Creates the application database from DATABASE_URL if it does not exist.
 * Connects to the default "postgres" database to run CREATE DATABASE.
 * Usage: node scripts/create-database.js
 * Requires: DATABASE_URL in environment.
 */

import { Client } from 'pg';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

let parsed;
try {
  parsed = new URL(url);
} catch (e) {
  console.error('Invalid DATABASE_URL:', e.message);
  process.exit(1);
}

const dbName = parsed.pathname.replace(/^\//, '').replace(/\/$/, '') || 'postgres';
if (dbName === 'postgres') {
  console.log('Database name is postgres (default), nothing to create.');
  process.exit(0);
}

const sysUrl = new URL(url);
sysUrl.pathname = '/postgres';

const client = new Client({ connectionString: sysUrl.toString() });

async function run() {
  await client.connect();
  const res = await client.query(
    'SELECT 1 FROM pg_database WHERE datname = $1',
    [dbName]
  );
  if (res.rowCount > 0) {
    console.log(`Database "${dbName}" already exists.`);
    return;
  }
  await client.query(`CREATE DATABASE "${dbName.replace(/"/g, '""')}"`);
  console.log(`Database "${dbName}" created.`);
}

run()
  .then(() => client.end())
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
