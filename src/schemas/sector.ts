/**
 * Sector access and catalog sector domain (Zod schemas and types).
 * - sector_access: user-level visibility ('all' | 'none' | specific sector).
 * - catalog sector: only concrete sectors (no 'all'/'none').
 */

import { z } from 'zod';

/** Concrete sectors for catalog classification. */
export const SECTOR_VALUES = [
  'financeiro',
  'pcp',
  'producao',
  'vendas',
  'projeto',
] as const;

/** User sector access: all, none, or one concrete sector. */
export const SECTOR_ACCESS_VALUES = ['all', 'none', ...SECTOR_VALUES] as const;

export const sectorAccessSchema = z.enum(SECTOR_ACCESS_VALUES);
export type SectorAccess = z.infer<typeof sectorAccessSchema>;

/** Sector for a catalog (optional; only concrete sectors). */
export const catalogSectorSchema = z.enum(SECTOR_VALUES).nullable();
export type CatalogSector = z.infer<typeof catalogSectorSchema>;

/** Default sector access for new users. */
export const SECTOR_ACCESS_DEFAULT: SectorAccess = 'all';
