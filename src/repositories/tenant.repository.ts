/**
 * Tenant repository — lookup by id (e.g. for tenant name in profile).
 */

import type { DataSource, Repository } from 'typeorm';
import { Tenant } from '../entities/tenant.entity.js';

export interface TenantRepository {
  findById(id: string): Promise<{ name: string } | null>;
}

export class TenantRepositoryImpl implements TenantRepository {
  private readonly repo: Repository<Tenant>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(Tenant);
  }

  async findById(id: string): Promise<{ name: string } | null> {
    const tenant = await this.repo.findOne({
      where: { id },
      select: ['name'],
    });
    return tenant ?? null;
  }
}
