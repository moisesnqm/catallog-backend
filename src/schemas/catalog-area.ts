/**
 * Zod schemas and types for Catalog Area API (list, create, update, response).
 */

import { z } from 'zod';

export const listAreasQuerySchema = z.object({
  sortBy: z.enum(['display_order', 'name']).default('display_order'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});
export type ListAreasQuery = z.infer<typeof listAreasQuerySchema>;

export const createAreaBodySchema = z.object({
  name: z.string().min(1).max(255).trim(),
  displayOrder: z.number().int().optional(),
});
export type CreateAreaBody = z.infer<typeof createAreaBodySchema>;

export const updateAreaBodySchema = z.object({
  name: z.string().min(1).max(255).trim().optional(),
  displayOrder: z.number().int().nullable().optional(),
});
export type UpdateAreaBody = z.infer<typeof updateAreaBodySchema>;

export const areaResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  displayOrder: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type AreaResponse = z.infer<typeof areaResponseSchema>;

export const areaSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
});
export type AreaSummary = z.infer<typeof areaSummarySchema>;
