/**
 * User repository — lookup by clerk_user_id, update role/sector_access.
 */

import type { DataSource, Repository } from 'typeorm';
import { User } from '../entities/user.entity.js';

export interface UpdateUserRoleInput {
  role?: string;
  sector_access?: string;
}

export interface CreateUserInput {
  tenant_id: string;
  clerk_user_id: string;
  role?: string;
  sector_access?: string;
}

export interface UserRepository {
  findByClerkUserId(clerkUserId: string): Promise<User | null>;
  updateRoleAndSector(user: User, input: UpdateUserRoleInput): Promise<User>;
  createUser(data: CreateUserInput): Promise<User>;
  deleteByClerkUserId(clerkUserId: string): Promise<void>;
}

export class UserRepositoryImpl implements UserRepository {
  private readonly repo: Repository<User>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(User);
  }

  /**
   * Finds a user by Clerk user ID.
   * Clerk user IDs are unique per Clerk application; if multi-tenant, one user may exist per tenant.
   */
  async findByClerkUserId(clerkUserId: string): Promise<User | null> {
    const user = await this.repo.findOne({
      where: { clerk_user_id: clerkUserId },
      select: ['id', 'tenant_id', 'clerk_user_id', 'role', 'sector_access'],
    });
    return user ?? null;
  }

  /**
   * Updates role and/or sector_access for a user by id.
   */
  async updateRoleAndSector(user: User, input: UpdateUserRoleInput): Promise<User> {
    const updates: Partial<Pick<User, 'role' | 'sector_access'>> = {};
    if (input.role != null) updates.role = input.role;
    if (input.sector_access != null) updates.sector_access = input.sector_access;
    if (Object.keys(updates).length === 0) return user;
    await this.repo.update({ id: user.id }, updates);
    const updated = await this.repo.findOne({ where: { id: user.id } });
    return updated ?? user;
  }

  /**
   * Creates a user (e.g. from Clerk webhook user.created).
   */
  async createUser(data: CreateUserInput): Promise<User> {
    const user = new User();
    user.tenant_id = data.tenant_id;
    user.clerk_user_id = data.clerk_user_id;
    user.role = data.role ?? 'viewer';
    user.sector_access = data.sector_access ?? 'all';
    return this.repo.save(user);
  }

  /**
   * Deletes a user by Clerk user ID (e.g. from Clerk webhook user.deleted).
   */
  async deleteByClerkUserId(clerkUserId: string): Promise<void> {
    await this.repo.delete({ clerk_user_id: clerkUserId });
  }
}
