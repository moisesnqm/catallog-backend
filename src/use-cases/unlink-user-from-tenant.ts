/**
 * Unlink user from tenant use case — admin removes a user from the current tenant.
 */

import type { AuthContext } from '../auth/types.js';
import type { UserRepository } from '../repositories/user.repository.js';

export const UNLINK_USER_NOT_FOUND = 'USER_NOT_FOUND';

export interface UnlinkUserFromTenantInput {
  auth: AuthContext;
  clerkUserId: string;
}

export interface UnlinkUserFromTenantUseCase {
  /**
   * Removes the user from the current tenant. Does not delete the user from Clerk.
   * @returns true if the user was unlinked; false if not found in this tenant.
   */
  execute(input: UnlinkUserFromTenantInput): Promise<boolean>;
}

export class UnlinkUserFromTenantUseCaseImpl implements UnlinkUserFromTenantUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(input: UnlinkUserFromTenantInput): Promise<boolean> {
    const { auth, clerkUserId } = input;
    const user = await this.userRepository.findByClerkUserIdAndTenant(
      clerkUserId,
      auth.tenantId
    );
    if (!user) {
      return false;
    }
    return this.userRepository.deleteByTenantAndClerkUserId(auth.tenantId, clerkUserId);
  }
}
