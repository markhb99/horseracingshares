/**
 * AFSL gate integration tests — PGlite.
 *
 * Tests the three-layer gate described in docs/db/schema.md §4:
 *   - enforce_horse_active_gate() trigger (BEFORE INSERT/UPDATE on horse)
 *   - syndicator_afsl_cascade() trigger (AFTER UPDATE OF afsl_status on syndicator)
 *   - syndicator_afsl_reverify_on_change() trigger (BEFORE UPDATE OF afsl_number/afsl_verified_at)
 *
 * Each test gets a fresh PGlite DB via setupPgliteWithMigrations() — no
 * shared state, no live Supabase connection.
 *
 * Re-verify trigger test: overrides auth.uid() in the PGlite session so
 * the SECURITY DEFINER trigger sees a non-null, non-operator user ID.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { setupPgliteWithMigrations } from './helpers/pglite';

// ─── per-test helpers ─────────────────────────────────────────────────────────

type SyndRow = { id: string };
type HorseRow = { id: string };

/** Insert a fully-verified syndicator. */
async function insertVerifiedSyndicator(
  db: PGlite,
  slug = 'test-synd',
): Promise<SyndRow> {
  const r = await db.query<SyndRow>(`
    INSERT INTO syndicator
      (slug, name, afsl_number, afsl_status, afsl_verified_at, contact_name, contact_email, contact_phone)
    VALUES
      ($1, 'Test Syndicator', '123456789', 'verified', now(), 'Alice', 'alice@test.com', '0400000000')
    RETURNING id
  `, [slug]);
  return r.rows[0];
}

/** Insert a syndicator with a specific AFSL status (and no afsl_verified_at). */
async function insertSyndicatorWithStatus(
  db: PGlite,
  slug: string,
  afslStatus: string,
  afslNumber: string | null = null,
): Promise<SyndRow> {
  const r = await db.query<SyndRow>(`
    INSERT INTO syndicator
      (slug, name, afsl_number, afsl_status, contact_name, contact_email, contact_phone)
    VALUES
      ($1, 'Test Syndicator', $2, $3, 'Bob', 'bob@test.com', '0400000001')
    RETURNING id
  `, [slug, afslNumber, afslStatus]);
  return r.rows[0];
}

/** Insert a draft horse (no pds_url, default status='draft'). */
async function insertDraftHorse(
  db: PGlite,
  syndId: string,
  slug = 'draft-horse',
): Promise<HorseRow> {
  const r = await db.query<HorseRow>(`
    INSERT INTO horse
      (slug, syndicator_id, sire, dam, sex, location_state, total_shares_remaining)
    VALUES
      ($1, $2, 'Sire X', 'Dam Y', 'colt', 'VIC', 100)
    RETURNING id
  `, [slug, syndId]);
  return r.rows[0];
}

/** Insert an active horse with pds_url. */
async function insertActiveHorse(
  db: PGlite,
  syndId: string,
  slug = 'active-horse',
  pdsUrl = 'https://example.com/pds.pdf',
): Promise<HorseRow> {
  const r = await db.query<HorseRow>(`
    INSERT INTO horse
      (slug, syndicator_id, sire, dam, sex, location_state, total_shares_remaining, status, pds_url)
    VALUES
      ($1, $2, 'Sire X', 'Dam Y', 'colt', 'VIC', 100, 'active', $3)
    RETURNING id
  `, [slug, syndId, pdsUrl]);
  return r.rows[0];
}

// ─── test suite ──────────────────────────────────────────────────────────────

