/**
 * Link user to tenant use case — admin links a Clerk user (by email) to the current tenant.
 */

import type { AuthContext } from '../auth/types.js';
import type { UserRepository } from '../repositories/user.repository.js';
import type { User } from '../entities/user.entity.js';

export const LINK_USER_NOT_FOUND = 'USER_NOT_FOUND';
export const LINK_USER_ALREADY_LINKED = 'ALREADY_LINKED';

export interface LinkUserToTenantInput {
  auth: AuthContext;
  email: string;
  role?: string;
  sector_access?: string;
}

export interface LinkUserToTenantResult {
  id: string;
  clerk_user_id: string;
  tenant_id: string;
  email: string | null;
  role: string;
  sector_access: string;
}

export type GetClerkUserByEmail = (email: string) => Promise<{ id: string } | null>;

export interface LinkUserToTenantUseCase {
  execute(input: LinkUserToTenantInput): Promise<LinkUserToTenantResult>;
}

export class LinkUserToTenantUseCaseImpl implements LinkUserToTenantUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly getClerkUserByEmail: GetClerkUserByEmail
  ) {}

  async execute(input: LinkUserToTenantInput): Promise<LinkUserToTenantResult> {
    const { auth, email, role, sector_access } = input;
    const clerkUser = await this.getClerkUserByEmail(email);
    if (!clerkUser) {
      const err = new Error('No user found with this email');
      (err as Error & { code: string }).code = LINK_USER_NOT_FOUND;
      throw err;
    }
    const existing = await this.userRepository.findByClerkUserIdAndTenant(
      clerkUser.id,
      auth.tenantId
    );
    if (existing) {
      const err = new Error('User already linked to this tenant');
      (err as Error & { code: string }).code = LINK_USER_ALREADY_LINKED;
      throw err;
    }
    const user = await this.userRepository.createUser({
      tenant_id: auth.tenantId,
      clerk_user_id: clerkUser.id,
      email,
      role: role ?? 'viewer',
      sector_access: sector_access ?? 'all',
    });
    return toResult(user);
  }
}

function toResult(user: User): LinkUserToTenantResult {
  return {
    id: user.id,
    clerk_user_id: user.clerk_user_id,
    tenant_id: user.tenant_id,
    email: user.email ?? null,
    role: user.role,
    sector_access: user.sector_access,
  };
}
