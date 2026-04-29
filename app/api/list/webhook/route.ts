export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe/client';
import { createServiceClient } from '@/lib/supabase/service';

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const sig = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const db = createServiceClient();

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const horseId = session.metadata?.horse_id;

    if (horseId) {
      const paymentRef =
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : typeof session.subscription === 'string'
            ? session.subscription
            : session.id;

      await db
        .from('horse')
        .update({ status: 'submitted', stripe_payment_id: paymentRef })
        .eq('id', horseId);
    }
  }

  if (event.type === 'checkout.session.expired') {
    const session = event.data.object as Stripe.Checkout.Session;
    const horseId = session.metadata?.horse_id;
    if (horseId) {
      await db.from('horse').update({ status: 'draft' }).eq('id', horseId);
    }
  }

  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as Stripe.Invoice;
    console.warn('Invoice payment failed:', invoice.id);
  }

  return NextResponse.json({ received: true });
}
