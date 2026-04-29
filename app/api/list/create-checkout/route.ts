export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { stripe } from '@/lib/stripe/client';

const PRICE_ENV: Record<string, string> = {
  listed: 'STRIPE_PRICE_LISTED',
  feature: 'STRIPE_PRICE_FEATURE',
  headline: 'STRIPE_PRICE_HEADLINE',
  partner: 'STRIPE_PRICE_PARTNER',
};

const bodySchema = z.object({
  name: z.string().max(120).nullable().optional(),
  sire: z.string().min(1).max(120),
  dam: z.string().min(1).max(120),
  dam_sire: z.string().max(120).nullable().optional(),
  sex: z.enum(['colt', 'filly', 'gelding', 'mare', 'stallion']),
  foal_date: z.string().nullable().optional(),
  colour: z.string().nullable().optional(),
  location_state: z.enum(['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'ACT', 'NT']),
  location_postcode: z.string().max(4).nullable().optional(),
  primary_trainer_name: z.string().max(120).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  bonus_schemes: z.array(z.string()).default([]),
  vet_xray_clear: z.boolean().default(false),
  vet_scope_clear: z.boolean().default(false),
  vet_checked_at: z.string().nullable().optional(),
  ongoing_cost_cents_per_pct_per_week: z.number().int().nullable().optional(),
  share_listings: z
    .array(z.object({ pct: z.number().positive().max(100), price_cents: z.number().int().positive(), available: z.boolean() }))
    .min(1),
  pds_url: z.string().url().max(2000),
  pds_dated: z.string().nullable().optional(),
  tier_code: z.enum(['listed', 'feature', 'headline', 'partner']),
  photo_paths: z.array(z.string()).max(5).optional(),
});

function makeSlug(sire: string, dam: string): string {
  const slugify = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${slugify(sire)}-x-${slugify(dam)}-${Date.now().toString(36)}`;
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const { data: syndicatorUser } = await supabase
    .from('syndicator_user')
    .select('syndicator_id')
    .eq('user_id', user.id)
    .single();

  if (!syndicatorUser) {
    return NextResponse.json({ error: 'No syndicator account' }, { status: 403 });
  }

  const syndicatorId = syndicatorUser.syndicator_id;

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request', details: err }, { status: 422 });
  }

  const priceId = process.env[PRICE_ENV[body.tier_code]];

  const availablePcts = body.share_listings
    .filter((r) => r.available)
    .reduce((sum, r) => sum + r.pct, 0);

  const db = createServiceClient();
  const slug = makeSlug(body.sire, body.dam);

  const horsePayload = {
    slug,
    syndicator_id: syndicatorId,
    status: 'draft' as const,
    name: body.name || null,
    sire: body.sire,
    dam: body.dam,
    dam_sire: body.dam_sire || null,
    sex: body.sex,
    foal_date: body.foal_date ? `${body.foal_date}-01` : null,
    colour: (body.colour && body.colour !== 'other') ? body.colour : null,
    location_state: body.location_state,
    location_postcode: body.location_postcode || null,
    description: body.description || null,
    bonus_schemes: body.bonus_schemes,
    vet_xray_clear: body.vet_xray_clear,
    vet_scope_clear: body.vet_scope_clear,
    vet_checked_at: body.vet_checked_at || null,
    ongoing_cost_cents_per_pct_per_week: body.ongoing_cost_cents_per_pct_per_week || null,
    pds_url: body.pds_url,
    pds_dated: body.pds_dated || null,
    total_shares_available: 100,
    total_shares_remaining: availablePcts,
    share_listings: body.share_listings,
    listing_tier_code: body.tier_code,
    submitted_at: new Date().toISOString(),
  };

  const { data: horse, error: horseErr } = await db
    .from('horse')
    .insert(horsePayload)
    .select('id')
    .single();

  if (horseErr || !horse) {
    console.error('Horse insert error:', horseErr);
    return NextResponse.json({ error: 'Failed to create listing' }, { status: 500 });
  }

  // Persist share tiers so horse_search_doc view computes prices correctly
  const shareTierRows = body.share_listings.map((s, idx) => ({
    horse_id: horse.id,
    share_pct: s.pct,
    price_cents: s.price_cents,
    available: s.available,
    display_order: idx,
  }));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: tierErr } = await (db as any).from('share_tier').insert(shareTierRows);
  if (tierErr) console.error('share_tier insert error:', tierErr);

  // Persist uploaded photos as horse_image rows (non-fatal if this fails)
  if (body.photo_paths && body.photo_paths.length > 0) {
    const horseName = body.name ?? `${body.sire} × ${body.dam}`;
    const imageRows = body.photo_paths.map((path, idx) => ({
      horse_id: horse.id,
      storage_path: path,
      alt_text: `${horseName} photo ${idx + 1}`,
      is_hero: idx === 0,
      display_order: idx,
    }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: imgErr } = await (db as any).from('horse_image').insert(imageRows);
    if (imgErr) console.error('horse_image insert error:', imgErr);
  }

  // Dev bypass: if no Stripe price IDs are configured, skip payment and
  // submit directly. Allows full listing → approval → live flow without Stripe.
  if (!priceId) {
    await db.from('horse').update({ status: 'pending_review' as const }).eq('id', horse.id);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
    return NextResponse.json({
      url: `${siteUrl}/list/submit/success?dev_bypass=1&horse_id=${horse.id}`,
    });
  }

  const launchCoupon = process.env.STRIPE_LAUNCH_COUPON;
  const isPartner = body.tier_code === 'partner';

  try {
    const session = await stripe.checkout.sessions.create({
      mode: isPartner ? 'subscription' : 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/list/submit/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/list/submit?cancelled=1`,
      client_reference_id: horse.id,
      metadata: {
        horse_id: horse.id,
        syndicator_id: syndicatorId,
        tier_code: body.tier_code,
      },
      ...(launchCoupon ? { discounts: [{ coupon: launchCoupon }] } : {}),
    });

    return NextResponse.json({ url: session.url });
  } catch (stripeErr) {
    await db.from('horse').delete().eq('id', horse.id);
    console.error('Stripe checkout error:', stripeErr);
    return NextResponse.json({ error: 'Payment setup failed' }, { status: 500 });
  }
}
