/**
 * Request-scoped auth context after JWT validation and user resolution.
 */

export interface AuthContext {
  /** Clerk user ID (JWT sub). */
  clerkUserId: string;
  /** Application user UUID. */
  userId: string;
  /** Tenant UUID. */
  tenantId: string;
  /** Role: admin | manager | viewer. */
  role: string;
  /** Sector access: all | none | financeiro | pcp | producao | vendas | projeto. */
  sectorAccess: string;
}
