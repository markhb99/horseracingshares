export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

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
  description: z.string().max(2000).nullable().optional(),
  bonus_schemes: z.array(z.string()).default([]),
  vet_xray_clear: z.boolean().default(false),
  vet_scope_clear: z.boolean().default(false),
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
  pedigree_json: z.record(z.string(), z.unknown()).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

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

  const { data: horse } = await db
    .from('horse')
    .select('id')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (!horse) return NextResponse.json({ error: 'Horse not found' }, { status: 404 });

  const availablePcts = body.share_listings
    .filter((r) => r.available)
    .reduce((sum, r) => sum + r.pct, 0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateErr } = await (db as any)
    .from('horse')
    .update({
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
      ongoing_cost_cents_per_pct_per_week: body.ongoing_cost_cents_per_pct_per_week || null,
      share_listings: body.share_listings,
      total_shares_remaining: availablePcts,
      pds_url: body.pds_url,
      pds_dated: body.pds_dated || null,
      pedigree_json: body.pedigree_json ?? {},
    })
    .eq('id', id);

  if (updateErr) {
    console.error('Horse update error:', updateErr);
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // Rebuild share_tier rows
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any).from('share_tier').delete().eq('horse_id', id);
  const shareTierRows = body.share_listings.map((s, idx) => ({
    horse_id: id,
    share_pct: s.pct,
    price_cents: s.price_cents,
    available: s.available,
    display_order: idx,
  }));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: tierErr } = await (db as any).from('share_tier').insert(shareTierRows);
  if (tierErr) console.error('share_tier update error:', tierErr);

  return NextResponse.json({ ok: true });
}
