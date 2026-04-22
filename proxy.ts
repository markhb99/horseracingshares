/**
 * Next.js 16 Proxy (replaces middleware).
 * Refreshes the Supabase session cookie on every matched request.
 * Role-based redirects are handled in /auth/callback, not here.
 */

import type { NextRequest } from 'next/server';
import { refreshSession } from '@/lib/supabase/middleware';

export async function proxy(request: NextRequest) {
  return refreshSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimisation)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - Public folder assets (images, fonts, etc.)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|otf)).*)',
  ],
};
