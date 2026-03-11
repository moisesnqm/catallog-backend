/**
 * Zod schemas for admin endpoints.
 */

import { z } from 'zod';
import { sectorAccessSchema } from './sector.js';

export const roleSchema = z.enum(['admin', 'manager', 'viewer']);
export type Role = z.infer<typeof roleSchema>;

export const updateUserRoleBodySchema = z.object({
  role: roleSchema.optional(),
  sector_access: sectorAccessSchema.optional(),
}).refine(
  (data) => data.role !== undefined || data.sector_access !== undefined,
  { message: 'At least one of role or sector_access must be provided' }
);
export type UpdateUserRoleBody = z.infer<typeof updateUserRoleBodySchema>;

export const linkUserBodySchema = z.object({
  email: z.string().email(),
  role: roleSchema.optional(),
  sector_access: sectorAccessSchema.optional(),
});
export type LinkUserBody = z.infer<typeof linkUserBodySchema>;
