# Catallog Backend (Academy API)

Backend for the Academy frontend: multi-tenant catalogos (PDFs) with RBAC by role and by sector.

## Stack

- TypeScript, Node.js, Fastify, TypeORM, PostgreSQL, Zod, Swagger, SOLID.

## Features

- **Multi-tenancy:** All data scoped by tenant.
- **Auth:** Clerk JWT verification (JWKS); user and tenant resolved from DB.
- **RBAC:** Roles `admin`, `manager`, `viewer`. Upload allowed only for `admin` and `manager`.
- **RBAC by sector:** User has `sector_access`: `all` (default), `none`, or one of `financeiro`, `pcp`, `producao`, `vendas`, `projeto`. List/get catalogos filtered by this.

## Setup

1. **Dependencies**

   ```bash
   npm install
   ```

2. **Environment**

   Copy `.env.example` to `.env` and set at least:

   - `DATABASE_URL` — e.g. `postgresql://postgres:postgres@localhost:5432/catallog`
   - For protected routes (JWT auth): `CLERK_JWKS_URL` and `CLERK_ISSUER` — see [docs/backend/CLERK_JWKS.md](docs/backend/CLERK_JWKS.md)

3. **Database**

   Start Postgres (e.g. via Docker):

   ```bash
   docker compose up -d
   ```

   If you get `database "catallog" does not exist` when running migrations, create the database (e.g. the container was started before `POSTGRES_DB` was set):

   ```bash
   docker compose exec postgres psql -U postgres -c "CREATE DATABASE catallog;"
   ```

   Or run the helper script:

   ```bash
   sh scripts/create-db.sh
   ```

   Then run migrations:

   ```bash
   npm run migration:run
   ```

4. **Run**

   ```bash
   npm run dev
   ```

   Server listens on `http://0.0.0.0:3001`. Health: `GET /health`. API docs: `GET /docs`.

## Scripts

- `npm run dev` — Start with hot reload (tsx).
- `npm run build` — Compile TypeScript.
- `npm start` — Run compiled `dist/server.js`.
- `npm run migration:run` — Run pending migrations (development; uses tsx).
- `npm run migration:run:prod` — Run migrations in production (uses compiled `dist/`; use in Coolify or after `npm run build`).
- `npm run migration:revert` — Revert last migration.
- `npm test` — Run unit tests (Vitest).

## API (summary)

- `GET /catalogos` — List catalogos (query: `sector`, `page`, `limit`). Auth required; response filtered by user `sector_access`.
- `GET /catalogos/:id` — Get one catalogo. Auth required; 404 if not visible by sector.
- `GET /catalogos/:id/download` — Download file. Auth required.
- `POST /catalogos/upload` — Upload PDF (multipart: `file`, optional `name`, `sector`). Auth required; role `admin` or `manager`.

See `docs/backend/API_SPEC.md` and Swagger at `/docs`.

## Users and roles (Clerk)

To allow a user who signed in with Google (via Clerk) to use the API, they must exist in the `users` table with a `tenant_id` and `role`. An **admin** can then update their role or sector via:

- **GET** `/admin/users` — list users of the current tenant (admin only).
- **POST** `/admin/users/link` — body: `{ "email": "user@example.com", "role": "viewer", "sector_access": "all" }` to link a Clerk user by email to the tenant (admin only; requires `CLERK_SECRET_KEY`).
- **PATCH** `/admin/users/by-clerk/:clerkUserId` — body: `{ "role": "manager", "sector_access": "vendas" }` (admin only, same tenant).
- **DELETE** `/admin/users/by-clerk/:clerkUserId` — unlink user from current tenant (admin only).

Full steps (create user in DB, get Clerk User ID, update role): [docs/backend/USERS_AND_ROLES.md](docs/backend/USERS_AND_ROLES.md).

## Deploy (Coolify)

Use Environment Variables in Coolify (no `.env` file in the container). Set at least `DATABASE_URL`, `NODE_ENV=production`, and Clerk/AWS vars as needed.

On every container start, the **entrypoint** automatically: (1) creates the database from `DATABASE_URL` if it does not exist (connects to default `postgres` to run `CREATE DATABASE`); (2) runs migrations; (3) starts the app. You can deploy when the database does not exist yet. If Postgres is not ready, the entrypoint retries up to 30 times (`STARTUP_MAX_TRIES`, `STARTUP_SLEEP`). Manual alternatives (if you prefer not to use the entrypoint):

- **Option A — Coolify console:** Open the Postgres service in Coolify and use “Execute Command” or “Terminal” (if available). Then run:
  ```bash
  psql -U postgres -c "CREATE DATABASE catallog;"
  ```
- **Option B — From your machine:** Using the **internal** connection string from Coolify (same network as the app), connect with any Postgres client (e.g. `psql`) to the default `postgres` database and run:
  ```sql
  CREATE DATABASE catallog;
  ```
  If Coolify exposes Postgres publicly, you can use that host and port with the same user/password.

### 2. Run migrations

- **Option A — From your machine (recommended if you have access to the Coolify Postgres):** Set `DATABASE_URL` to the Coolify Postgres URL (with database `catallog`) and run:
  ```bash
  export DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/catallog"
  npm run migration:run
  ```
- **Option B — Inside Coolify:** After the app is deployed, use “Execute Command” (or a one-off run) on the **application** container with the same environment as the app, and run:
  ```bash
  npm run migration:run:prod
  ```
  This runs the compiled migration script (`node dist/database/run-migrations.js`) and uses the app’s `DATABASE_URL`. You can run it once per deploy or only when you add new migrations.
