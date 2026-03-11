/**
 * List catalog areas for the current tenant.
 */

import type { CatalogAreaRepository } from '../repositories/catalog-area.repository.js';
import type { AuthContext } from '../auth/types.js';
import type { ListAreasQuery } from '../schemas/catalog-area.js';
import type { AreaResponse } from '../schemas/catalog-area.js';

function toResponse(a: { id: string; name: string; display_order: number | null; created_at: Date; updated_at: Date }): AreaResponse {
  return {
    id: a.id,
    name: a.name,
    displayOrder: a.display_order,
    createdAt: a.created_at.toISOString(),
    updatedAt: a.updated_at.toISOString(),
  };
}

export interface ListAreasInput {
  auth: AuthContext;
  query: ListAreasQuery;
}

export interface ListAreasUseCase {
  execute(input: ListAreasInput): Promise<AreaResponse[]>;
}

export class ListAreasUseCaseImpl implements ListAreasUseCase {
  constructor(private readonly catalogAreaRepository: CatalogAreaRepository) {}

  async execute(input: ListAreasInput): Promise<AreaResponse[]> {
    const { auth, query } = input;
    const areas = await this.catalogAreaRepository.findByTenant({
      tenantId: auth.tenantId,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
    return areas.map(toResponse);
  }
}
