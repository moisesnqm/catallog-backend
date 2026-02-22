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
- `npm run migration:run` — Run pending migrations.
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

- **PATCH** `/admin/users/by-clerk/:clerkUserId` — body: `{ "role": "manager", "sector_access": "vendas" }` (admin only, same tenant).

Full steps (create user in DB, get Clerk User ID, update role): [docs/backend/USERS_AND_ROLES.md](docs/backend/USERS_AND_ROLES.md).
