/**
 * Catalogo repository — list/find by tenant and sector_access rules.
 */

import type { DataSource, Repository } from 'typeorm';
import { Catalogo } from '../entities/catalogo.entity.js';
import type { SectorAccess } from '../schemas/sector.js';

export interface ListCatalogosOptions {
  tenantId: string;
  sectorAccess: SectorAccess;
  querySector?: string | null;
  /** Filter by catalog area ID. */
  queryAreaId?: string | null;
  /** Full-text search over searchable_text (PostgreSQL plainto_tsquery). */
  queryText?: string | null;
  /** Partial match on catalog name (case-insensitive ILIKE). */
  queryName?: string | null;
  /** Exact match on MIME type. */
  queryMimeType?: string | null;
  /** Catalogs created on or after this date. */
  createdFrom?: Date | null;
  /** Catalogs created on or before this date. */
  createdTo?: Date | null;
  page: number;
  limit: number;
}

export interface ListCatalogosResult {
  items: Catalogo[];
  total: number;
}

export interface CatalogoRepository {
  findByTenantAndSectorAccess(options: ListCatalogosOptions): Promise<ListCatalogosResult>;
  findByIdAndTenantAndSectorAccess(
    id: string,
    tenantId: string,
    sectorAccess: SectorAccess
  ): Promise<Catalogo | null>;
  /** Finds a catalogo by id and tenant (no sector filter). Used for delete by admin/manager. */
  findByIdAndTenant(id: string, tenantId: string): Promise<Catalogo | null>;
  /** Finds a catalogo by id and tenant with area relation loaded. Used for update response. */
  findByIdAndTenantWithArea(id: string, tenantId: string): Promise<Catalogo | null>;
  save(catalogo: Catalogo): Promise<Catalogo>;
  remove(catalogo: Catalogo): Promise<Catalogo>;
}

export class CatalogoRepositoryImpl implements CatalogoRepository {
  private readonly repo: Repository<Catalogo>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(Catalogo);
  }

  async findByTenantAndSectorAccess(options: ListCatalogosOptions): Promise<ListCatalogosResult> {
    const {
      tenantId,
      sectorAccess,
      querySector,
      queryAreaId,
      queryText,
      queryName,
      queryMimeType,
      createdFrom,
      createdTo,
      page,
      limit,
    } = options;

    if (sectorAccess === 'none') {
      return { items: [], total: 0 };
    }

    const qb = this.repo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.area', 'area')
      .where('c.tenant_id = :tenantId', { tenantId });

    if (sectorAccess !== 'all') {
      qb.andWhere('c.sector = :sectorAccess', { sectorAccess });
    }

    if (querySector != null && querySector !== '') {
      qb.andWhere('c.sector = :querySector', { querySector });
    }

    if (queryAreaId != null && queryAreaId !== '') {
      qb.andWhere('c.area_id = :queryAreaId', { queryAreaId });
    }

    if (queryText != null && queryText.trim() !== '') {
      qb.andWhere(
        `to_tsvector('portuguese', COALESCE(c.searchable_text, '')) @@ plainto_tsquery('portuguese', :queryText)`,
        { queryText: queryText.trim() }
      );
    }

    if (queryName != null && queryName.trim() !== '') {
      const escaped = queryName
        .trim()
        .replace(/\\/g, '\\\\')
        .replace(/%/g, '\\%')
        .replace(/_/g, '\\_');
      qb.andWhere("c.name ILIKE :queryName ESCAPE '\\'", { queryName: `%${escaped}%` });
    }

    if (queryMimeType != null && queryMimeType !== '') {
      qb.andWhere('c.mime_type = :queryMimeType', { queryMimeType });
    }

    if (createdFrom != null) {
      qb.andWhere('c.created_at >= :createdFrom', { createdFrom });
    }

    if (createdTo != null) {
      qb.andWhere('c.created_at <= :createdTo', { createdTo });
    }

    const [items, total] = await qb
      .orderBy('c.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items, total };
  }

  async findByIdAndTenantAndSectorAccess(
    id: string,
    tenantId: string,
    sectorAccess: SectorAccess
  ): Promise<Catalogo | null> {
    if (sectorAccess === 'none') {
      return null;
    }

    const qb = this.repo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.area', 'area')
      .where('c.id = :id', { id })
      .andWhere('c.tenant_id = :tenantId', { tenantId });

    if (sectorAccess !== 'all') {
      qb.andWhere('c.sector = :sectorAccess', { sectorAccess });
    }

    const catalogo = await qb.getOne();
    return catalogo ?? null;
  }

  /**
   * Finds a catalogo by id and tenant only (no sector_access filter).
   * Used for delete: admin/manager can delete any catalogo of their tenant.
   */
  async findByIdAndTenant(id: string, tenantId: string): Promise<Catalogo | null> {
    const catalogo = await this.repo.findOne({
      where: { id, tenant_id: tenantId },
    });
    return catalogo ?? null;
  }

  async findByIdAndTenantWithArea(id: string, tenantId: string): Promise<Catalogo | null> {
    const catalogo = await this.repo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.area', 'area')
      .where('c.id = :id', { id })
      .andWhere('c.tenant_id = :tenantId', { tenantId })
      .getOne();
    return catalogo ?? null;
  }

  async save(catalogo: Catalogo): Promise<Catalogo> {
    return this.repo.save(catalogo);
  }

  async remove(catalogo: Catalogo): Promise<Catalogo> {
    return this.repo.remove(catalogo);
  }
}
