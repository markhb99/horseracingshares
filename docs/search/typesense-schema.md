# Search schema — Typesense collection design

> **Status:** v1 (2026-04-23). Phase 3 architect spec.
> **Audience:** the builder deploying Typesense on Fly.io and writing the indexer worker.
> **Scope:** what we index, field types, facets, sort options, typo tolerance, synonyms, ranking. Indexing strategy + saved-search alerts live in their own docs under `docs/search/`.

---

## 1. One collection: `horses`

Every searchable surface in the MVP ultimately asks the same question: *which horses match these criteria?*. The filter rail on `/browse`, the saved-search builder, the `/horse/[slug]` "also listed" strip, the homepage hero rotation — all project from the same denormalised horse record.

We deliberately do **not** index: syndicators (browsed via `/syndicators` from Postgres directly; low volume), trainers (same), or winner archive (public-read Postgres queries are fine). If any of those grow a search need, they're additional Typesense collections — don't overload `horses`.

## 2. Collection schema

```jsonc
{
  "name": "horses",
  "enable_nested_fields": true,
  "default_sorting_field": "created_at_unix",
  "fields": [
    // ─── Identity ─────────────────────────────────────────
    { "name": "id",          "type": "string" },
    { "name": "slug",        "type": "string" },
    { "name": "name",        "type": "string", "optional": true, "infix": true },
    { "name": "status",      "type": "string", "facet": true },

    // ─── Pedigree (the search-driving fields) ─────────────
    { "name": "sire",        "type": "string", "facet": true, "infix": true },
    { "name": "dam",         "type": "string", "facet": true, "infix": true },
    { "name": "dam_sire",    "type": "string", "facet": true, "optional": true },

    // ─── Physical attributes ──────────────────────────────
    { "name": "sex",         "type": "string", "facet": true },
    { "name": "colour",      "type": "string", "facet": true, "optional": true },
    { "name": "foal_date",   "type": "string", "optional": true },
    { "name": "foal_year",   "type": "int32",  "facet": true, "optional": true },
    { "name": "age_category","type": "string", "facet": true },

    // ─── Location ─────────────────────────────────────────
    { "name": "location_state",    "type": "string", "facet": true },
    { "name": "location_postcode", "type": "string", "optional": true },

    // ─── Syndicator (denormalised, facetable) ─────────────
    { "name": "syndicator_id",        "type": "string", "facet": true },
    { "name": "syndicator_slug",      "type": "string" },
    { "name": "syndicator_name",      "type": "string", "facet": true },
    { "name": "syndicator_tier",      "type": "string", "facet": true },
    { "name": "is_regal_owned",       "type": "bool",   "facet": true },

    // ─── Trainer (primary only — facet over display name) ──
    { "name": "primary_trainer_id",   "type": "string", "facet": true, "optional": true },
    { "name": "primary_trainer_name", "type": "string", "facet": true, "optional": true },

    // ─── Commercial ───────────────────────────────────────
    // Min price across share_tier rows for the horse; ditto max.
    { "name": "price_min_cents",       "type": "int64", "sort": true },
    { "name": "price_max_cents",       "type": "int64", "sort": true },
    // Largest 1% valuation from any share tier; supports "horses under $X per %".
    { "name": "price_per_pct_cents",   "type": "int64", "sort": true, "optional": true },
    // Facet bucket for price ranges — see §3.2.
    { "name": "price_bucket",          "type": "string", "facet": true },
    // Share-size chips available — multi-valued.
    { "name": "share_pcts_available",  "type": "float[]", "facet": true },
    // Running cost indicator (cents per % per week).
    { "name": "ongoing_cost_cents_per_pct_per_week", "type": "int32", "sort": true, "optional": true },

    // ─── Availability ────────────────────────────────────
    { "name": "total_shares_remaining", "type": "float", "sort": true },
    { "name": "has_final_shares",       "type": "bool",  "facet": true }, // remaining ≤ 2%

    // ─── Bonus schemes (multi-valued facet) ──────────────
    { "name": "bonus_schemes", "type": "string[]", "facet": true, "optional": true },

    // ─── Vet + compliance (bool facets) ───────────────────
    { "name": "vet_xray_clear", "type": "bool", "facet": true, "optional": true },
    { "name": "vet_scope_clear","type": "bool", "facet": true, "optional": true },

    // ─── Freshness + popularity ──────────────────────────
    { "name": "created_at_unix",   "type": "int64", "sort": true },
    { "name": "submitted_at_unix", "type": "int64", "sort": true, "optional": true },
    { "name": "view_count",        "type": "int32", "sort": true },
    { "name": "enquiry_count",     "type": "int32", "sort": true },

    // ─── Display payload (not searched) ───────────────────
    { "name": "hero_image_path", "type": "string", "optional": true, "index": false },
    { "name": "description",     "type": "string", "optional": true, "index": false }
  ]
}
```

