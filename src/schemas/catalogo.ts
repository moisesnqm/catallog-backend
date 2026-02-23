/**
 * Zod schemas and types for Catalogo API (list query, response, upload).
 */

import { z } from 'zod';
import { SECTOR_VALUES } from './sector.js';

export const listCatalogosQuerySchema = z.object({
  sector: z.string().max(100).optional(),
  q: z.string().max(500).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListCatalogosQuery = z.infer<typeof listCatalogosQuerySchema>;

/** Sector for upload: only concrete sectors (no all/none). */
export const uploadSectorSchema = z.enum(SECTOR_VALUES).optional();
export type UploadSector = z.infer<typeof uploadSectorSchema>;

export const catalogoResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  sector: z.string().nullable(),
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
