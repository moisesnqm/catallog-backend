/**
 * List catalogos use case — applies tenant and sector_access filtering.
 */

import type { CatalogoRepository } from '../repositories/catalogo.repository.js';
import type { AuthContext } from '../auth/types.js';
import type { ListCatalogosQuery } from '../schemas/catalogo.js';
import { sectorAccessSchema } from '../schemas/sector.js';
import type { CatalogosListResponse, CatalogoResponse } from '../schemas/catalogo.js';

function toResponse(
  c: {
    id: string;
    name: string;
    sector: string | null;
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
  return {
    id: c.id,
    name: c.name,
    sector: c.sector,
    fileUrl,
    fileName: c.file_name || null,
    mimeType: c.mime_type || null,
    searchableText: c.searchable_text ?? null,
    createdAt: c.created_at.toISOString(),
  };
}

export interface ListCatalogosInput {
  auth: AuthContext;
  query: ListCatalogosQuery;
  /** Optional base URL for building fileUrl in response. */
  baseUrl?: string;
}

export interface ListCatalogosUseCase {
  execute(input: ListCatalogosInput): Promise<CatalogosListResponse>;
}

export class ListCatalogosUseCaseImpl implements ListCatalogosUseCase {
  constructor(private readonly catalogoRepository: CatalogoRepository) {}

  async execute(input: ListCatalogosInput): Promise<CatalogosListResponse> {
    const { auth, query } = input;
    const sectorAccess = sectorAccessSchema.parse(auth.sectorAccess);

    const result = await this.catalogoRepository.findByTenantAndSectorAccess({
      tenantId: auth.tenantId,
      sectorAccess,
      querySector: query.sector,
      queryText: query.q,
      page: query.page,
      limit: query.limit,
    });

    return {
      items: result.items.map((c) => toResponse(c, input.baseUrl)),
      total: result.total,
    };
  }
}
