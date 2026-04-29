/**
 * PGlite test harness.
 *
 * Creates a fresh in-memory PGlite instance and runs the project's
 * Supabase migrations in name order. Each fresh call gets a clean DB
 * — no shared state between tests.
 *
 * Compatibility shims applied before migrations run:
 *   1. Extensions (pg_trgm, btree_gin, pgcrypto, citext) are not
 *      available in PGlite 0.x. Every CREATE EXTENSION statement is
 *      wrapped in a DO … EXCEPTION WHEN OTHERS THEN NULL block so the
 *      migration doesn't abort. Source SQL files are never modified.
 *   2. CITEXT is replaced by TEXT (case sensitivity is irrelevant in
 *      test isolation scenarios).
 *   3. GIN/TRGM indexes are dropped (they depend on pg_trgm).
 *   4. auth.users and auth.uid() are stubbed before migrations run so
 *      FK references and SECURITY DEFINER functions resolve correctly.
 */

import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const MIGRATIONS_DIR = join(
  import.meta.dirname ?? __dirname,
  '../../supabase/migrations',
);

/** Pre-process migration SQL for PGlite compatibility. Never writes files. */
function shimForPglite(sql: string): string {
  let out = sql;

  // 1. Wrap each CREATE EXTENSION statement in a safe DO block so missing
  //    extensions don't abort the migration.
  out = out.replace(
    /CREATE\s+EXTENSION\s+IF\s+NOT\s+EXISTS\s+[^;]+;/gi,
    (match) =>
      `DO $ext$ BEGIN ${match} EXCEPTION WHEN OTHERS THEN NULL; END; $ext$;`,
  );

  // 2. Replace CITEXT column type with TEXT (extension unavailable).
  //    Also replace CITEXT casts used in DEFAULT values.
  out = out.replace(/\bCITEXT\b/g, 'TEXT');

  // 3. Remove GIN/TRGM indexes (depend on pg_trgm extension).
  out = out.replace(
    /CREATE\s+(?:UNIQUE\s+)?INDEX\s+\w+\s+ON\s+\w+\s+USING\s+gin\s+\([^)]+gin_trgm_ops\)[^;]*;/gi,
    '-- [pglite-shim: gin_trgm index removed]',
  );

  // 4. Remove btree_gin composite indexes on horse table that use gin().
  out = out.replace(
    /CREATE\s+INDEX\s+\w+\s+ON\s+\w+\s+USING\s+gin\s*\([^)]+\)[^;]*;/gi,
    '-- [pglite-shim: btree_gin index removed]',
  );

  return out;
}

/** One-time auth schema stub — runs before any migration. */
async function stubAuthSchema(db: PGlite): Promise<void> {
  await db.exec(`
    CREATE SCHEMA IF NOT EXISTS auth;

    -- Minimal users table so FKs in user_profile don't fail.
    CREATE TABLE IF NOT EXISTS auth.users (
      id UUID PRIMARY KEY
    );

    -- auth.uid() stub — returns NULL (no session in test context).
    CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE AS $$ SELECT NULL::uuid $$;

    -- Supabase roles referenced by RLS policies — pglite doesn't create these.
    DO $$ BEGIN
      CREATE ROLE authenticated NOINHERIT;
    EXCEPTION WHEN duplicate_object THEN NULL; END; $$;
    DO $$ BEGIN
      CREATE ROLE anon NOINHERIT;
    EXCEPTION WHEN duplicate_object THEN NULL; END; $$;
    DO $$ BEGIN
      CREATE ROLE service_role NOINHERIT;
    EXCEPTION WHEN duplicate_object THEN NULL; END; $$;
  `);
}

export async function setupPgliteWithMigrations(): Promise<PGlite> {
  const db = new PGlite();

  // Stub auth schema before any migration references it.
  await stubAuthSchema(db);

  // Run migrations in lexicographic (timestamp) order.
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const raw = readFileSync(join(MIGRATIONS_DIR, file), 'utf-8');
    const shimmed = shimForPglite(raw);
    try {
      await db.exec(shimmed);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Migration ${file} failed: ${msg}`);
    }
  }

  return db;
}
