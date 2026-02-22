# Authentication and RBAC — Academy Backend

This document describes how the backend should validate Clerk and enforce role-based access.

## Clerk validation

- The frontend sends the Clerk session JWT in `Authorization: Bearer <token>`.
- **Option A — JWT verification:** Verify the JWT using Clerk's JWKS (e.g. `https://<clerk-domain>/.well-known/jwks.json`) and validate `iss`, `sub`, and `exp`. Optionally add custom claims (e.g. `tenant_id`, `role`) via Clerk Dashboard or backend sync.
- **Option B — Clerk Backend API:** For each request, call Clerk's API to get user/session and resolve tenant and role from your own `users` table keyed by `clerk_user_id`.

Recommendation: Verify JWT for performance; sync users and roles into your DB (e.g. via Clerk webhooks) and use DB for tenant/role when needed.

## Roles

Align with the frontend:

| Role     | Can list catalogos | Can upload catalogos |
|----------|--------------------|-----------------------|
| admin    | Yes                | Yes                   |
| manager  | Yes                | Yes                   |
| viewer   | Yes                | No                    |

- **List catalogos:** All authenticated users with a role in the tenant can list that tenant's catalogos.
- **Upload catalogos:** Only `admin` and `manager` can upload.

## Where to store role and tenant

- **Option 1:** Store in your DB: `users.tenant_id`, `users.role`. Resolve after validating the JWT `sub` (Clerk user ID).
- **Option 2:** Put `tenant_id` and `role` in the JWT as custom claims (e.g. via Clerk Dashboard or a backend that issues a custom token). Then the API can read them from the JWT without a DB lookup for every request.

## Implementation checklist

1. Validate JWT (Clerk JWKS or secret).
2. Extract user id (`sub`) and, if present, `tenant_id` and `role` from token or DB.
3. For `/catalogos`: ensure user has access to the tenant; return only that tenant's catalogos.
4. For `POST /catalogos/upload`: ensure user has role `admin` or `manager` for that tenant; create catalogo with `tenant_id`.
5. Return `401` when token is missing or invalid; `403` when the user lacks permission for the action or tenant.

## Webhooks (optional)

Use Clerk webhooks (e.g. `user.created`, `user.updated`, `user.deleted`) to keep your `users` table in sync with Clerk and to set `tenant_id` and `role` when users are created or updated.