describe('AFSL gate — DB trigger enforcement', () => {
  let db: PGlite;

  beforeEach(async () => {
    db = await setupPgliteWithMigrations();
  });

  // ── Positive (no-op) ────────────────────────────────────────────────────

  describe('positive cases (should succeed)', () => {
    it('inserts a draft horse with no pds_url for a verified syndicator', async () => {
      const synd = await insertVerifiedSyndicator(db);
      const horse = await insertDraftHorse(db, synd.id);
      expect(horse.id).toBeTruthy();
    });

    it('updates a draft horse to active with a pds_url for a verified syndicator', async () => {
      const synd = await insertVerifiedSyndicator(db);
      const horse = await insertDraftHorse(db, synd.id);

      const r = await db.query<{ status: string; pds_url: string }>(`
        UPDATE horse
           SET status = 'active',
               pds_url = 'https://example.com/pds.pdf'
         WHERE id = $1
         RETURNING status, pds_url
      `, [horse.id]);
      expect(r.rows[0].status).toBe('active');
      expect(r.rows[0].pds_url).toBe('https://example.com/pds.pdf');
    });

    it('inserts an active horse with pds_url directly for a verified syndicator', async () => {
      const synd = await insertVerifiedSyndicator(db);
      const horse = await insertActiveHorse(db, synd.id);
      expect(horse.id).toBeTruthy();
    });
  });

  // ── Negative (trigger must raise) ───────────────────────────────────────

  describe('negative cases (trigger must raise check_violation)', () => {
    it('rejects an active horse with NULL pds_url — mentions pds_url', async () => {
      const synd = await insertVerifiedSyndicator(db);

      await expect(
        db.query(`
          INSERT INTO horse
            (slug, syndicator_id, sire, dam, sex, location_state, total_shares_remaining, status)
          VALUES
            ('no-pds', $1, 'Sire X', 'Dam Y', 'colt', 'VIC', 100, 'active')
        `, [synd.id]),
      ).rejects.toThrow(/pds_url/i);
    });

    it("rejects an active horse when syndicator afsl_status='pending' — mentions AFSL verification", async () => {
      const synd = await insertSyndicatorWithStatus(db, 'pending-synd', 'pending', '987654321');

      await expect(
        db.query(`
          INSERT INTO horse
            (slug, syndicator_id, sire, dam, sex, location_state, total_shares_remaining, status, pds_url)
          VALUES
            ('pending-horse', $1, 'Sire X', 'Dam Y', 'colt', 'VIC', 100, 'active', 'https://example.com/pds.pdf')
        `, [synd.id]),
      ).rejects.toThrow(/AFSL-verified/i);
    });

    it('rejects an active horse when syndicator afsl_number is NULL', async () => {
      // Syndicator with status='unverified' and NULL afsl_number
      const synd = await insertSyndicatorWithStatus(db, 'null-afsl-synd', 'unverified', null);

      await expect(
        db.query(`
          INSERT INTO horse
            (slug, syndicator_id, sire, dam, sex, location_state, total_shares_remaining, status, pds_url)
          VALUES
            ('null-afsl-horse', $1, 'Sire X', 'Dam Y', 'colt', 'VIC', 100, 'active', 'https://example.com/pds.pdf')
        `, [synd.id]),
      ).rejects.toThrow(/AFSL-verified/i);
    });
  });

  // ── Cascade trigger ──────────────────────────────────────────────────────

  describe('cascade trigger — syndicator leaves verified', () => {
    it("demotes active horses to 'pending_review' when syndicator afsl_status changes from verified to suspended", async () => {
      const synd = await insertVerifiedSyndicator(db, 'cascade-synd');
      const horse = await insertActiveHorse(db, synd.id, 'cascade-horse');

      // Confirm horse is active
      const before = await db.query<{ status: string }>(
        'SELECT status FROM horse WHERE id = $1',
        [horse.id],
      );
      expect(before.rows[0].status).toBe('active');

      // Suspend the syndicator
      await db.exec(
        `UPDATE syndicator SET afsl_status = 'suspended' WHERE id = '${synd.id}'`,
      );

      // Horse must be demoted
      const after = await db.query<{ status: string }>(
        'SELECT status FROM horse WHERE id = $1',
        [horse.id],
      );
      expect(after.rows[0].status).toBe('pending_review');
    });

    it("demotes active horses when syndicator afsl_status changes to 'expired'", async () => {
      const synd = await insertVerifiedSyndicator(db, 'expire-synd');
      const horse = await insertActiveHorse(db, synd.id, 'expire-horse');

      await db.exec(
        `UPDATE syndicator SET afsl_status = 'expired' WHERE id = '${synd.id}'`,
      );

      const after = await db.query<{ status: string }>(
        'SELECT status FROM horse WHERE id = $1',
        [horse.id],
      );
      expect(after.rows[0].status).toBe('pending_review');
    });

    it('does not demote horses when syndicator afsl_status stays verified (e.g. other field update)', async () => {
      const synd = await insertVerifiedSyndicator(db, 'stable-synd');
      const horse = await insertActiveHorse(db, synd.id, 'stable-horse');

      // Update an unrelated field on syndicator — should not demote horse
      await db.exec(
        `UPDATE syndicator SET about = 'Updated bio' WHERE id = '${synd.id}'`,
      );

      const after = await db.query<{ status: string }>(
        'SELECT status FROM horse WHERE id = $1',
        [horse.id],
      );
      expect(after.rows[0].status).toBe('active');
    });
  });

  // ── Re-verify trigger ────────────────────────────────────────────────────

  describe('re-verify trigger — admin edits afsl_number resets verification', () => {
    it("resets afsl_status to 'pending' and clears afsl_verified_at when a non-operator user changes afsl_number", async () => {
      // Create a non-operator user in auth.users + user_profile.
      const buyerUid = 'aaaabbbb-cccc-dddd-eeee-ffffffffffff';
      await db.exec(`INSERT INTO auth.users (id) VALUES ('${buyerUid}')`);
      await db.exec(
        `INSERT INTO user_profile (id, role) VALUES ('${buyerUid}', 'syndicator')`,
      );

      // Override auth.uid() to return this non-operator user.
      await db.exec(`
        CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
        LANGUAGE sql STABLE AS $$ SELECT '${buyerUid}'::uuid $$;
      `);

      const synd = await insertVerifiedSyndicator(db, 'reverify-synd');

      // Confirm syndicator is verified before the edit.
      const before = await db.query<{ afsl_status: string; afsl_verified_at: string | null }>(
        'SELECT afsl_status, afsl_verified_at FROM syndicator WHERE id = $1',
        [synd.id],
      );
      expect(before.rows[0].afsl_status).toBe('verified');
      expect(before.rows[0].afsl_verified_at).not.toBeNull();

      // Non-operator changes afsl_number → trigger should reset to 'pending'.
      await db.exec(
        `UPDATE syndicator SET afsl_number = '999999999' WHERE id = '${synd.id}'`,
      );

      const after = await db.query<{ afsl_status: string; afsl_verified_at: string | null; afsl_verified_by: string | null }>(
        'SELECT afsl_status, afsl_verified_at, afsl_verified_by FROM syndicator WHERE id = $1',
        [synd.id],
      );
      expect(after.rows[0].afsl_status).toBe('pending');
      expect(after.rows[0].afsl_verified_at).toBeNull();
      expect(after.rows[0].afsl_verified_by).toBeNull();
    });

    it("does NOT reset afsl_status when auth.uid() is NULL (service-role context)", async () => {
      // auth.uid() returns NULL by default in the test harness.
      // The trigger condition is: auth.uid() IS NOT NULL AND role != 'operator'
      // When uid is NULL, the condition is false → no reset.

      const synd = await insertVerifiedSyndicator(db, 'no-reset-synd');

      await db.exec(
        `UPDATE syndicator SET afsl_number = '777777777' WHERE id = '${synd.id}'`,
      );

      const after = await db.query<{ afsl_status: string }>(
        'SELECT afsl_status FROM syndicator WHERE id = $1',
        [synd.id],
      );
      // Service-role / NULL uid does not trigger reset — operator verification preserved.
      expect(after.rows[0].afsl_status).toBe('verified');
    });
  });
});
