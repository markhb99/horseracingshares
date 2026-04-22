/**
 * Session-refresh helper for Next.js middleware.
 * Refreshes the Supabase auth cookie on every request so sessions
 * do not expire between navigations.
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/lib/supabase/types';

export async function refreshSession(request: NextRequest): Promise<NextResponse> {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          // Write cookies on the request so downstream server components see them
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          // Re-create the response with the updated request
          supabaseResponse = NextResponse.next({ request });

          // Write cookies on the response so the browser persists them
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });

          // Propagate cache-control headers required by Supabase SSR
          if (headers) {
            Object.entries(headers).forEach(([key, value]) => {
              supabaseResponse.headers.set(key, value);
            });
          }
        },
      },
    },
  );

  // IMPORTANT: calling getUser() is what triggers a token refresh when needed.
  // Do not remove this call.
  await supabase.auth.getUser();

  return supabaseResponse;
}
