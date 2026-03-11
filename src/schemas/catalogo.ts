/**
 * Zod schemas and types for Catalogo API (list query, response, upload).
 */

import { z } from 'zod';
import { SECTOR_VALUES } from './sector.js';
import { areaSummarySchema } from './catalog-area.js';

export const listCatalogosQuerySchema = z.object({
  sector: z.string().max(100).optional(),
  /** Filter by catalog area ID (tenant-scoped). */
  areaId: z.string().uuid().optional(),
  q: z.string().max(500).optional(),
  /** Partial match on catalog name (case-insensitive). */
  name: z.string().max(255).optional(),
  /** Filter by MIME type (e.g. application/pdf). */
  mimeType: z.string().max(100).optional(),
  /** Filter catalogs created on or after this date (ISO 8601 date or datetime). */
  createdFrom: z.coerce.date().optional(),
  /** Filter catalogs created on or before this date (ISO 8601 date or datetime). */
  createdTo: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListCatalogosQuery = z.infer<typeof listCatalogosQuerySchema>;

/** Sector for upload: only concrete sectors (no all/none). */
export const uploadSectorSchema = z.enum(SECTOR_VALUES).optional();
export type UploadSector = z.infer<typeof uploadSectorSchema>;

/** Body for PATCH /catalogos/:id — partial update. */
export const updateCatalogoBodySchema = z.object({
  name: z.string().min(1).max(255).trim().optional(),
  sector: z.enum(SECTOR_VALUES).nullable().optional(),
  areaId: z.string().uuid().nullable().optional(),
});
export type UpdateCatalogoBody = z.infer<typeof updateCatalogoBodySchema>;

export const catalogoResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  sector: z.string().nullable(),
  areaId: z.string().uuid().nullable(),
  area: areaSummarySchema.nullable(),
  fileUrl: z.string().nullable(),
  fileName: z.string().nullable(),
  mimeType: z.string().nullable(),
  searchableText: z.string().nullable().optional(),
  createdAt: z.string(),
});
export type CatalogoResponse = z.infer<typeof catalogoResponseSchema>;

export const catalogosListResponseSchema = z.object({
  items: z.array(catalogoResponseSchema),
  total: z.number().int().min(0),
});
export type CatalogosListResponse = z.infer<typeof catalogosListResponseSchema>;
