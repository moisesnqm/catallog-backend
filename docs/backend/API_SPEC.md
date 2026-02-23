# API Specification — Academy Backend

This document describes the HTTP API that the Academy frontend expects. Implement this contract so the frontend can list and upload catalogs.

## Overview

- **Authentication:** JWT issued or validated by Clerk. The frontend sends `Authorization: Bearer <token>` on every request. The backend must verify the token (e.g. via Clerk's JWKS or backend API) and identify the user and tenant.
- **Multi-tenancy:** Every request is scoped to a tenant. The tenant can be derived from the JWT (e.g. a custom claim like `tenant_id`) or from a header (e.g. `X-Tenant-Id`). All list and upload operations must filter or associate data by tenant.
- **Base URL:** Configurable on the frontend via `NEXT_PUBLIC_API_URL` (e.g. `http://localhost:3001`).

## Endpoints

### 0. Current user profile (for RBAC)

The frontend uses this to know the current user's **role** and **tenantId** from your database (not from Clerk metadata). Required for access control on catalog and upload pages.

**Request**

- **Method:** `GET`
- **Path:** `/me`
- **Headers:** `Authorization: Bearer <clerk_jwt>`

**Response**

- **Status:** `200 OK`
- **Body (JSON):**

```json
{
  "role": "admin",
  "tenantId": "uuid",
  "tenantName": "Nome da Empresa"
}
```

- `role`: one of `"admin"`, `"manager"`, `"viewer"`.
- `tenantId`: UUID of the tenant the user belongs to.
- `tenantName`: (optional) Display name of the tenant for the sidebar/UI.

- **Errors:** `401 Unauthorized` (invalid or missing token), `404 Not Found` (user not found in your `users` table for this Clerk `sub`).

---

### 1. List catalogos

**Request**

- **Method:** `GET`
- **Path:** `/catalogos`
- **Headers:** `Authorization: Bearer <clerk_jwt>`
- **Query parameters (optional):**
  - `sector` (string): filter by sector
  - `q` (string): full-text search over the catalog's extracted text (searchableText); implementation is backend-specific (e.g. PostgreSQL `to_tsvector`).
  - `page` (number): 1-based page for pagination
  - `limit` (number): items per page (e.g. default 20)

**Response**

- **Status:** `200 OK`
- **Body (JSON):**

```json
{
  "items": [
    {
      "id": "uuid",
      "name": "string",
      "sector": "string | null",
      "fileUrl": "string | null",
      "fileName": "string | null",
      "mimeType": "string | null",
      "searchableText": "string | null",
      "createdAt": "ISO8601 datetime string"
    }
  ],
  "total": 0
}
```

- **Errors:** `401 Unauthorized` (invalid or missing token), `403 Forbidden` (no access to tenant).

---

### 2. Upload catalogo

**Request**

- **Method:** `POST`
- **Path:** `/catalogos/upload`
- **Headers:** `Authorization: Bearer <clerk_jwt>`
- **Body:** `multipart/form-data` with:
  - `file` (required): PDF file
  - `name` (optional): display name
  - `sector` (optional): sector label

**Backend behavior**

- Upload the PDF to **AWS S3** (or configured object storage); obtain the object URL.
- Store the **object URL** in the database (exposed as `fileUrl` in the API response).
- Extract the PDF text on the server (e.g. with a library such as `pdf-parse` in Node) and persist it in a `searchable_text`-style column for later full-text search.

**Response**

- **Status:** `201 Created` (or `200 OK` with created resource)
- **Body (JSON):** Single catalog object, e.g.:

```json
{
  "id": "uuid",
  "name": "string",
  "sector": "string | null",
  "fileUrl": "https://...",
  "fileName": "string",
  "mimeType": "application/pdf",
  "searchableText": "string | null",
  "createdAt": "ISO8601 datetime string"
}
```

- `searchableText`: (optional) Text extracted from the PDF for search indexing; may be omitted or null if extraction is not yet implemented or fails.

- **Errors:**
  - `400 Bad Request`: invalid or missing file, wrong type
  - `401 Unauthorized`: invalid or missing token
  - `403 Forbidden`: user not allowed to upload (e.g. role)
  - `413 Payload Too Large`: file exceeds limit (e.g. 10 MB)
  - `422 Unprocessable Entity`: validation errors (e.g. invalid name/sector)

---

### 3. Get catalog (optional)

**Request**

- **Method:** `GET`
- **Path:** `/catalogos/:id`
- **Headers:** `Authorization: Bearer <clerk_jwt>`

**Response**

- **Status:** `200 OK`
- **Body:** Same shape as one element of `items` above.
- **Errors:** `401`, `403`, `404 Not Found`.

---

### 4. Download catalog (optional)

**Request**

- **Method:** `GET`
- **Path:** `/catalogos/:id/download` (or return a signed URL in the list/detail response)

**Response**

- **Status:** `302 Redirect` to file URL, or `200 OK` with file stream.
- **Errors:** `401`, `403`, `404`.

---

## TypeScript interfaces (for reference)

```ts
interface CurrentUserProfile {
  role: "admin" | "manager" | "viewer";
  tenantId: string;
  tenantName?: string;
}

interface Catalogo {
  id: string;
  name: string;
  sector: string | null;
  fileUrl: string | null;
  fileName: string | null;
  mimeType: string | null;
  searchableText?: string | null;
  createdAt: string; // ISO8601
}

interface CatalogosListResponse {
  items: Catalogo[];
  total: number;
}
```

## CORS

If the frontend is served from a different origin than the API, enable CORS for that origin and allow `Authorization` and `Content-Type` headers.

## Recommendation

- Use **Fastify** (or Express) with a **Zod**-validated body/query.
- Validate Clerk JWT using Clerk's JWKS endpoint or server-side SDK; read `sub` (user id) and custom claims (e.g. `tenant_id`, `role`).
- Store uploaded files in **AWS S3** (or equivalent object storage); save the object **URL** as `fileUrl` and metadata in the database per tenant. Extract PDF text on upload and store it (e.g. in `searchable_text`) for full-text search via the optional `q` query parameter on list.
