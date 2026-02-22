/**
 * Get catalogo download — returns file path if user has visibility (for streaming or redirect).
 */

import type { CatalogoRepository } from '../repositories/catalogo.repository.js';
import type { AuthContext } from '../auth/types.js';
import { sectorAccessSchema } from '../schemas/sector.js';

export interface GetCatalogoDownloadInput {
  auth: AuthContext;
  id: string;
}

export interface GetCatalogoDownloadResult {
  filePath: string;
  fileName: string;
  mimeType: string;
}

export interface GetCatalogoDownloadUseCase {
  execute(input: GetCatalogoDownloadInput): Promise<GetCatalogoDownloadResult | null>;
}

export class GetCatalogoDownloadUseCaseImpl implements GetCatalogoDownloadUseCase {
  constructor(private readonly catalogoRepository: CatalogoRepository) {}

  async execute(input: GetCatalogoDownloadInput): Promise<GetCatalogoDownloadResult | null> {
    const { auth, id } = input;
    const sectorAccess = sectorAccessSchema.parse(auth.sectorAccess);

    const catalogo = await this.catalogoRepository.findByIdAndTenantAndSectorAccess(
      id,
      auth.tenantId,
      sectorAccess
    );

    if (!catalogo) {
      return null;
    }

    return {
      filePath: catalogo.file_path,
      fileName: catalogo.file_name,
      mimeType: catalogo.mime_type,
    };
  }
}
