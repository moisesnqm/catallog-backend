/**
 * List tenant users use case — admin lists users belonging to the current tenant.
 */

import type { AuthContext } from '../auth/types.js';
import type { UserRepository } from '../repositories/user.repository.js';
import type { User } from '../entities/user.entity.js';

export interface ListTenantUsersResultItem {
  id: string;
  clerk_user_id: string;
  tenant_id: string;
  role: string;
  sector_access: string;
  created_at: string;
}

export interface ListTenantUsersInput {
  auth: AuthContext;
}

export interface ListTenantUsersUseCase {
  execute(input: ListTenantUsersInput): Promise<ListTenantUsersResultItem[]>;
}

export class ListTenantUsersUseCaseImpl implements ListTenantUsersUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(input: ListTenantUsersInput): Promise<ListTenantUsersResultItem[]> {
    const { auth } = input;
    const users = await this.userRepository.findByTenant(auth.tenantId);
    return users.map(toResultItem);
  }
}

function toResultItem(user: User): ListTenantUsersResultItem {
  return {
    id: user.id,
    clerk_user_id: user.clerk_user_id,
    tenant_id: user.tenant_id,
    role: user.role,
    sector_access: user.sector_access,
    created_at: user.created_at.toISOString(),
  };
}
