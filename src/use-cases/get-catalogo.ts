/**
 * Get single catalogo by id — applies tenant and sector_access visibility.
 */

import type { CatalogoRepository } from '../repositories/catalogo.repository.js';
import type { AuthContext } from '../auth/types.js';
import { sectorAccessSchema } from '../schemas/sector.js';
import type { CatalogoResponse } from '../schemas/catalogo.js';

function toResponse(
  c: {
    id: string;
    name: string;
    sector: string | null;
    area_id: string | null;
    area?: { id: string; name: string } | null;
    file_name: string;
    file_path: string | null;
    file_url: string | null;
    searchable_text: string | null;
    mime_type: string;
    created_at: Date;
  },
  baseUrl?: string
): CatalogoResponse {
  const fileUrl =
    c.file_url ?? (baseUrl ? `${baseUrl.replace(/\/$/, '')}/catalogos/${c.id}/download` : null);
  const area = c.area ?? null;
  return {
    id: c.id,
    name: c.name,
    sector: c.sector,
    areaId: c.area_id ?? null,
    area: area ? { id: area.id, name: area.name } : null,
    fileUrl,
    fileName: c.file_name || null,
    mimeType: c.mime_type || null,
    searchableText: c.searchable_text ?? null,
    createdAt: c.created_at.toISOString(),
  };
}

export interface GetCatalogoInput {
  auth: AuthContext;
  id: string;
  /** Optional base URL for building fileUrl in response. */
  baseUrl?: string;
}

export interface GetCatalogoUseCase {
  execute(input: GetCatalogoInput): Promise<CatalogoResponse | null>;
}

export class GetCatalogoUseCaseImpl implements GetCatalogoUseCase {
  constructor(private readonly catalogoRepository: CatalogoRepository) {}

  async execute(input: GetCatalogoInput): Promise<CatalogoResponse | null> {
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

    return toResponse(catalogo, input.baseUrl);
  }
}
