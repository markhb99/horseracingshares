/**
 * scripts/backfill-share-tiers.ts
 * One-off: for every horse that has share_listings JSONB but no share_tier rows,
 * insert the missing share_tier rows and re-queue them for Typesense indexing.
 *
 * Usage: npx tsx scripts/backfill-share-tiers.ts
 */

import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

function loadDotEnv(path: string) {
  if (!existsSync(path)) return;
  const lines = readFileSync(path, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (key && !(key in process.env)) process.env[key] = val;
  }
}

loadDotEnv(resolve(process.cwd(), '.env.local'));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = createClient(supabaseUrl, serviceKey) as any;

async function main() {
  // Fetch all horses with share_listings that have no share_tier rows
  const { data: horses, error } = await db
    .from('horse')
    .select('id, sire, dam, share_listings')
    .is('deleted_at', null)
    .not('share_listings', 'is', null);

  if (error) {
    console.error('Fetch error:', error);
    process.exit(1);
  }

  console.log(`Found ${horses?.length ?? 0} horses with share_listings`);

  for (const horse of horses ?? []) {
    // Check if share_tier already exists
    const { data: existing } = await db
      .from('share_tier')
      .select('id')
      .eq('horse_id', horse.id)
      .limit(1);

    if (existing?.length > 0) {
      console.log(`  ${horse.sire} x ${horse.dam} — share_tier already populated, skipping`);
      continue;
    }

    const listings = horse.share_listings as Array<{ pct: number; price_cents: number; available: boolean }>;
    if (!listings?.length) continue;

    const rows = listings.map((s, idx) => ({
      horse_id: horse.id,
      share_pct: s.pct,
      price_cents: s.price_cents,
      available: s.available,
      display_order: idx,
    }));

    const { error: insertErr } = await db.from('share_tier').insert(rows);
    if (insertErr) {
      console.error(`  ${horse.sire} x ${horse.dam} — share_tier insert failed:`, insertErr.message);
      continue;
    }

    // Re-queue for Typesense indexing (trigger fires on share_tier insert, so this is belt-and-braces)
    const { error: outboxErr } = await db.from('search_outbox').insert({
      collection: 'horses',
      document_id: horse.id,
      op: 'upsert',
      reason: 'backfill:share_tier',
    });
    if (outboxErr) {
      console.error(`  ${horse.sire} x ${horse.dam} — search_outbox insert failed:`, outboxErr.message);
    }

    console.log(`  ${horse.sire} x ${horse.dam} — inserted ${rows.length} share_tier rows, queued for re-index`);
  }

  console.log('Done.');
}

main().catch(console.error);
