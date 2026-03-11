/**
 * Create a catalog area for the current tenant.
 */

import type { CatalogAreaRepository } from '../repositories/catalog-area.repository.js';
import type { AuthContext } from '../auth/types.js';
import { CatalogArea } from '../entities/catalog-area.entity.js';
import type { CreateAreaBody } from '../schemas/catalog-area.js';
import type { AreaResponse } from '../schemas/catalog-area.js';

function toResponse(a: CatalogArea): AreaResponse {
  return {
    id: a.id,
    name: a.name,
    displayOrder: a.display_order,
    createdAt: a.created_at.toISOString(),
    updatedAt: a.updated_at.toISOString(),
  };
}

export interface CreateAreaInput {
  auth: AuthContext;
  body: CreateAreaBody;
}

export interface CreateAreaUseCase {
  execute(input: CreateAreaInput): Promise<AreaResponse>;
}

export class CreateAreaUseCaseImpl implements CreateAreaUseCase {
  constructor(private readonly catalogAreaRepository: CatalogAreaRepository) {}

  async execute(input: CreateAreaInput): Promise<AreaResponse> {
    const { auth, body } = input;
    const area = new CatalogArea();
    area.tenant_id = auth.tenantId;
    area.name = body.name;
    area.display_order = body.displayOrder ?? null;
    const saved = await this.catalogAreaRepository.save(area);
    return toResponse(saved);
  }
}
