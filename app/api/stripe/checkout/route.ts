/**
 * POST /api/stripe/checkout
 *
 * Creates a Stripe Checkout Session for a listing-tier purchase.
 * Returns { url } — the caller redirects the browser to Stripe.
 *
 * Auth: must be logged in as a syndicator.
 * Body: { tier_code: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getStripe } from '@/lib/stripe/client';
import { createServerClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

// ─── Schema ───────────────────────────────────────────────────────────────────

const CheckoutBodySchema = z.object({
  tier_code: z.string().min(1).max(50),
});

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Auth check — must be logged in
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  // 2. Parse + validate body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = CheckoutBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { tier_code } = parsed.data;

  // Reject Partner tier — no checkout required
  if (tier_code === 'partner') {
    return NextResponse.json(
      { error: 'Partner tier does not require checkout' },
      { status: 400 },
    );
  }

  // 3. Look up tier via service client (bypasses RLS for lookup)
  const service = createServiceClient();

  const { data: tier, error: tierError } = await (service as any)
    .from('listing_tier')
    .select('id, code, name, price_cents_per_listing, stripe_price_id')
    .eq('code', tier_code)
    .eq('is_active', true)
    .single();

  if (tierError || !tier) {
    return NextResponse.json({ error: 'Listing tier not found' }, { status: 404 });
  }

  if (!tier.stripe_price_id) {
    return NextResponse.json(
      { error: 'This tier is not available for purchase. Run stripe-setup to configure pricing.' },
      { status: 422 },
    );
  }

  // 4. Look up syndicator for this user
  const { data: syndicatorUser, error: syndError } = await service
    .from('syndicator_user')
    .select('syndicator_id')
    .eq('user_id', user.id)
    .single();

  if (syndError || !syndicatorUser) {
    return NextResponse.json(
      { error: 'You must be a registered syndicator to purchase a listing' },
      { status: 422 },
    );
  }

  const syndicatorId = syndicatorUser.syndicator_id;

  // 5. Create Stripe Checkout Session
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const stripe = getStripe();

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price: tier.stripe_price_id as string,
          quantity: 1,
        },
      ],
      currency: 'aud',
      metadata: {
        tier_code,
        syndicator_id: syndicatorId,
        user_id: user.id,
      },
      success_url: `${siteUrl}/sell/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/sell/pricing`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Stripe error';
    console.error('[stripe/checkout] session.create failed:', message);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 502 });
  }

  if (!session.url) {
    return NextResponse.json({ error: 'Stripe did not return a checkout URL' }, { status: 502 });
  }

  return NextResponse.json({ url: session.url });
}
