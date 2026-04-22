# horseracingshares.com

> Project memory for Claude Code. Read this at the start of every session.
> Update this file (don't let it go stale) whenever a foundational decision changes.

---

## What we're building

A two-sided Australian marketplace where licensed racehorse syndicators and trainers list shares for sale, and prospective owners discover, compare, and enquire about them.

**Domain:** horseracingshares.com (owned)
**Brand wordmark:** Horse Racing Shares
**Shortform:** HRS

## Who's behind it (and why that matters)

Operator: **Regal Bloodstock** — Melbourne-based, ASIC-authorised racehorse syndicator (AFSL holder / authorised representative).

Strategic objective, in priority order:

1. **Build a first-party, consented buyer database.** Every prospective owner who registers, saves a search, or enquires becomes a scored profile. The database is the asset.
2. **Funnel hot leads to Regal Bloodstock.** Regal's own horses appear on the marketplace identically to any other listing, but matched buyers receive personalised outreach from a Regal rep.
3. **Generate listing-fee revenue** to cover operating cost. Not the goal — the cover story.

If a product decision pulls between (1) and (3), pick (1).

## Disclosure (non-negotiable)

The Regal Bloodstock ownership relationship is disclosed clearly in `/about` and `/legal`. We do not hide it. Competitor syndicators must trust the platform enough to list their horses; opacity here would end the business.

---

## Tech stack (locked)

| Layer | Choice |
|---|---|
| Frontend | Next.js 16 (App Router, RSC, Turbopack dev) + TypeScript |
| Styling | Tailwind v4 + shadcn/ui |
| Backend | Next.js API routes + Supabase (Postgres + Auth + Storage + RLS) |
| Search | Typesense (self-hosted on Fly.io) |
| Email | Resend (transactional) + Loops (marketing + scoring) |
| Payments | Stripe — listing fees ONLY. Never share purchases. |
| Analytics | PostHog (events + session replay + feature flags) |
| Video | Mux |
| Hosting | Vercel (web) + Fly.io (search, workers) |
| CMS | Supabase + MDX for blog/guide content |

Do not propose alternative stack choices unless a hard constraint forces it.

---

## Coding conventions

- **Money:** stored as integers in cents (AUD). Never floats.
- **Dates:** ISO 8601 UTC in DB and API. Display as DD/MM/YYYY in UI.
- **Distances:** metres. **Weights:** kilograms. Australian English throughout.
- **Server components by default.** Mark `'use client'` only when interactivity demands it.
- **Row-level security on every Supabase table.** No exceptions.
- **Zod schemas at every API boundary** — request validation and response typing.
- **Forms:** react-hook-form + zod resolver. Native HTML validation off.
- **Component naming:** PascalCase files, kebab-case folders. One component per file.
- **Imports:** absolute via `@/` alias.
- **Tests:** Vitest for units, Playwright for E2E. Test the compliance-critical flows first (listing submission validation, AFSL gate, enquiry capture).

---

## Compliance — load-bearing rules

ASIC + Racing Australia + state principal racing authority rules apply. The platform is **not** an issuer of financial products; it is a classifieds/advertising platform. This shapes every decision.

**Database-enforced:**
- A `Horse` row cannot have `status = 'active'` unless `syndicator.afsl_number IS NOT NULL` AND `syndicator.afsl_verified_at IS NOT NULL` AND `horse.pds_url IS NOT NULL`. Enforce via CHECK constraint AND in the API route AND in the form. Belt, braces, second belt.

**UI-enforced:**
- Every horse listing displays the syndicator's AFSL number and a PDS download button visible above the fold on the detail page.
- Every page footer carries: *"Shares are issued by the listed syndicator under their own Product Disclosure Statement and Australian Financial Services Licence. Horse Racing Shares is an advertising platform and is not an issuer of financial products. We do not provide personal financial advice."*
- Cost calculator outputs carry a "Estimates only — actual costs vary" caveat.
- Never display words that imply guaranteed return: "investment", "returns", "profit", "ROI" in marketing copy. Use "ownership", "share", "experience", "prizemoney".

**Operational:**
- No share purchases flow through the platform. Stripe is for listing fees from syndicators only.
- Enquiries are captured on-platform (we own the data) AND forwarded to the syndicator's email within 60 seconds.
- Buyer consent for marketing is opt-in, granular, and revocable from `/account`.

**Before launch:** Addisons (or equivalent racing-industry counsel) must sign off on PDS handling, disclaimer copy, the Regal disclosure, and the data-sharing consent flow. No code ships to production until that review is done.

---

## Reference documents in this repo

- `blueprint.md` — full strategic blueprint (read first)
- `research-findings.md` — competitor analysis (rhownership, buyaracehorse)
- `design-system.md` — output of the design prompt (created in design phase)
- `tasks.md` — phased build manifest with [OPUS]/[SONNET] tags
- `compliance-checklist.md` — pre-launch legal sign-off items
- `AGENTS.md` — Next.js 16 version-drift guardrail (loaded via @import below)

@AGENTS.md

---

## Working with sub-agents

Three agents live in `.claude/agents/`:

- **architect** (Opus 4.7) — architecture, data modelling, security, compliance flows, hard debugging, design decisions
- **builder** (Sonnet 4.6) — well-specified component implementation, styling, tests
- **content** (Sonnet 4.6) — blog posts, listing copy polish, SEO meta, email sequences

Default routing: if the task is in `tasks.md` and tagged, use that model. If unclear, ask the architect to scope it first.

---

## What good looks like

- A buyer arriving from rhownership.com should immediately feel they've found the real version of what they were looking for.
- A syndicator filling out the listing form should think "this is the most professional submission flow in Australian racing".
- A Racing Victoria compliance officer auditing the site should find nothing to flag in 30 minutes.
- Anthropic's web team should look at the page weights and load times and not wince.

## What we don't do

- We don't promise winners or returns.
- We don't take payment for shares.
- We don't pass leads to syndicators without the buyer's explicit consent.
- We don't add features that aren't in `tasks.md`. Scope creep is how this project dies in month 4.
- We don't apologise for the Regal relationship — we disclose it and move on.
