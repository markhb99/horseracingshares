# Saved-search alerts

> **Status:** v1 (2026-04-23). Phase 3 architect spec.
> **Audience:** the builder implementing the saved-search alert worker + the email template.
> **Scope:** how a `saved_search` row becomes an email in a user's inbox. Collection schema: `docs/search/typesense-schema.md`. Indexer: `docs/search/indexing.md`. Email plumbing: `docs/auth.md` for Resend setup.

---

## 1. The product promise

A buyer who saves a search gets notified when new horses match. That is the feature. The mechanics must deliver on three constraints:

1. **No false positives.** Sending "a new Snitzel colt just listed!" for a horse that's been up for a week destroys trust.
2. **No false negatives.** A genuinely matching horse that escapes the alert loop is silent churn.
3. **Consent-gated.** A saved search with `frequency != 'off'` is treated as opt-in for this specific alert stream — separate from the broader `marketing_email` consent. Unsubscribing from one does not disable the other. Both live in `consent_ledger`.

## 2. Data shape (already built in Phase 2)

- `saved_search` (schema §3.10): `user_id, filter_json, frequency ('off'|'daily'|'weekly'), last_sent_at, last_match_count`.
- `filter_json` is a JSONB payload we validate against a zod schema (`lib/search/filter-schema.ts`, not yet built — a builder task). Shape mirrors the FilterRail: price range, share size[], trainer[], sire[], location state[], bonus schemes[], age category, sex, colour, dam sire[], status.

Example `filter_json`:
```json
{
  "sire": ["Snitzel", "Capitalist"],
  "sex": ["colt"],
  "location_state": ["VIC", "NSW"],
  "price_min_cents": 0,
  "price_max_cents": 500000,
  "share_pcts": [2.5, 5],
  "bonus_schemes": ["BOBS"]
}
```

---

## 3. Worker cadence

Two cron jobs (same schedule infrastructure as the indexer rebuild — pg_cron or Fly scheduled machines):

| Cadence | Time (Australia/Melbourne) | Rationale |
|---|---|---|
| Daily digest  | 07:00 | Morning coffee open rate. Any `saved_search WHERE frequency='daily'`. |
| Weekly digest | Mondays 08:00 | Gentler cadence for less-engaged buyers. `frequency='weekly'`. |

Per run:

```sql
SELECT s.id, s.user_id, s.filter_json, s.last_sent_at
  FROM saved_search s
  JOIN user_profile u ON u.id = s.user_id
 WHERE s.frequency = :cadence
   AND u.deleted_at IS NULL;
```

For each search the worker:

1. Resolves the current `marketing_email` consent via `current_consent(user_id)`. If `granted = false`, skip — do not decrement `last_sent_at`, do not email. The saved search remains active; the consent simply gates delivery. **Rationale:** saving a search is not, by itself, consent to email. It's opt-in at save-time; we re-check on each send for revocation.
2. Runs the search against Typesense with a `filter_by` clause of:
   `created_at_unix:>{last_sent_at_unix || (now - 30 days)} && status:=active && {filter_json projected to filter_by}`.
   Cap results at 20 — any more becomes too noisy to email.
3. If zero results: update `last_sent_at = now()`, `last_match_count = 0`, no email. (Yes, move `last_sent_at` forward even on empty runs — otherwise a newly created saved search with no matches keeps querying "everything since 1970" indefinitely.)
4. If ≥1 result: enqueue a Resend send with the React Email template (below), mark `last_sent_at = now()`, `last_match_count = N`.

---

## 4. Filter-json → Typesense `filter_by` projection

Library function `lib/search/filter-to-typesense.ts`, used by both `/browse` page queries and the worker. Pseudocode:

```ts
function toFilterBy(f: FilterJson): string {
  const clauses: string[] = ['status:=active'];
  if (f.sire?.length)        clauses.push(`sire:=[${f.sire.map(q).join(',')}]`);
  if (f.dam_sire?.length)    clauses.push(`dam_sire:=[${f.dam_sire.map(q).join(',')}]`);
  if (f.sex?.length)         clauses.push(`sex:=[${f.sex.join(',')}]`);
  if (f.colour?.length)      clauses.push(`colour:=[${f.colour.join(',')}]`);
  if (f.age_category?.length)clauses.push(`age_category:=[${f.age_category.join(',')}]`);
  if (f.location_state?.length) clauses.push(`location_state:=[${f.location_state.join(',')}]`);
  if (f.bonus_schemes?.length)  clauses.push(`bonus_schemes:=[${f.bonus_schemes.map(q).join(',')}]`);
  if (f.share_pcts?.length)     clauses.push(`share_pcts_available:=[${f.share_pcts.join(',')}]`);
  if (f.trainer?.length)        clauses.push(`primary_trainer_name:=[${f.trainer.map(q).join(',')}]`);
  if (f.price_min_cents != null) clauses.push(`price_min_cents:>=${f.price_min_cents}`);
  if (f.price_max_cents != null) clauses.push(`price_min_cents:<=${f.price_max_cents}`);
  return clauses.join(' && ');
}
// q() wraps a string in backticks per Typesense filter_by quoting rules.
```

Alert worker adds the freshness clause:
`created_at_unix:>{epoch seconds} && (above)`

Tested as part of the Phase 3 builder handoff — the filter-to-typesense mapping is small enough for a Vitest table-driven test with ~12 cases covering every filter group.

---

## 5. Email template

React Email (`@react-email/components`) template at `emails/saved-search-digest.tsx`. Delivered via Resend.

Visual spec (matches `docs/design-system.md` §4.2 Shortlist email):

