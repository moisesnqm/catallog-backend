/**
 * Unit tests for ListCatalogos use case (sector_access: none, all, specific).
 */

import { describe, it, expect, vi } from 'vitest';
import { ListCatalogosUseCaseImpl } from './list-catalogos.js';
import type { CatalogoRepository } from '../repositories/catalogo.repository.js';
import type { AuthContext } from '../auth/types.js';

function createMockRepo(result: { items: unknown[]; total: number }): CatalogoRepository {
  return {
    findByTenantAndSectorAccess: vi.fn().mockResolvedValue(result),
  } as unknown as CatalogoRepository;
}

function auth(overrides: Partial<AuthContext> = {}): AuthContext {
  return {
    clerkUserId: 'clerk_1',
    userId: 'user-uuid',
    tenantId: 'tenant-uuid',
    role: 'viewer',
    sectorAccess: 'all',
    ...overrides,
  };
}

describe('ListCatalogosUseCase', () => {
  it('returns empty list when sector_access is none (repo returns empty)', async () => {
    const repo = {
      findByTenantAndSectorAccess: vi.fn().mockImplementation((opts: { sectorAccess: string }) =>
        Promise.resolve(
          opts.sectorAccess === 'none'
            ? { items: [], total: 0 }
            : {
                items: [
                  {
                    id: '1',
                    name: 'x',
                    sector: 'vendas',
                    file_name: 'a',
                    file_path: '/p',
                    file_url: null,
                    searchable_text: null,
                    mime_type: 'application/pdf',
                    created_at: new Date(),
                  },
                ],
                total: 1,
              }
        )
      ),
    } as unknown as CatalogoRepository;
    const useCase = new ListCatalogosUseCaseImpl(repo);

    const result = await useCase.execute({
      auth: auth({ sectorAccess: 'none' }),
      query: { page: 1, limit: 20 },
    });

    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
    expect(repo.findByTenantAndSectorAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-uuid',
        sectorAccess: 'none',
        page: 1,
        limit: 20,
      })
    );
  });

  it('returns items when sector_access is all', async () => {
    const items = [
      {
        id: '1',
        name: 'Cat 1',
        sector: 'vendas',
        file_name: 'f.pdf',
        file_path: '/p/1',
        file_url: null,
        searchable_text: null,
        mime_type: 'application/pdf',
        created_at: new Date(),
      },
    ];
    const repo = createMockRepo({ items, total: 1 });
    const useCase = new ListCatalogosUseCaseImpl(repo);

    const result = await useCase.execute({
      auth: auth({ sectorAccess: 'all' }),
      query: { page: 1, limit: 20 },
    });

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.items[0].name).toBe('Cat 1');
    expect(result.items[0].sector).toBe('vendas');
  });

  it('passes sector_access to repository for specific sector', async () => {
    const repo = createMockRepo({ items: [], total: 0 });
    const useCase = new ListCatalogosUseCaseImpl(repo);

    await useCase.execute({
      auth: auth({ sectorAccess: 'financeiro' }),
      query: { sector: 'financeiro', page: 1, limit: 10 },
    });

    expect(repo.findByTenantAndSectorAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-uuid',
        sectorAccess: 'financeiro',
        querySector: 'financeiro',
        page: 1,
        limit: 10,
      })
    );
  });

  it('passes q as queryText to repository for full-text search', async () => {
    const repo = createMockRepo({ items: [], total: 0 });
    const useCase = new ListCatalogosUseCaseImpl(repo);

    await useCase.execute({
      auth: auth({ sectorAccess: 'all' }),
      query: { q: 'palavra chave', page: 1, limit: 20 },
    });

    expect(repo.findByTenantAndSectorAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-uuid',
        queryText: 'palavra chave',
        page: 1,
        limit: 20,
      })
    );
  });
});
