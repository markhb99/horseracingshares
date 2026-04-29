import { type NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { verifySavedSearchToken } from '@/lib/auth/saved-search-token';

/**
 * GET /api/saved-searches/unsubscribe?userId=...&token=...
 *
 * One-click unsubscribe from all saved-search alert emails for a user.
 * Linked from the footer of every saved-search digest email.
 * No session required — token does the auth.
 *
 * Sets frequency = 'off' on every saved_search for the user,
 * then redirects to /account?tab=saved-searches&unsubscribed=1.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const userId = searchParams.get('userId');
  const token = searchParams.get('token');

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://horseracingshares.com';
  const manageUrl = `${siteUrl}/account?tab=saved-searches`;

  if (!userId || !token) {
    return NextResponse.redirect(`${manageUrl}&unsubscribed=error`, { status: 302 });
  }

  if (!verifySavedSearchToken(token, 'all', userId)) {
    return NextResponse.redirect(`${manageUrl}&unsubscribed=error`, { status: 302 });
  }

  const supabase = createServiceClient();

  const { error } = await supabase
    .from('saved_search')
    .update({ frequency: 'off' })
    .eq('user_id', userId);

  if (error) {
    console.error('[saved-search unsubscribe] update error:', error.message);
    return NextResponse.redirect(`${manageUrl}&unsubscribed=error`, { status: 302 });
  }

  return NextResponse.redirect(`${manageUrl}&unsubscribed=1`, { status: 302 });
}
