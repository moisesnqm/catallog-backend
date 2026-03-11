/**
 * Delete a catalog area (tenant-scoped). Catalogos referencing it will have area_id set to null.
 */

import type { CatalogAreaRepository } from '../repositories/catalog-area.repository.js';
import type { AuthContext } from '../auth/types.js';

export interface DeleteAreaInput {
  auth: AuthContext;
  id: string;
}

export interface DeleteAreaUseCase {
  execute(input: DeleteAreaInput): Promise<boolean>;
}

export class DeleteAreaUseCaseImpl implements DeleteAreaUseCase {
  constructor(private readonly catalogAreaRepository: CatalogAreaRepository) {}

  async execute(input: DeleteAreaInput): Promise<boolean> {
    const { auth, id } = input;
    const area = await this.catalogAreaRepository.findByIdAndTenant(id, auth.tenantId);
    if (!area) {
      return false;
    }
    await this.catalogAreaRepository.remove(area);
    return true;
  }
}