- **Subject:** `N new {horse|horses} match your search — {most-interesting sire or most unique facet}`.
  - Pick the subject's highlight dynamically: if `matches.length === 1`, include the sire × dam cross. If > 1, use the shared-sire count if one dominates, else fall back to the count alone.
- **Body:** Fraunces heading "Your shortlist, 23 April 2026." Inter body explaining there are N matches. Three HorseCard-style blocks (compact variant) — thumbnail (hero image), sire × dam in italic, price range, "View →" link.
- **Footer:** three links: "View all on your saved searches", "Change frequency", "Unsubscribe from this search" (single-click revoke — appends `saved_search_unsubscribe` consent row… actually we don't need a new consent type; this is a `saved_search.frequency` flip to `off`).
- **Plain-text alternate:** must be present for deliverability.

Resend from-address: `hello@horseracingshares.com` (requires DNS SPF/DKIM setup — operator Phase 0 item).

Reply-to: `hello@horseracingshares.com` (monitored inbox or forwarded to operator).

---

## 6. Unsubscribe + frequency-change flow

Each email carries two one-click links:

- **Unsubscribe from this search** → `/saved-searches/{id}/unsubscribe?token=...` → sets `frequency='off'`, flashes "Stopped. Re-enable any time in Preferences." Token is a signed HMAC(`saved_search.id` + user_id + secret), expires in 30 days, but single-use — first click invalidates.
- **Change frequency** → `/saved-searches/{id}/frequency?token=...&to=weekly` → flips to the requested cadence.

Both links work without a session. The signed token does the auth. The flow is separate from the consent-ledger unsub-link pattern in `docs/consent-model.md` §3.4 — **that one** toggles a consent type; **this one** toggles a specific saved search.

The "unsubscribe from all marketing" email link (from any marketing email) DOES flip `marketing_email` to false via the consent ledger, which gates future digests as specified in §3 step 1. A user can thus silence digests in two ways: per-search, or globally. Both are discoverable, both take one click.

---

## 7. Deduplication

A horse appearing in multiple of a user's saved searches must not generate multiple emails on the same day. Either:

- **A** Batch all of a user's saved-search hits into a single email per run. Subject line becomes "5 new horses match 2 of your saved searches."
- **B** Send per-saved-search emails (more targeted but noisier).

**Decision: A.** One email per user per cadence. Easier to manage inbox, lower unsub rate, cleaner metric attribution. Implementation: the worker groups by user in step 4 above.

---

## 8. Observability

- Write a `saved_search_run` row (new table — add in the same migration as `search_outbox`) per worker invocation:
  `id, user_id, saved_search_ids text[], cadence, sent_email bool, email_message_id, match_count, ran_at`.
  This is the feedback loop. We inspect it to debug "why didn't I get my email?".
- PostHog events: `saved_search_email_queued`, `saved_search_email_opened` (Resend → webhook → PostHog), `saved_search_email_click`.

---

## 9. Migration file

`supabase/migrations/YYYYMMDDHHMMSS_saved_search_runs.sql`:

```sql
CREATE TABLE saved_search_run (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE,
  saved_search_ids   UUID[] NOT NULL,
  cadence            search_frequency NOT NULL,
  sent_email         BOOLEAN NOT NULL DEFAULT false,
  email_message_id   TEXT,                  -- Resend's returned id
  match_count        INT NOT NULL,
  ran_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX saved_search_run_user_idx ON saved_search_run(user_id, ran_at DESC);

ALTER TABLE saved_search_run ENABLE ROW LEVEL SECURITY;
CREATE POLICY ssr_self     ON saved_search_run FOR SELECT USING (user_id = auth.uid());
CREATE POLICY ssr_operator ON saved_search_run FOR ALL    USING (is_operator()) WITH CHECK (is_operator());
-- Writes come from the worker via service role.
```

---

## 10. Failure modes

| Failure | Behaviour |
|---|---|
| Typesense 5xx on a search | Mark the saved_search_run as `sent_email=false`, retry the whole batch next cadence. Do NOT advance `last_sent_at`. |
| Resend 5xx | Same — retry next cadence. Advance last_sent_at AFTER Resend returns a message id. |
| User with `marketing_email=false` | Skip send; log `sent_email=false, match_count` for auditing. Advance `last_sent_at` so the query window doesn't grow. |
| User with no session in weeks (account deleted) | The JOIN to `user_profile WHERE deleted_at IS NULL` filters them out. |
| 20-result cap hit | Show first 20 in the email, link "+N more on site" at the bottom. Cap avoids deliverability issues on long HTML emails. |

---

## 11. Worker implementation notes

- Same worker image as the indexer? **No.** Separate concerns: the indexer is a long-running poll loop; saved-search is a short-lived cron job. Running as a Fly scheduled machine (not a persistent instance) keeps it cheap and isolated.
- Tests: `tests/search/saved-search.test.ts` — pure tests for `toFilterBy` + the freshness-clause composition. End-to-end worker tests run against pglite + a mocked Typesense client in a separate file.

---

## 12. Open items

- **Instant alerts** ("new listing every 15 minutes for an active buyer"): not v1. Would cap-switch to a per-save-search-push model. Revisit if user feedback demands faster turnaround.
- **Mobile push notifications**: requires a native app / PWA commitment. Not v1.
- **Subject-line A/B test framework**: wait until we have enough volume to power a meaningful test (>500 sends/week). PostHog Feature Flags will drive the split when we're ready.
- **Double-horse scenario** — a single horse matches 3 of a user's saved searches. In the single-email digest the horse appears once with a footnote ("Matches: 'Snitzel colts', 'VIC under $5k share', 'BOBS eligible'"). Nicer UX than listing three times.

---

*— architect (v1, 2026-04-23)*
