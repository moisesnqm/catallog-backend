/**
 * Upload catalogo use case — stores file and metadata (role check done in HTTP layer).
 */

import type { CatalogoRepository } from '../repositories/catalogo.repository.js';
import type { CatalogAreaRepository } from '../repositories/catalog-area.repository.js';
import type { AuthContext } from '../auth/types.js';
import { Catalogo } from '../entities/catalogo.entity.js';
import { uploadSectorSchema } from '../schemas/catalogo.js';
import type { CatalogoResponse } from '../schemas/catalogo.js';

function toResponse(
  c: Catalogo,
  baseUrl?: string,
  areaSummary?: { id: string; name: string } | null
): CatalogoResponse {
  const fileUrl =
    c.file_url ?? (baseUrl ? `${baseUrl.replace(/\/$/, '')}/catalogos/${c.id}/download` : null);
  return {
    id: c.id,
    name: c.name,
    sector: c.sector,
    areaId: c.area_id ?? null,
    area: areaSummary ?? null,
    fileUrl,
    fileName: c.file_name || null,
    mimeType: c.mime_type || null,
    searchableText: c.searchable_text ?? null,
    createdAt: c.created_at.toISOString(),
  };
}

export interface UploadCatalogoInput {
  auth: AuthContext;
  name: string;
  sector: string | null;
  /** Catalog area ID (must belong to the same tenant). */
  areaId?: string | null;
  fileName: string;
  /** Local path or S3 key; empty string when using S3-only. */
  filePath: string | null;
  mimeType: string;
  /** S3 object URL when file was uploaded to S3. */
  fileUrl?: string | null;
  /** Extracted PDF text for full-text search. */
  searchableText?: string | null;
  /** Optional base URL for building fileUrl in response when file_url is not set. */
  baseUrl?: string;
}

export interface UploadCatalogoUseCase {
  execute(input: UploadCatalogoInput): Promise<CatalogoResponse>;
}

export class UploadCatalogoUseCaseImpl implements UploadCatalogoUseCase {
  constructor(
    private readonly catalogoRepository: CatalogoRepository,
    private readonly catalogAreaRepository: CatalogAreaRepository
  ) {}

  async execute(input: UploadCatalogoInput): Promise<CatalogoResponse> {
    const { auth, name, sector, areaId, fileName, filePath, mimeType, fileUrl, searchableText } = input;

    const parsedSector = sector != null && sector !== '' ? uploadSectorSchema.parse(sector) : null;
    const sectorValue: string | null = parsedSector ?? null;

    let resolvedAreaId: string | null = null;
    let areaSummary: { id: string; name: string } | null = null;
    if (areaId != null && areaId !== '') {
      const area = await this.catalogAreaRepository.findByIdAndTenant(areaId, auth.tenantId);
      if (!area) {
        throw new Error('Area not found or does not belong to tenant');
      }
      resolvedAreaId = area.id;
      areaSummary = { id: area.id, name: area.name };
    }

    const catalogo = new Catalogo();
    catalogo.tenant_id = auth.tenantId;
    catalogo.name = name || fileName;
    catalogo.sector = sectorValue;
    catalogo.area_id = resolvedAreaId;
    catalogo.file_name = fileName;
    catalogo.file_path = filePath ?? null;
    catalogo.file_url = fileUrl ?? null;
    catalogo.searchable_text = searchableText ?? null;
    catalogo.mime_type = mimeType;

    const saved = await this.catalogoRepository.save(catalogo);
    return toResponse(saved, input.baseUrl, areaSummary);
  }
}
