# Catalog Areas API — Frontend integration guide

This document describes the **catalog area** feature and related changes to the **catalogs** API so the frontend can implement classification of catalogs by area per tenant (e.g. "Área molhada", "Dormitório", "Home"). Each tenant has its own list of areas; other tenants can have completely different classifications.

---

## 1. Objective

- **Catalog areas** are tenant-specific labels used to classify catalogs (e.g. by room or space: "Área molhada", "Dormitório", "Home").
- They are **independent** of the existing **sector** field (which is used for access control and business sectors like financeiro, vendas, etc.).
- Areas are **optional**: a catalog may have no area, one area, or the tenant may not use areas at all.

---

## 2. Catalog Area resource

### Description

- Each tenant has its own list of **areas**.
- Areas have a **name** and an optional **display order** for UI sorting.
- Only users with **admin** or **manager** role can create, update, or delete areas.
- All area endpoints require **authentication** (Bearer JWT). The tenant is derived from the authenticated user.

### Base URL

All endpoints are relative to the API base URL (e.g. `https://api.example.com`). Send `Authorization: Bearer <token>` on every request.

### Endpoints

| Method | Path | Description | Who |
|--------|------|-------------|-----|
| GET | `/areas` | List areas for the current tenant | Any authenticated user |
| GET | `/areas/:id` | Get one area by ID | Any authenticated user |
| POST | `/areas` | Create an area | Admin or manager |
| PATCH | `/areas/:id` | Update an area | Admin or manager |
| DELETE | `/areas/:id` | Delete an area (catalogs using it will have no area) | Admin or manager |

### Query parameters — GET /areas

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| sortBy | `'display_order'` \| `'name'` | `display_order` | Sort field |
| sortOrder | `'asc'` \| `'desc'` | `asc` | Sort direction |

### Request bodies

**POST /areas**

```json
{
  "name": "Área molhada",
  "displayOrder": 0
}
```

- `name` (string, required): 1–255 characters, trimmed.
- `displayOrder` (integer, optional): Used for ordering in the UI.

**PATCH /areas/:id**

```json
{
  "name": "Dormitório",
  "displayOrder": 1
}
```

- Both fields are optional; send only the ones you want to update.
- `displayOrder` can be set to `null` to clear it.

### Response shape — Area

All area responses (single or in list) use this shape:

```ts
interface AreaResponse {
  id: string;           // UUID
  name: string;
  displayOrder: number | null;
  createdAt: string;     // ISO 8601
  updatedAt: string;    // ISO 8601
}
```

- **GET /areas** returns an **array** of `AreaResponse`.
- **GET /areas/:id**, **POST /areas**, and **PATCH /areas/:id** return a single `AreaResponse`.

### Status codes

- **200** — Success (GET, PATCH).
- **201** — Created (POST).
- **204** — No content (DELETE).
- **401** — Missing or invalid token.
- **403** — Forbidden (e.g. viewer calling POST/PATCH/DELETE).
- **404** — Area not found or not in current tenant (GET/PATCH/DELETE).
- **422** — Validation error (body or query).

---

## 3. Changes to the Catalogo resource

### List catalogs — GET /catalogos

- **New query parameter**
  - `areaId` (optional, UUID): filter catalogs by this area (must belong to the current tenant).

- **Response**: each item in `items` now includes:
  - `areaId`: `string | null` (UUID of the area, or null if unset).
  - `area`: `{ id: string; name: string } | null` (present when the catalog has an area).

### Get one catalog — GET /catalogos/:id

- **Response** now includes:
  - `areaId`: `string | null`
  - `area`: `{ id: string; name: string } | null`

### Update catalog — PATCH /catalogos/:id

- **Availability**: admin or manager only.
- **Request body** (JSON, all fields optional; partial update):
  - `name` (string, optional): 1–255 characters, trimmed.
  - `sector` (string | null, optional): one of the allowed sector values or `null`.
  - `areaId` (UUID | null, optional): area ID for the current tenant, or `null` to unset.
- **Response**: full `CatalogoResponse` (same shape as GET /catalogos/:id).
- **404** if the catalog does not exist or belongs to another tenant.
- **422** if validation fails or if `areaId` is not found / does not belong to the tenant.

### Upload catalog — POST /catalogos/upload

- **New form field** (multipart):
  - `areaId` (optional, string): UUID of an area that belongs to the current tenant.

- If `areaId` is sent but invalid (e.g. wrong tenant or not found), the API returns **422** with message: `"Area not found or does not belong to tenant"`.

- The upload response includes `areaId` and `area` in the same shape as list/get.

### Catalogo response type (summary)

```ts
interface CatalogoResponse {
  id: string;
  name: string;
  sector: string | null;
  areaId: string | null;    // NEW
  area: { id: string; name: string } | null;  // NEW
  fileUrl: string | null;
  fileName: string | null;
  mimeType: string | null;
  searchableText?: string | null;
  createdAt: string;
}
```

---

## 4. Suggested UX for the frontend

1. **Areas management (admin/manager)**
   - A dedicated screen or section to list, create, edit, and delete areas for the tenant.
   - List areas sorted by `displayOrder` (nulls last) then by name, or allow sort by name.
   - Show area name and optional order; allow reordering (update `displayOrder` via PATCH).

2. **Catalog upload**
   - In the upload form, add an optional **area** dropdown (or autocomplete) filled with `GET /areas` for the tenant.
   - Send the selected area’s `id` as `areaId` in the multipart form.

3. **Catalog list**
   - Add an optional filter by **area** (dropdown populated with `GET /areas`); send selected id as `areaId` query param to `GET /catalogos`.
   - In the table/cards, show the catalog’s `area.name` when `area` is not null.

4. **Catalog detail**
   - Display the catalog’s area (e.g. `area.name`) when present.

---

## 5. Summary

- **Areas** are tenant-specific and managed via `GET/POST /areas` and `GET/PATCH/DELETE /areas/:id`.
- **Catalogs** can optionally reference an area via `areaId`; list and detail responses include `areaId` and `area`; upload accepts `areaId`; list accepts filter `areaId`.
- Use **display_order** and **name** to order areas in the UI; only admin/manager can mutate areas.
