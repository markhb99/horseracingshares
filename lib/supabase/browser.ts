/**
 * Supabase client for client components.
 * Uses the public anon key — all access is governed by RLS.
 */

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/lib/supabase/types';

export function createBrowserSupabaseClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
