/**
 * Supabase service-role client for API routes and server actions.
 * Bypasses RLS — never expose to the browser or import in client components.
 * Uses SUPABASE_SERVICE_ROLE_KEY (server-only env var).
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';

export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.',
    );
  }

  return createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