### Notes on the field choices

- **`age_category`** is a derived string — `"yearling" | "2yo" | "3yo" | "older"` — computed at index time from `foal_date` against the current Southern Hemisphere racing calendar (1 August is the age rollover). Denormalising lets the filter rail chip over it without running date maths client-side on every request.
- **`foal_year`** is faceted as an int because the filter might ever want to say "2023 foals" directly.
- **`has_final_shares`** is a bool derived from `total_shares_remaining <= 2.0`. This supports the brass "Final shares available" badge on HorseCards without the UI having to do a comparison.
- **`price_bucket`** is a derived facet (string) so Typesense can count horses per range without us round-tripping a range query. See §3.2.
- **Denormalised syndicator + trainer names** are facetable AND searchable. Yes it's duplication — a rename cascades through an index update, which is fine because rename rate on these entities is near-zero.
- **`hero_image_path` + `description`** ship in the document but are marked `index: false`. We return them on search hits so the HorseCard renders from the search result alone, without a second Postgres round-trip.

### Fields NOT indexed (deliberately)

- **`pedigree_json`** (full 3-generation chart). Huge, rarely searched. The horse detail page fetches it from Postgres. If we ever want "horses descended from Frankel 3 generations back", that's a job for a Postgres JSONB query, not Typesense.
- **`pds_url`** — compliance field, not a search surface. Displayed, not searched.
- **`insurance_details`** — same.
- **`approved_by`, `submitted_at`, audit fields** — operator-only via `/admin`.
- **Images beyond the hero.** Horse detail page fetches the full gallery from Postgres.
- **Videos.** Mux playback IDs are separate, fetched on the detail page.

## 3. Facet design

### 3.1 Facets by filter rail group

Match `docs/design-system.md` §3.2 (FilterRail "6 default + 5 expanded"):

| Filter group | Facet field(s) |
|---|---|
| Price range | `price_bucket` (discrete) + `price_min_cents` (range slider via numeric query) |
| Share size | `share_pcts_available` (float[]) |
| Trainer | `primary_trainer_name` |
| Sire | `sire` |
| Location | `location_state` |
| Bonus schemes | `bonus_schemes` (string[]) |
| *More filters:* | |
| Age | `age_category` |
| Sex | `sex` |
| Colour | `colour` |
| Dam sire | `dam_sire` |
| Status | `status` |

Bonus scheme icons on the card come from `bonus_schemes` directly.

### 3.2 `price_bucket` values

Computed at index time from `price_min_cents`:

| Range | `price_bucket` |
|---|---|
| < $1,000 per 1% | `under_1k` |
| $1,000–2,499 | `1k_2_5k` |
| $2,500–4,999 | `2_5k_5k` |
| $5,000–9,999 | `5k_10k` |
| ≥ $10,000 | `10k_plus` |

These are 1%-share benchmarks, not full-horse. A $1.25M horse has a $12,500 1% valuation → `10k_plus`. Gives the filter chips stable labels without reindexing when a horse's mid-tier price changes by a few dollars.

Actual numeric range queries (slider) use `price_min_cents` directly — the bucket is for chip facet counts.

## 4. Query defaults

