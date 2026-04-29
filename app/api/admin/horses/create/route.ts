export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Client as TypesenseClient } from 'typesense';
import { createServerClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

function getTypesenseClient() {
  return new TypesenseClient({
    nodes: [{ host: process.env.TYPESENSE_HOST ?? '159.13.51.164', port: Number(process.env.TYPESENSE_PORT ?? 8108), protocol: process.env.TYPESENSE_PROTOCOL ?? 'http' }],
    apiKey: process.env.TYPESENSE_API_KEY ?? '',
    connectionTimeoutSeconds: 5,
  });
}

const bodySchema = z.object({
  syndicator_id: z.string().uuid(),
  name: z.string().max(120).nullable().optional(),
  sire: z.string().min(1).max(120),
  dam: z.string().min(1).max(120),
  dam_sire: z.string().max(120).nullable().optional(),
  sex: z.enum(['colt', 'filly', 'gelding', 'mare', 'stallion']),
  foal_date: z.string().nullable().optional(),
  colour: z.string().nullable().optional(),
  location_state: z.enum(['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'ACT', 'NT']),
  location_postcode: z.string().max(4).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  bonus_schemes: z.array(z.string()).default([]),
  vet_xray_clear: z.boolean().default(false),
  vet_scope_clear: z.boolean().default(false),
  vet_checked_at: z.string().nullable().optional(),
  ongoing_cost_cents_per_pct_per_week: z.number().int().nullable().optional(),
  share_listings: z
    .array(
      z.object({
        pct: z.number().positive().max(100),
        price_cents: z.number().int().positive(),
        available: z.boolean(),
      }),
    )
    .min(1),
  pds_url: z.string().url().max(2000),
  pds_dated: z.string().nullable().optional(),
  photo_paths: z.array(z.string()).max(10).optional(),
  pedigree_json: z.record(z.string(), z.unknown()).optional(),
});

function makeSlug(sire: string, dam: string): string {
  const slugify = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${slugify(sire)}-x-${slugify(dam)}-${Date.now().toString(36)}`;
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { data: profile } = await supabase
    .from('user_profile')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'operator') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request', details: err }, { status: 422 });
  }

  const db = createServiceClient();
  const slug = makeSlug(body.sire, body.dam);

  const availablePcts = body.share_listings
    .filter((r) => r.available)
    .reduce((sum, r) => sum + r.pct, 0);

  const horsePayload = {
    slug,
    syndicator_id: body.syndicator_id,
    status: 'active' as const,
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
    pedigree_json: body.pedigree_json ?? {},
    submitted_at: new Date().toISOString(),
    approved_at: new Date().toISOString(),
    approved_by: user.id,
  };

  const { data: horse, error: horseErr } = await db
    .from('horse')
    .insert(horsePayload)
    .select('id')
    .single();

  if (horseErr || !horse) {
    console.error('Admin horse insert error:', horseErr);
    const msg = horseErr?.message ?? 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // Share tiers
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

  // Photos
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

  // Immediately index in Typesense so the horse appears on browse without
  // waiting for the cron to process the search_outbox upsert entry.
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: doc } = await (db as any)
      .from('horse_search_doc')
      .select('*')
      .eq('id', horse.id)
      .single();
    if (doc) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tsDoc: Record<string, any> = {
        id: doc.id, slug: doc.slug, name: doc.name, status: doc.status,
        sire: doc.sire, dam: doc.dam, dam_sire: doc.dam_sire, sex: doc.sex,
        colour: doc.colour, foal_date: doc.foal_date,
        foal_year: doc.foal_year ? Number(doc.foal_year) : null,
        age_category: doc.age_category, location_state: doc.location_state,
        location_postcode: doc.location_postcode,
        syndicator_id: doc.syndicator_id, syndicator_slug: doc.syndicator_slug,
        syndicator_name: doc.syndicator_name, syndicator_tier: doc.syndicator_tier,
        is_regal_owned: Boolean(doc.is_regal_owned),
        primary_trainer_id: doc.primary_trainer_id, primary_trainer_name: doc.primary_trainer_name,
        price_min_cents: Number(doc.price_min_cents ?? 0),
        price_max_cents: Number(doc.price_max_cents ?? 0),
        price_per_pct_cents: doc.price_per_pct_cents ? Number(doc.price_per_pct_cents) : null,
        price_bucket: doc.price_bucket,
        share_pcts_available: (doc.share_pcts_available ?? []).map(Number),
        ongoing_cost_cents_per_pct_per_week: doc.ongoing_cost_cents_per_pct_per_week ? Number(doc.ongoing_cost_cents_per_pct_per_week) : null,
        total_shares_remaining: Number(doc.total_shares_remaining ?? 0),
        has_final_shares: Boolean(doc.has_final_shares),
        bonus_schemes: doc.bonus_schemes ?? [], vet_xray_clear: doc.vet_xray_clear,
        vet_scope_clear: doc.vet_scope_clear,
        created_at_unix: Number(doc.created_at_unix ?? 0),
        submitted_at_unix: doc.submitted_at_unix ? Number(doc.submitted_at_unix) : null,
        view_count: Number(doc.view_count ?? 0), enquiry_count: Number(doc.enquiry_count ?? 0),
        hero_image_path: doc.hero_image_path, description: doc.description,
      };
      // Remove null values — Typesense handles missing fields better than explicit nulls for optional fields
      Object.keys(tsDoc).forEach(k => { if (tsDoc[k] === null || tsDoc[k] === undefined) delete tsDoc[k]; });
      await getTypesenseClient().collections('horses').documents().upsert(tsDoc);
    }
  } catch (err) {
    // Non-fatal — outbox will retry
    console.warn('Typesense immediate index failed:', err instanceof Error ? err.message : err);
  }

  return NextResponse.json({ horse_id: horse.id, slug });
}
