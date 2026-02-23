/**
 * Delete catalogo use case — only admin and manager can delete; scope is the user's tenant.
 * Role check is performed in the HTTP layer (requireUploadRole).
 */

import type { CatalogoRepository } from '../repositories/catalogo.repository.js';
import type { AuthContext } from '../auth/types.js';

export interface DeleteCatalogoInput {
  auth: AuthContext;
  id: string;
}

export interface DeleteCatalogoUseCase {
  /**
   * Deletes a catalogo by id if it belongs to the user's tenant.
   *
   * @returns true if the catalogo was found and deleted; false if not found (e.g. wrong tenant or invalid id).
   */
  execute(input: DeleteCatalogoInput): Promise<boolean>;
}

export class DeleteCatalogoUseCaseImpl implements DeleteCatalogoUseCase {
  constructor(private readonly catalogoRepository: CatalogoRepository) {}

  async execute(input: DeleteCatalogoInput): Promise<boolean> {
    const { auth, id } = input;

    const catalogo = await this.catalogoRepository.findByIdAndTenant(id, auth.tenantId);
    if (!catalogo) {
      return false;
    }

    await this.catalogoRepository.remove(catalogo);
    return true;
  }
}
