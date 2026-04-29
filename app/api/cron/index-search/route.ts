export const runtime = 'nodejs';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { Client as TypesenseClient } from 'typesense';

function isAuthorised(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

function getTypesenseClient() {
  return new TypesenseClient({
    nodes: [{
      host: process.env.TYPESENSE_HOST ?? '159.13.51.164',
      port: Number(process.env.TYPESENSE_PORT ?? 8108),
      protocol: process.env.TYPESENSE_PROTOCOL ?? 'http',
    }],
    apiKey: process.env.TYPESENSE_API_KEY ?? '',
    connectionTimeoutSeconds: 10,
  });
}

interface OutboxEntry {
  id: string;
  collection: string;
  document_id: string;
  op: string;
}

interface SearchDocRow {
  id: string;
  slug: string;
  name: string | null;
  status: string;
  sire: string;
  dam: string;
  dam_sire: string | null;
  sex: string;
  colour: string | null;
  foal_date: string | null;
  foal_year: number | null;
  age_category: string | null;
  location_state: string;
  location_postcode: string | null;
  syndicator_id: string;
  syndicator_slug: string;
  syndicator_name: string;
  syndicator_tier: string | null;
  is_regal_owned: boolean;
  primary_trainer_id: string | null;
  primary_trainer_name: string | null;
  price_min_cents: number;
  price_max_cents: number;
  price_per_pct_cents: number | null;
  price_bucket: string | null;
  share_pcts_available: number[] | null;
  ongoing_cost_cents_per_pct_per_week: number | null;
  total_shares_remaining: number;
  has_final_shares: boolean;
  bonus_schemes: string[];
  vet_xray_clear: boolean | null;
  vet_scope_clear: boolean | null;
  created_at_unix: number;
  submitted_at_unix: number | null;
  view_count: number;
  enquiry_count: number;
  hero_image_path: string | null;
  description: string | null;
}

function docToTypesense(doc: SearchDocRow): Record<string, unknown> {
  return {
    id: doc.id,
    slug: doc.slug,
    name: doc.name ?? null,
    status: doc.status,
    sire: doc.sire,
    dam: doc.dam,
    dam_sire: doc.dam_sire ?? null,
    sex: doc.sex,
    colour: doc.colour ?? null,
    foal_date: doc.foal_date ?? null,
    foal_year: doc.foal_year ? Number(doc.foal_year) : null,
    age_category: doc.age_category ?? null,
    location_state: doc.location_state,
    location_postcode: doc.location_postcode ?? null,
    syndicator_id: doc.syndicator_id,
    syndicator_slug: doc.syndicator_slug,
    syndicator_name: doc.syndicator_name,
    syndicator_tier: doc.syndicator_tier ?? null,
    is_regal_owned: doc.is_regal_owned,
    primary_trainer_id: doc.primary_trainer_id ?? null,
    primary_trainer_name: doc.primary_trainer_name ?? null,
    price_min_cents: Number(doc.price_min_cents ?? 0),
    price_max_cents: Number(doc.price_max_cents ?? 0),
    price_per_pct_cents: doc.price_per_pct_cents ? Number(doc.price_per_pct_cents) : null,
    price_bucket: doc.price_bucket ?? null,
    share_pcts_available: (doc.share_pcts_available ?? []).map(Number),
    ongoing_cost_cents_per_pct_per_week: doc.ongoing_cost_cents_per_pct_per_week
      ? Number(doc.ongoing_cost_cents_per_pct_per_week)
      : null,
    total_shares_remaining: Number(doc.total_shares_remaining ?? 0),
    has_final_shares: doc.has_final_shares,
    bonus_schemes: doc.bonus_schemes ?? [],
    vet_xray_clear: doc.vet_xray_clear ?? null,
    vet_scope_clear: doc.vet_scope_clear ?? null,
    created_at_unix: Number(doc.created_at_unix ?? 0),
    submitted_at_unix: doc.submitted_at_unix ? Number(doc.submitted_at_unix) : null,
    view_count: Number(doc.view_count ?? 0),
    enquiry_count: Number(doc.enquiry_count ?? 0),
    hero_image_path: doc.hero_image_path ?? null,
    description: doc.description ?? null,
  };
}

export async function GET(req: NextRequest) {
  if (!isAuthorised(req)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const db = createServiceClient();
  const ts = getTypesenseClient();

  // Fetch up to 50 unprocessed entries
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: entries } = await (db as any)
    .from('search_outbox')
    .select('id, collection, document_id, op')
    .is('processed_at', null)
    .is('failed_at', null)
    .order('id', { ascending: true })
    .limit(50);

  if (!entries || entries.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  const outbox = entries as OutboxEntry[];
  const upsertIds = [...new Set(outbox.filter((e) => e.op === 'upsert').map((e) => e.document_id))];
  const deleteIds = [...new Set(outbox.filter((e) => e.op === 'delete').map((e) => e.document_id))];
  // If a document_id has both upsert and delete, upsert wins (it's the latest state)
  const finalDeleteIds = deleteIds.filter((id) => !upsertIds.includes(id));

  let processed = 0;
  let failed = 0;
  const now = new Date().toISOString();

  // Process upserts
  if (upsertIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: docs } = await (db as any)
      .from('horse_search_doc')
      .select('*')
      .in('id', upsertIds)
      .eq('status', 'active');

    for (const doc of (docs as SearchDocRow[]) ?? []) {
      try {
        await ts.collections('horses').documents().upsert(docToTypesense(doc));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (db as any)
          .from('search_outbox')
          .update({ processed_at: now })
          .eq('document_id', doc.id)
          .eq('op', 'upsert')
          .is('processed_at', null);
        processed++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (db as any)
          .from('search_outbox')
          .update({ failed_at: now, error_message: msg.slice(0, 500) })
          .eq('document_id', doc.id)
          .eq('op', 'upsert')
          .is('processed_at', null);
        failed++;
      }
    }
  }

  // Process deletes
  for (const docId of finalDeleteIds) {
    try {
      await ts.collections('horses').documents(docId).delete();
    } catch {
      // Document may not exist in Typesense — not an error
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any)
      .from('search_outbox')
      .update({ processed_at: now })
      .eq('document_id', docId)
      .eq('op', 'delete')
      .is('processed_at', null);
    processed++;
  }

  console.log(`[index-search] processed=${processed} failed=${failed}`);
  return NextResponse.json({ processed, failed });
}