```jsonc
{
  "query_by":        "name,sire,dam,dam_sire,syndicator_name,primary_trainer_name",
  "query_by_weights":"3,5,5,2,2,2",
  "num_typos":       "1,1,1,1,0,0",
  "prefix":          "true,true,true,true,false,false",
  "infix":           "fallback",
  "sort_by":         "_text_match:desc,has_final_shares:desc,view_count:desc,created_at_unix:desc"
}
```

- **Pedigree fields (sire, dam) outrank name.** When a buyer types "Frankel" they mean "horses by Frankel", not "a horse named Frankel".
- **`dam_sire` gets lower weight (2)** — interesting signal but not a primary match.
- **Name + pedigree allow 1 typo.** Syndicator + trainer names don't (they're public-register proper nouns — a misspelled "Chris Waller" deserves a correction prompt, not a silent fuzzy match).
- **Infix fallback** on name/sire/dam lets partial strings match mid-word ("zoust" → "Zoustar"). Set to `fallback` (not `always`) so exact prefix matches still win.

### Sort options exposed in UI

Per `docs/design-system.md` §3.3 FilterRail:

| Label                        | Typesense `sort_by`                                                   |
|---|---|
| Newest first (default)       | `_text_match:desc,has_final_shares:desc,created_at_unix:desc`         |
| Price: low to high           | `price_min_cents:asc`                                                 |
| Price: high to low           | `price_max_cents:desc`                                                |
| Final shares first           | `has_final_shares:desc,created_at_unix:desc`                          |
| Most viewed                  | `view_count:desc,created_at_unix:desc`                                |

No "sort by popularity" that Regal could game. The `_text_match` tiebreak in the default sort is also our deliberate choice — we do not insert any `is_regal_owned`-based ranking. The two Regal-favouring affordances allowed by the v3 critique (`docs/design-system.md` v2 reconciliation) do not live in search ranking; they live in the homepage hero rotation and hot-lead matching, both of which are disclosed in `/about`.

## 5. Synonyms

Typesense synonyms operate on **terms**, so they handle vocabulary expansion well (colt/c, 2yo/two-year-old) but cannot express relational queries like "Snitzel sons" → `sire:=Snitzel`. We split synonyms by purpose:

### 5.1 One-way synonyms (term expansion)

```jsonc
// Age / sex
{ "root": "2yo",   "synonyms": ["two year old", "two-year-old", "two years old"] }
{ "root": "3yo",   "synonyms": ["three year old", "three-year-old", "three years old"] }
{ "root": "yearling", "synonyms": ["weanling"] }  // close enough for search-suggest UX
{ "root": "colt",    "synonyms": ["c"] }
{ "root": "filly",   "synonyms": ["f"] }
{ "root": "gelding", "synonyms": ["g"] }
{ "root": "mare",    "synonyms": ["m"] }

// Bonus schemes
{ "root": "BOBS", "synonyms": ["Breeder Owner Bonus Scheme", "bobs"] }
{ "root": "VOBIS", "synonyms": ["Super VOBIS", "vobis"] }
{ "root": "QTIS", "synonyms": ["Queensland Thoroughbred Incentive", "qtis"] }
{ "root": "MM",   "synonyms": ["Magic Millions", "magic millions"] }
{ "root": "Inglis Xtra", "synonyms": ["Inglis Race Series"] }

// Pedigree shorthand
{ "root": "Snitzel", "synonyms": ["son of Snitzel", "snitzel son"] }  // see §5.2 — we DON'T add "sons of Snitzel" here, this is a last-resort fallback
```

### 5.2 Relational query rewrites (app-side, NOT synonyms)

Parsing "Snitzel sons" / "Zoustar daughters" / "by I Am Invincible" happens in `lib/search/parse.ts` before the query hits Typesense. Rewrite rules:

```ts
// Pseudocode
"Snitzel sons"        → q="", filter_by="sire:=Snitzel"
"Zoustar daughters"   → q="", filter_by="sire:=Zoustar && sex:=filly"
"by I Am Invincible"  → q="", filter_by="sire:=I Am Invincible"
"out of Roman Belle"  → q="", filter_by="dam:=Roman Belle"
```

