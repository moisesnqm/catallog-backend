/**
 * Get a single catalog area by id (tenant-scoped).
 */

import type { CatalogAreaRepository } from '../repositories/catalog-area.repository.js';
import type { AuthContext } from '../auth/types.js';
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

export interface GetAreaInput {
  auth: AuthContext;
  id: string;
}

export interface GetAreaUseCase {
  execute(input: GetAreaInput): Promise<AreaResponse | null>;
}

export class GetAreaUseCaseImpl implements GetAreaUseCase {
  constructor(private readonly catalogAreaRepository: CatalogAreaRepository) {}

  async execute(input: GetAreaInput): Promise<AreaResponse | null> {
    const { auth, id } = input;
    const area = await this.catalogAreaRepository.findByIdAndTenant(id, auth.tenantId);
    if (!area) {
      return null;
    }
    return toResponse(area);
  }
}
