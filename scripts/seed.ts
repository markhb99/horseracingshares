/**
 * scripts/seed.ts
 * Run the dev seed SQL against the Supabase Postgres database.
 *
 * Prerequisites:
 *   Add SUPABASE_DB_PASSWORD to .env.local temporarily before running.
 *   Remove (or rotate the DB password) after seeding.
 *
 *   The DB connection string is constructed as:
 *     postgres://postgres.{PROJECT_REF}:{SUPABASE_DB_PASSWORD}@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres
 *
 *   Alternatively, set SUPABASE_DB_URL directly in .env.local to override.
 *
 * Usage:
 *   npx tsx scripts/seed.ts
 *
 * Safety:
 *   This script reads supabase/seed.sql and executes it via a direct Postgres
 *   connection (using the `postgres` package). It does NOT use the service-role
 *   client — the seed needs raw SQL execution which @supabase/supabase-js
 *   does not expose.
 *
 *   DO NOT run against production. Architect must review seed.sql first.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import postgres from 'postgres';

// ── Load .env.local ──────────────────────────────────────────────────────────
// tsx doesn't auto-load .env.local; we do it manually with a minimal parser.
import { existsSync } from 'fs';

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
    if (key && !(key in process.env)) {
      process.env[key] = val;
    }
  }
}

loadDotEnv(resolve(process.cwd(), '.env.local'));
loadDotEnv(resolve(process.cwd(), '.env'));

// ── Resolve connection string ────────────────────────────────────────────────
function buildConnectionUrl(): string {
  // Direct override takes precedence.
  if (process.env.SUPABASE_DB_URL) {
    return process.env.SUPABASE_DB_URL;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const password    = process.env.SUPABASE_DB_PASSWORD;

  if (!supabaseUrl || !password) {
    throw new Error(
      'Set SUPABASE_DB_URL or both NEXT_PUBLIC_SUPABASE_URL + SUPABASE_DB_PASSWORD in .env.local',
    );
  }

  // Extract project ref from the URL: https://{ref}.supabase.co
  const match = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/);
  if (!match) {
    throw new Error(
      `Cannot parse project ref from NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl}`,
    );
  }
  const projectRef = match[1];

  // Supabase Postgres pooler (transaction mode, port 6543).
  // Direct non-pooled is port 5432 at db.{ref}.supabase.co — use that if
  // the seed contains DDL (no DDL here, so pooler is fine).
  return `postgres://postgres.${projectRef}:${encodeURIComponent(password)}@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres`;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const sqlPath = resolve(process.cwd(), 'supabase', 'seed.sql');
  const sql     = readFileSync(sqlPath, 'utf-8');

  console.log(`Reading seed SQL from: ${sqlPath}`);

  const connectionUrl = buildConnectionUrl();
  // Redact password for log output.
  const redacted = connectionUrl.replace(/:([^:@]+)@/, ':***@');
  console.log(`Connecting to: ${redacted}`);

  const db = postgres(connectionUrl, {
    ssl: 'require',
    max: 1,
    idle_timeout: 30,
    connect_timeout: 15,
    onnotice: (notice) => {
      console.log('[NOTICE]', notice.message);
    },
  });

  try {
    console.log('Executing seed SQL…');
    // Execute the entire file as a single statement block.
    // postgres.js handles multi-statement SQL when passed as a raw unsafe query.
    await db.unsafe(sql);

    console.log('');
    console.log('Seed complete. Verifying row counts…');

    const [{ syndicators }] = await db`SELECT COUNT(*)::int AS syndicators FROM syndicator WHERE deleted_at IS NULL`;
    const [{ horses }]      = await db`SELECT COUNT(*)::int AS horses      FROM horse      WHERE deleted_at IS NULL`;
    const [{ tiers }]       = await db`SELECT COUNT(*)::int AS tiers       FROM share_tier`;
    const [{ images }]      = await db`SELECT COUNT(*)::int AS images      FROM horse_image`;
    const [{ trainers_lnk }]= await db`SELECT COUNT(*)::int AS trainers_lnk FROM horse_trainer`;

    console.log(`  syndicators:   ${syndicators}  (expect ≥5)`);
    console.log(`  horses:        ${horses}        (expect ≥30)`);
    console.log(`  share_tiers:   ${tiers}          (expect ≥75)`);
    console.log(`  horse_images:  ${images}         (expect ≥30)`);
    console.log(`  horse_trainers:${trainers_lnk}   (expect ≥30)`);
    console.log('');
    console.log('Done.');
  } finally {
    await db.end();
  }
}

main().catch((err) => {
  console.error('Seed failed:', err.message ?? err);
  process.exit(1);
});
