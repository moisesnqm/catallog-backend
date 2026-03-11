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
  findByClerkUserIdAndTenant(clerkUserId: string, tenantId: string): Promise<User | null>;
  findByTenant(tenantId: string): Promise<User[]>;
  updateRoleAndSector(user: User, input: UpdateUserRoleInput): Promise<User>;
  createUser(data: CreateUserInput): Promise<User>;
  deleteByClerkUserId(clerkUserId: string): Promise<void>;
  deleteByTenantAndClerkUserId(tenantId: string, clerkUserId: string): Promise<boolean>;
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
   * Finds a user by Clerk user ID and tenant ID (for tenant-scoped operations).
   */
  async findByClerkUserIdAndTenant(clerkUserId: string, tenantId: string): Promise<User | null> {
    const user = await this.repo.findOne({
      where: { clerk_user_id: clerkUserId, tenant_id: tenantId },
      select: ['id', 'tenant_id', 'clerk_user_id', 'role', 'sector_access'],
    });
    return user ?? null;
  }

  /**
   * Lists all users belonging to the given tenant (for admin list).
   */
  async findByTenant(tenantId: string): Promise<User[]> {
    return this.repo.find({
      where: { tenant_id: tenantId },
      select: ['id', 'tenant_id', 'clerk_user_id', 'role', 'sector_access', 'created_at'],
      order: { created_at: 'ASC' },
    });
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

  /**
   * Deletes the link of a user to a specific tenant (admin unlink). Returns true if a row was deleted.
   */
  async deleteByTenantAndClerkUserId(tenantId: string, clerkUserId: string): Promise<boolean> {
    const result = await this.repo.delete({ tenant_id: tenantId, clerk_user_id: clerkUserId });
    return (result.affected ?? 0) > 0;
  }
}
