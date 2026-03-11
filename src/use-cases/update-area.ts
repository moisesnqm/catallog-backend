/**
 * Update a catalog area (tenant-scoped).
 */

import type { CatalogAreaRepository } from '../repositories/catalog-area.repository.js';
import type { AuthContext } from '../auth/types.js';
import type { UpdateAreaBody } from '../schemas/catalog-area.js';
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

export interface UpdateAreaInput {
  auth: AuthContext;
  id: string;
  body: UpdateAreaBody;
}

export interface UpdateAreaUseCase {
  execute(input: UpdateAreaInput): Promise<AreaResponse | null>;
}

export class UpdateAreaUseCaseImpl implements UpdateAreaUseCase {
  constructor(private readonly catalogAreaRepository: CatalogAreaRepository) {}

  async execute(input: UpdateAreaInput): Promise<AreaResponse | null> {
    const { auth, id, body } = input;
    const area = await this.catalogAreaRepository.findByIdAndTenant(id, auth.tenantId);
    if (!area) {
      return null;
    }
    if (body.name !== undefined) {
      area.name = body.name;
    }
    if (body.displayOrder !== undefined) {
      area.display_order = body.displayOrder;
    }
    const saved = await this.catalogAreaRepository.save(area);
    return toResponse(saved);
  }
}
