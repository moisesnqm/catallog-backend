/**
 * CatalogArea repository — CRUD scoped by tenant.
 */

import type { DataSource, Repository } from 'typeorm';
import { CatalogArea } from '../entities/catalog-area.entity.js';
export interface ListAreasOptions {
  tenantId: string;
  sortBy: 'display_order' | 'name';
  sortOrder: 'asc' | 'desc';
}

export interface CatalogAreaRepository {
  findByTenant(options: ListAreasOptions): Promise<CatalogArea[]>;
  findByIdAndTenant(id: string, tenantId: string): Promise<CatalogArea | null>;
  save(area: CatalogArea): Promise<CatalogArea>;
  remove(area: CatalogArea): Promise<CatalogArea>;
}

export class CatalogAreaRepositoryImpl implements CatalogAreaRepository {
  private readonly repo: Repository<CatalogArea>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(CatalogArea);
  }

  async findByTenant(options: ListAreasOptions): Promise<CatalogArea[]> {
    const { tenantId, sortBy, sortOrder } = options;
    const qb = this.repo
      .createQueryBuilder('a')
      .where('a.tenant_id = :tenantId', { tenantId });
    const orderDirection = sortOrder === 'desc' ? 'DESC' : 'ASC';
    if (sortBy === 'display_order') {
      qb.orderBy('a.display_order', orderDirection, 'NULLS LAST').addOrderBy('a.name', 'ASC');
    } else {
      qb.orderBy('a.name', orderDirection);
    }
    return qb.getMany();
  }

  async findByIdAndTenant(id: string, tenantId: string): Promise<CatalogArea | null> {
    const area = await this.repo.findOne({
      where: { id, tenant_id: tenantId },
    });
    return area ?? null;
  }

  async save(area: CatalogArea): Promise<CatalogArea> {
    return this.repo.save(area);
  }

  async remove(area: CatalogArea): Promise<CatalogArea> {
    return this.repo.remove(area);
  }
}
