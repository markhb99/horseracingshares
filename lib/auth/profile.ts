/**
 * User-profile helpers for the auth callback and protected routes.
 * These run server-side only.
 */

import { createServiceClient } from '@/lib/supabase/service';

export type UserRole = 'buyer' | 'syndicator' | 'operator';

export interface UserProfile {
  id: string;
  role: UserRole;
}

// Paths each role is allowed to land on (prefix-matched).
const roleAllow: Record<string, UserRole[]> = {
  '/account':    ['buyer', 'syndicator', 'operator'],
  '/syndicator': ['syndicator', 'operator'],
  '/admin':      ['operator'],
};

const roleDefaults: Record<UserRole, string> = {
  buyer:      '/account',
  syndicator: '/syndicator/dashboard',
  operator:   '/admin',
};

/**
 * UPSERT a user_profile row for the authenticated user.
 * Sets role='buyer' by default if the row is newly created.
 * Returns the profile row.
 */
export async function ensureUserProfile(
  userId: string,
): Promise<UserProfile> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('user_profile')
    .upsert(
      { id: userId, role: 'buyer' },
      { onConflict: 'id', ignoreDuplicates: true },
    )
    .select('id, role')
    .single();

  if (error) {
    // Row already exists — retrieve it
    const { data: existing, error: fetchError } = await supabase
      .from('user_profile')
      .select('id, role')
      .eq('id', userId)
      .single();

    if (fetchError || !existing) {
      throw new Error(
        `Could not upsert user_profile for ${userId}: ${fetchError?.message ?? 'unknown'}`,
      );
    }

    return existing as UserProfile;
  }

  return data as UserProfile;
}

/**
 * Resolve the post-login landing path for a user.
 *
 * Rules (per docs/auth.md §4):
 * 1. If `next` is set and the user's role is permitted for that path prefix → return `next`.
 * 2. Otherwise return the role-default landing path.
 */
export function resolveLandingPath(
  profile: UserProfile,
  next?: string | null,
): string {
  if (next) {
    for (const [prefix, allowedRoles] of Object.entries(roleAllow)) {
      if (next.startsWith(prefix) && (allowedRoles as string[]).includes(profile.role)) {
        return next;
      }
    }
  }

  return roleDefaults[profile.role] ?? '/account';
}
