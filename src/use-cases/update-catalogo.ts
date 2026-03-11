/**
 * Update catalogo metadata (name, sector, areaId) — tenant-scoped; admin/manager only at HTTP layer.
 */

import type { CatalogoRepository } from '../repositories/catalogo.repository.js';
import type { CatalogAreaRepository } from '../repositories/catalog-area.repository.js';
import type { AuthContext } from '../auth/types.js';
import type { UpdateCatalogoBody } from '../schemas/catalogo.js';
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

export interface UpdateCatalogoInput {
  auth: AuthContext;
  id: string;
  body: UpdateCatalogoBody;
  /** Optional base URL for building fileUrl in response. */
  baseUrl?: string;
}

export interface UpdateCatalogoUseCase {
  execute(input: UpdateCatalogoInput): Promise<CatalogoResponse | null>;
}

export class UpdateCatalogoUseCaseImpl implements UpdateCatalogoUseCase {
  constructor(
    private readonly catalogoRepository: CatalogoRepository,
    private readonly catalogAreaRepository: CatalogAreaRepository
  ) {}

  async execute(input: UpdateCatalogoInput): Promise<CatalogoResponse | null> {
    const { auth, id, body, baseUrl } = input;
    const catalogo = await this.catalogoRepository.findByIdAndTenant(id, auth.tenantId);
    if (!catalogo) {
      return null;
    }
    if (body.name !== undefined) {
      catalogo.name = body.name;
    }
    if (body.sector !== undefined) {
      catalogo.sector = body.sector;
    }
    if (body.areaId !== undefined) {
      if (body.areaId === null || body.areaId === '') {
        catalogo.area_id = null;
      } else {
        const area = await this.catalogAreaRepository.findByIdAndTenant(body.areaId, auth.tenantId);
        if (!area) {
          throw new Error('Area not found or does not belong to tenant');
        }
        catalogo.area_id = area.id;
      }
    }
    await this.catalogoRepository.save(catalogo);
    const updated = await this.catalogoRepository.findByIdAndTenantWithArea(id, auth.tenantId);
    if (!updated) {
      return null;
    }
    return toResponse(updated, baseUrl);
  }
}
