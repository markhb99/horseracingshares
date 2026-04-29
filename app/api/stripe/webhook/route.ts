/**
 * POST /api/stripe/webhook
 *
 * Receives Stripe webhook events. Verifies signature, handles
 * checkout.session.completed by recording a payment row.
 *
 * Stripe retries on non-2xx responses — always return 200 after
 * signature verification, even if DB write fails (log + alert separately).
 *
 * Register this URL in Stripe Dashboard:
 *   https://yourdomain.com/api/stripe/webhook
 *
 * Required env:
 *   STRIPE_SECRET_KEY
 *   STRIPE_WEBHOOK_SECRET
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe/client';
import { createServiceClient } from '@/lib/supabase/service';

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[stripe/webhook] STRIPE_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  // 1. Read raw body and verify signature
  const rawBody = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing Stripe signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Signature verification failed';
    console.error('[stripe/webhook] signature verification failed:', message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // 2. Dispatch event types
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      default:
        // Unhandled event — acknowledge and ignore
        break;
    }
  } catch (err) {
    // DB write failed — log but still return 200 to prevent Stripe from retrying
    console.error(`[stripe/webhook] handler error for ${event.type}:`, err);
  }

  // 3. Always acknowledge
  return NextResponse.json({ received: true });
}

// ─── checkout.session.completed ───────────────────────────────────────────────

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const { tier_code, syndicator_id, user_id } = session.metadata ?? {};

  if (!tier_code || !syndicator_id) {
    console.error(
      '[stripe/webhook] checkout.session.completed missing metadata',
      { session_id: session.id, metadata: session.metadata },
    );
    return;
  }

  const service = createServiceClient();

  // Look up tier to get its price for the payment description
  const { data: tier } = await (service as any)
    .from('listing_tier')
    .select('name, price_cents_per_listing')
    .eq('code', tier_code)
    .single();

  const amountCents: number =
    typeof session.amount_total === 'number'
      ? session.amount_total
      : (tier?.price_cents_per_listing ?? 0);

  const description = tier
    ? `Listing fee — ${tier.name} tier (${tier_code})`
    : `Listing fee — ${tier_code}`;

  // Insert payment record
  const { error } = await (service as any)
    .from('payment')
    .insert({
      syndicator_id,
      stripe_payment_intent:
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.toString() ?? session.id,
      stripe_invoice_id: null,
      amount_cents: amountCents,
      currency: 'aud',
      status: 'paid',
      description,
      paid_at: new Date().toISOString(),
    });

  if (error) {
    console.error(
      '[stripe/webhook] failed to insert payment row:',
      error.message,
      { session_id: session.id, syndicator_id, tier_code },
    );
    // Re-throw so the outer catch logs it; we still return 200 above
    throw error;
  }

  console.log(
    `[stripe/webhook] payment recorded — session=${session.id} syndicator=${syndicator_id} tier=${tier_code} amount=${amountCents}`,
  );

  // Optionally: update horse.stripe_payment_id if horse_id is passed in metadata
  // Not done here — the listing form will reference the payment after redirect.
}
