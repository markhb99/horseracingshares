import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { ensureUserProfile, resolveLandingPath } from '@/lib/auth/profile';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/account';

  if (!code) {
    return NextResponse.redirect(
      new URL('/login?error=missing_code', url),
    );
  }

  const supabase = await createServerClient();

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(exchangeError.message)}`,
        url,
      ),
    );
  }

  // Retrieve the authenticated user after session exchange
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.redirect(
      new URL('/login?error=session_unavailable', url),
    );
  }

  // Upsert the user_profile row (creates it with role='buyer' if missing)
  let profile;
  try {
    profile = await ensureUserProfile(user.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'profile_error';
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(message)}`, url),
    );
  }

  // Role-based landing path
  const landingPath = resolveLandingPath(profile, next);

  return NextResponse.redirect(new URL(landingPath, url));
}
