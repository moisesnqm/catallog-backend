/**
 * Unit tests for auth middleware and requireUploadRole.
 */

import { describe, it, expect, vi } from 'vitest';
import { requireUploadRole } from './middleware.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { AuthContext } from './types.js';

function mockRequest(auth?: AuthContext): FastifyRequest {
  return { auth } as FastifyRequest;
}

function mockReply(): FastifyReply {
  const send = vi.fn().mockResolvedValue(undefined);
  const status = vi.fn().mockReturnValue({ send });
  return { status, send } as unknown as FastifyReply;
}

describe('requireUploadRole', () => {
  it('returns false and sends 401 when auth is missing', () => {
    const request = mockRequest(undefined);
    const reply = mockReply();

    const result = requireUploadRole(request, reply);

    expect(result).toBe(false);
    expect(reply.status).toHaveBeenCalledWith(401);
  });

  it('returns false and sends 403 when role is viewer', () => {
    const request = mockRequest({
      clerkUserId: 'c',
      userId: 'u',
      tenantId: 't',
      role: 'viewer',
      sectorAccess: 'all',
    });
    const reply = mockReply();

    const result = requireUploadRole(request, reply);

    expect(result).toBe(false);
    expect(reply.status).toHaveBeenCalledWith(403);
  });

  it('returns true when role is admin', () => {
    const request = mockRequest({
      clerkUserId: 'c',
      userId: 'u',
      tenantId: 't',
      role: 'admin',
      sectorAccess: 'all',
    });
    const reply = mockReply();

    const result = requireUploadRole(request, reply);

    expect(result).toBe(true);
    expect(reply.status).not.toHaveBeenCalled();
  });

  it('returns true when role is manager', () => {
    const request = mockRequest({
      clerkUserId: 'c',
      userId: 'u',
      tenantId: 't',
      role: 'manager',
      sectorAccess: 'vendas',
    });
    const reply = mockReply();

    const result = requireUploadRole(request, reply);

    expect(result).toBe(true);
    expect(reply.status).not.toHaveBeenCalled();
  });
});
