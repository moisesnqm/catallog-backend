/**
 * Clerk Backend API helper — get user by email (for admin link-by-email).
 * Requires CLERK_SECRET_KEY to be set.
 */

import { createClerkClient } from '@clerk/backend';

export interface ClerkUserById {
  id: string;
}

/**
 * Looks up a Clerk user by email using the Backend API.
 * @param email - Email address to search for
 * @param secretKey - Clerk Secret Key (sk_test_... or sk_live_...); if missing, returns null
 * @returns The first user's id (clerk_user_id) or null if not found or secret not configured
 */
export async function getClerkUserByEmail(
  email: string,
  secretKey: string | undefined
): Promise<ClerkUserById | null> {
  if (!secretKey?.trim()) {
    return null;
  }
  const client = createClerkClient({ secretKey: secretKey.trim() });
  const response = await client.users.getUserList({
    emailAddress: [email],
    limit: 1,
  });
  const data = response.data;
  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }
  const first = data[0];
  const id = first && typeof first === 'object' && 'id' in first ? String((first as { id: string }).id) : null;
  return id ? { id } : null;
}
