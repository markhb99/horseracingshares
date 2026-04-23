/**
 * Role-gate helper for server components.
 * Usage:
 *   const profile = await requireRole(['operator'], '/admin');
 *
 * - No session           → redirect to /login?next={nextPath}
 * - Role not in allowed  → redirect to /403
 * - OK                   → returns { id, role, email }
 *
 * Uses createServerClient (SSR client, reads session cookie).
 * Never uses the service client — gate decisions must use the
 * user's own session so RLS still fires on subsequent queries.
 */

import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';

export type UserRole = 'buyer' | 'syndicator' | 'operator';

export interface AuthorisedProfile {
  id: string;
  role: UserRole;
  email: string;
}

export async function requireRole(
  allowed: UserRole[],
  nextPath: string,
): Promise<AuthorisedProfile> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  const { data, error } = await supabase
    .from('user_profile')
    .select('id, role')
    .eq('id', user.id)
    .single();

  if (error || !data) {
    redirect('/403');
  }

  if (!(allowed as string[]).includes(data.role)) {
    redirect('/403');
  }

  return {
    id: data.id as string,
    role: data.role as UserRole,
    email: user.email ?? '',
  };
}
