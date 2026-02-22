/**
 * Upload catalogo use case — stores file and metadata (role check done in HTTP layer).
 */

import type { CatalogoRepository } from '../repositories/catalogo.repository.js';
import type { AuthContext } from '../auth/types.js';
import { Catalogo } from '../entities/catalogo.entity.js';
import { uploadSectorSchema } from '../schemas/catalogo.js';
import type { CatalogoResponse } from '../schemas/catalogo.js';

function toResponse(c: Catalogo, baseUrl?: string): CatalogoResponse {
  const fileUrl = baseUrl ? `${baseUrl.replace(/\/$/, '')}/catalogos/${c.id}/download` : null;
  return {
    id: c.id,
    name: c.name,
    sector: c.sector,
    fileUrl,
    fileName: c.file_name || null,
    mimeType: c.mime_type || null,
    createdAt: c.created_at.toISOString(),
  };
}

export interface UploadCatalogoInput {
  auth: AuthContext;
  name: string;
  sector: string | null;
  fileName: string;
  filePath: string;
  mimeType: string;
  /** Optional base URL for building fileUrl in response. */
  baseUrl?: string;
}

export interface UploadCatalogoUseCase {
  execute(input: UploadCatalogoInput): Promise<CatalogoResponse>;
}

export class UploadCatalogoUseCaseImpl implements UploadCatalogoUseCase {
  constructor(private readonly catalogoRepository: CatalogoRepository) {}

  async execute(input: UploadCatalogoInput): Promise<CatalogoResponse> {
    const { auth, name, sector, fileName, filePath, mimeType } = input;

    const parsedSector = sector != null && sector !== '' ? uploadSectorSchema.parse(sector) : null;
    const sectorValue: string | null = parsedSector ?? null;

    const catalogo = new Catalogo();
    catalogo.tenant_id = auth.tenantId;
    catalogo.name = name || fileName;
    catalogo.sector = sectorValue;
    catalogo.file_name = fileName;
    catalogo.file_path = filePath;
    catalogo.mime_type = mimeType;

    const saved = await this.catalogoRepository.save(catalogo);
    return toResponse(saved, input.baseUrl);
  }
}