Parser lives in the app, tests live in `tests/search/parse.test.ts`. We do this client-before-Typesense so the filter chips in the UI can pre-populate to reflect the rewrite (a buyer typing "Snitzel sons" should see the Sire chip light up).

### 5.3 Typo-tolerant sire spellings

Australian racing has a handful of sires with stylised names:
- "Redoute's Choice" (apostrophe). Index both `"Redoute's Choice"` and a normalised `"Redoutes Choice"` via synonym: `{ root: "Redoute's Choice", synonyms: ["Redoutes Choice", "redoute choice"] }`.
- Similarly for "I Am Invincible" (multi-word with capital-I), "Too Darn Hot" (no rewrite needed, already clean).

## 6. Typo tolerance + ranking

- `num_typos` per field (see §4). Default cap 1, none on proper-noun identity fields.
- `drop_tokens_threshold: 1` — if a 3-word query returns zero hits, drop the least-important token and retry. Catches *"Snitzel colt NSW"* where no single horse matches all three but dropping `colt` might surface relevant results.
- `typo_tokens_threshold: 1` — only consider typo matches when strict matches fall short.
- **Ranking tiebreaks:** `_text_match:desc` (Typesense relevance), then `has_final_shares:desc` (scarcity nudge — this is a product decision, not a commercial one; buyers engage more with horses that have social proof of selling), then `view_count:desc`, then `created_at_unix:desc`.

## 7. What changes when a horse is indexed / unindexed

| Event | Typesense op |
|---|---|
| Horse inserted with `status='draft'` | **skip** — drafts aren't public |
| Horse transitions draft → active | UPSERT |
| Horse active → sold | UPSERT (keep indexed with `status=sold`; filter hides by default) |
| Horse active → withdrawn | DELETE |
| Horse active → pending_review (AFSL cascade) | DELETE — buyer shouldn't see a listing that failed verification |
| Horse's `deleted_at` set | DELETE |
| `share_tier` row changes (price, availability) | UPSERT parent horse (price_min/max/buckets recompute) |
| `horse_image` hero changes | UPSERT parent horse (hero_image_path) |
| `syndicator` name/tier changes | UPSERT every active horse owned by them |
| `trainer` name changes | UPSERT every active horse with that primary trainer |
| `syndicator.afsl_status` leaves `verified` | all active horses cascade to `pending_review` → DELETE from index (handled by the horse UPDATE trigger above) |

Every op writes a row to the outbox; the worker in `docs/search/indexing.md` drains it.

## 8. Implementation checklist (Phase 3 builder tasks)

1. Provision a Typesense cluster on Fly.io — 1 node is fine for the MVP; upgrade when `horses.num_documents` > 10 000 or p95 latency > 50ms.
2. Environment vars (add to `.env.local.example`):
   - `NEXT_PUBLIC_TYPESENSE_HOST`
   - `NEXT_PUBLIC_TYPESENSE_PORT`
   - `NEXT_PUBLIC_TYPESENSE_PROTOCOL` (`https`)
   - `TYPESENSE_ADMIN_KEY` (server-only; creates/drops collections, bulk imports)
   - `NEXT_PUBLIC_TYPESENSE_SEARCH_KEY` (public, search-only, scoped to `horses` collection)
3. Apply the collection schema via `scripts/typesense-provision.ts` — idempotent: create if missing, otherwise validate field drift and alter if safe.
4. Load synonyms via the same script.
5. Implement the indexer worker per `docs/search/indexing.md` (separate doc).
6. Wire the `/browse` page and filter rail to the public search key.

## 9. Open items

- **Multi-language search** (Māori / French horse names): not a v1 concern. Default English analyzer is fine.
- **"More like this" recommendations** on `/horse/[slug]`: likely a separate Typesense request with the horse's id and `per_page=4`; can re-use `query_by=sire,dam,dam_sire,primary_trainer_name` with the current horse excluded via `filter_by=id:!= {slug}`. Detailed spec when the detail page ships in Phase 4.
- **Semantic vector search** (embeddings): not v1. Revisit post-launch if keyword + facets prove insufficient.

---

*— architect (v1, 2026-04-23)*
