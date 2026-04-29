import { NextResponse } from 'next/server';
import { after } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { ensureUserProfile, resolveLandingPath } from '@/lib/auth/profile';
import { sendWelcomeEmail } from '@/lib/email/send-welcome';

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

  // Send welcome email to new buyers (fire-and-forget, non-blocking)
  if (profile.role === 'buyer' && user.email) {
    after(async () => {
      try {
        const db = createServiceClient();
        const { data: profileRow } = await db
          .from('user_profile')
          .select('welcome_sent_at, display_name')
          .eq('id', user.id)
          .single();

        if (profileRow && !profileRow.welcome_sent_at) {
          const result = await sendWelcomeEmail({
            to: user.email!,
            recipientName: profileRow.display_name,
          });
          if (result.ok) {
            await db
              .from('user_profile')
              .update({ welcome_sent_at: new Date().toISOString() })
              .eq('id', user.id);
          }
        }
      } catch (err) {
        console.error('[auth/callback] welcome email failed:', err);
      }
    });
  }

  return NextResponse.redirect(new URL(landingPath, url));
}
