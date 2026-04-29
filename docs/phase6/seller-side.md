# Phase 6 — Seller side spec

> **Status:** v1 (Phase 6).
> **Audience:** builder.
> **Scope:** `/list` pricing page, `/list/submit` multi-step form, Stripe checkout + webhook, `/list/dashboard` syndicator dashboard, admin moderation queue.

---

## 1. Listing tiers (canonical)

These are the live prices. The existing `listing_tier` DB rows are placeholders — update them via migration.

| Code | Name | Price | Duration | Max horses |
|---|---|---|---|---|
| `listed` | Listed | $39 per listing | 90 days | — |
| `feature` | Feature | $79 per listing | 90 days | — |
| `headline` | Headline | $149 per listing | 90 days | — |
| `partner` | Stable Partner | $499/month | Unlimited | unlimited |

Stripe products (create via Stripe Dashboard or API before deploying):
- Listed: one-time, $39 AUD → env var `STRIPE_PRICE_LISTED`
- Feature: one-time, $79 AUD → env var `STRIPE_PRICE_FEATURE`
- Headline: one-time, $149 AUD → env var `STRIPE_PRICE_HEADLINE`
- Stable Partner: recurring monthly, $499 AUD → env var `STRIPE_PRICE_PARTNER`

Add to `.env.local` (values filled after Stripe setup):
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_LISTED=price_...
STRIPE_PRICE_FEATURE=price_...
STRIPE_PRICE_HEADLINE=price_...
STRIPE_PRICE_PARTNER=price_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## 2. Database migrations needed

### 2.1 Update listing_tier rows

```sql
-- supabase/migrations/20260425130000_update_listing_tiers.sql
-- Update tier codes and prices to match design system.

UPDATE listing_tier SET
  code = 'listed',
  name = 'Listed',
  price_cents_per_listing = 3900,
  price_cents_per_month = 0
WHERE code = 'basic';

UPDATE listing_tier SET
  code = 'feature',
  name = 'Feature',
  price_cents_per_listing = 7900,
  price_cents_per_month = 0
WHERE code = 'premium';

UPDATE listing_tier SET
  code = 'headline',
  name = 'Headline',
  price_cents_per_listing = 14900,
  price_cents_per_month = 0
WHERE code = 'platinum';

UPDATE listing_tier SET
  code = 'partner',
  name = 'Stable Partner',
  price_cents_per_listing = NULL,
  price_cents_per_month = 49900
WHERE code = 'partner';
```

### 2.2 Add columns to horse table

```sql
-- supabase/migrations/20260425130100_horse_listing_columns.sql

ALTER TABLE horse
  ADD COLUMN IF NOT EXISTS listing_tier_code  TEXT DEFAULT 'listed',
  ADD COLUMN IF NOT EXISTS stripe_payment_id  TEXT,
  ADD COLUMN IF NOT EXISTS submitted_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by        UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS rejection_reason   TEXT,
  ADD COLUMN IF NOT EXISTS share_listings     JSONB DEFAULT '[]';
-- share_listings: [{pct: 2.5, price_cents: 650000, available: true}, ...]
-- Stored denormalised on the horse row for v1 simplicity.
-- Replaces the share_listing table (which doesn't exist yet).
```

### 2.3 Add RLS policy for syndicator to manage own horses

```sql
-- supabase/migrations/20260425130200_syndicator_horse_rls.sql

-- Syndicator users can insert/update their own horses.
CREATE POLICY horse_syndicator_insert ON horse
  FOR INSERT TO authenticated
  WITH CHECK (
    syndicator_id IN (
      SELECT syndicator_id FROM syndicator_user WHERE user_id = auth.uid()
    )
  );

CREATE POLICY horse_syndicator_update ON horse
  FOR UPDATE TO authenticated
  USING (
    syndicator_id IN (
      SELECT syndicator_id FROM syndicator_user WHERE user_id = auth.uid()
    )
  );
```

---

## 3. `/list` — Pricing page

**File:** `app/list/page.tsx` (server component)

Layout per design-system §4.6:
1. Hero: H1 "List a horse on Horse Racing Shares" + sub + "Start a listing" CTA → `/list/submit`
2. Why list strip: 3 stat cards (800+ registered buyers / 150+ qualified enquiries / 24h AFSL verification)
3. Tier table: `ListingTierTable` component — 4 tiers side by side on desktop, stacked on mobile
   - "Most popular" brass ribbon on Feature tier
   - CTA button per tier → `/list/submit?tier=[code]`
4. Launch offer strip: brass background, "First 90 days free for any listing. Offer ends 30 June 2026."
5. FAQ accordion (7 items — see §3.1)
6. Secondary CTA

### 3.1 FAQ content

1. **Do I need an AFSL to list?** — Yes. Every syndicator must hold an Australian Financial Services Licence (AFSL) or be an Authorised Representative of an AFSL holder. We verify your AFSL against the ASIC register within 24 hours of submission.
2. **What is a Product Disclosure Statement (PDS)?** — A PDS is a legal document required by ASIC that describes the terms of a racehorse syndication. You must provide a current PDS for each horse before your listing goes live.
3. **How long does moderation take?** — We aim to approve compliant listings within 24 hours on business days. You'll receive an email when your listing is live.
4. **Can I edit a listing after it goes live?** — Yes, from your dashboard. Material changes (price, share sizes, PDS update) require re-moderation.
5. **What happens when a listing expires?** — Your listing moves to Expired status after 90 days. You can renew from the dashboard.
6. **Can I list a horse that is already partly sold?** — Yes. Update the available share percentages in your listing to reflect what's still available.
7. **What is your refund policy?** — We offer a full refund if your listing is rejected by our moderation team. No refunds for listings that go live and then expire.

---

## 4. `/list/submit` — Multi-step submission form

**File:** `app/list/submit/page.tsx` (RSC shell)
**Client component:** `components/list/SubmitStepper.tsx`

### 4.1 Steps (4-step stepper)

```
Step 1: Horse details
Step 2: Shares & pricing
Step 3: Compliance (PDS URL + AFSL confirmation)
Step 4: Choose tier + pay
```

Progress indicator: horizontal stepper at top. Step label + number. Current step in midnight. Completed steps with a checkmark.

### 4.2 Step 1 — Horse details

Fields (all validated with Zod):
- `name` — text, optional (unnamed horses are common). Label: "Horse name (if named)"
- `sire` — text, required. Label: "Sire"
- `dam` — text, required. Label: "Dam"
- `dam_sire` — text, optional. Label: "Dam's sire"
- `sex` — select: Colt / Filly / Gelding / Mare / Stallion. Required.
- `foal_date` — date input (year + month sufficient; day optional). Optional. Label: "Foal date"
- `colour` — select: Bay / Brown / Chestnut / Grey / Black / Roan / Other. Optional.
- `location_state` — select: NSW / VIC / QLD / SA / WA / TAS / ACT / NT. Required.
- `location_postcode` — text, 4 digits. Optional.
- `primary_trainer_name` — text, optional. Label: "Trainer name"
- `description` — textarea, max 2000 chars. Optional. Label: "Listing description"
- `bonus_schemes` — checkboxes: BOBS / VOBIS / QTIS / MMRS / Magic Millions / Inglis Classic. Multiple allowed.
- `vet_xray_clear` — checkbox: "X-rays clear"
- `vet_scope_clear` — checkbox: "Scope clear"
- `vet_checked_at` — date, shown only if either vet checkbox is ticked. Label: "Vet check date"
- `ongoing_cost_cents_per_pct_per_week` — number input, in dollars (convert to cents on submit). Label: "Weekly training cost per 1% share (AUD)"

### 4.3 Step 2 — Shares & pricing

Dynamic list of share tiers. Start with one row; "Add another share size" button adds more (up to 5).

Each row:
- `share_pct` — number, 0.5–25, step 0.5. Label: "Share size (%)"
- `price_cents` — number, in dollars. Label: "Price (AUD)"
- `available` — checkbox (default true). Label: "Available"

Share listings stored as `share_listings: [{pct, price_cents, available}]` on the horse row.

Auto-compute: `total_shares_available = 100`, `total_shares_remaining = sum of available share_pcts`.

Validation: sum of all share_pcts must not exceed 100.

### 4.4 Step 3 — Compliance

Fields:
- `pds_url` — URL input, required. Label: "PDS URL (publicly accessible PDF link)". Hint: "The PDS must be publicly accessible — upload it to your website or provide a direct link."
- `pds_dated` — date. Optional. Label: "PDS date"
- AFSL confirmation checkbox (required): "I confirm that [syndicator name] holds a valid AFSL or is an Authorised Representative of an AFSL holder, and that this listing complies with our [Terms of Service](/legal)."

Show the syndicator's current `afsl_number` and `afsl_status` from the DB. If `afsl_status !== 'verified'`, show a yellow warning: "Your AFSL is pending verification. Your listing will be held in draft until verification is complete."

### 4.5 Step 4 — Choose tier + pay

Show the 4 tiers as cards (compact). Pre-select the tier from the URL param `?tier=` if present.

On "Pay and submit":
1. POST to `POST /api/list/create-checkout` with all collected form data + selected tier code.
2. API creates the horse row in `draft` status, then creates a Stripe Checkout Session.
3. Redirect to Stripe Checkout.
4. On return from Stripe (success URL: `/list/submit/success?session_id={CHECKOUT_SESSION_ID}`), webhook has already updated horse status to `submitted`.

For the `partner` tier (subscription): create a Stripe Billing Portal session or a subscription checkout — same flow but `mode: 'subscription'`.

**Launch offer:** if today < 2026-07-01, show a "First 90 days free" option. Implement as a 100% discount Stripe coupon applied automatically (env var `STRIPE_LAUNCH_COUPON`). If the coupon is not set, skip silently.

---

## 5. Stripe integration

### 5.1 API routes

**`POST /api/list/create-checkout`**

```ts
export const runtime = 'nodejs';
```

1. Auth-gate: user must be logged in and be a `syndicator_user`.
2. Parse body with Zod — all horse fields + `tier_code`.
3. Look up the `listing_tier` row for `tier_code`.
4. Create horse row in Supabase with `status = 'draft'`, `submitted_at = now()`, all form fields.
5. Create Stripe Checkout Session:
   ```ts
   const session = await stripe.checkout.sessions.create({
     mode: tier.code === 'partner' ? 'subscription' : 'payment',
     line_items: [{ price: stripePriceId, quantity: 1 }],
     success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/list/submit/success?session_id={CHECKOUT_SESSION_ID}`,
     cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/list/submit?cancelled=1`,
     client_reference_id: horse.id,
     metadata: { horse_id: horse.id, syndicator_id: syndicatorId, tier_code: tier.code },
     discounts: launchCoupon ? [{ coupon: launchCoupon }] : [],
   });
   ```
6. Return `{ url: session.url }`. Client does `window.location.href = url`.

**`POST /api/list/webhook`**

```ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
```

Stripe sends events here. Verify signature with `stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)`.

Handle:
- `checkout.session.completed` → update horse `status = 'submitted'`, record `stripe_payment_id = session.payment_intent` (or `session.subscription`).
- `checkout.session.expired` → update horse `status = 'draft'` (leave for retry).
- `invoice.payment_failed` (subscription) → send email to syndicator (out of scope for v1, just log).

After `checkout.session.completed`, also enqueue the horse into `search_outbox` (upsert) so the indexer picks it up IF the horse gets approved — actually no, only upsert to search_outbox when `status = 'active'`. The webhook just marks it `submitted`; moderation approval triggers the indexer.

**`GET /api/list/success`**

Verify the session with Stripe, return the horse id. Used by the success page to show confirmation.

### 5.2 Stripe client singleton

```ts
// lib/stripe/client.ts
import Stripe from 'stripe';
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});
```

Install: `npm install stripe @stripe/stripe-js`

---

## 6. Success page — `/list/submit/success`

**File:** `app/list/submit/success/page.tsx` (server component)

Fetch the session from Stripe via `?session_id=`. Show:
- Fraunces H1: "Your listing has been submitted"
- Body: "We'll review it within 24 hours. You'll receive an email when it's live. In the meantime, you can track progress from your dashboard."
- CTA: "Go to dashboard →" (`/list/dashboard`)

---

## 7. Syndicator dashboard — `/list/dashboard`

**File:** `app/list/dashboard/page.tsx` (server component)

Auth-gate: `requireRole(['syndicator', 'operator'], '/login')`. Look up `syndicator_user` to get `syndicator_id`.

Layout per design-system §4.8:
- H1 "Dashboard" + syndicator name + AFSL status pill
- 3-tab layout: Listings | Enquiries | Profile

### 7.1 Listings tab

Query horses grouped by status: Draft, Submitted (awaiting approval), Active, Sold, Expired.

Each horse card shows:
- Sire × Dam (Fraunces italic), status badge, listing tier
- View count, enquiry count
- Days remaining (if active: 90 days from `approved_at`)
- "Edit" button (→ `/list/submit?edit=[horse_id]`, out of scope — show as disabled for v1)
- "Renew" button (only for expired — out of scope for v1, show as disabled)

Empty state per group: "No [status] listings."

### 7.2 Enquiries tab

Query `enquiry` rows for this `syndicator_id`, joined with horse name/slug, ordered by `created_at DESC`.

Desktop: two-pane (list left, detail right via `useState`).
Mobile: list only; clicking opens a Sheet drawer.

Each enquiry row: buyer name, horse, date, share size interested, status badge (received/forwarded/failed).

Detail pane (or drawer) shows: all buyer fields (name, email, phone, share size, message), consent_share_at_submit status, forward timestamp.

### 7.3 Profile tab

Read-only display of syndicator fields: name, AFSL number, AFSL status, contact email, contact phone, website.

Add "Request profile update" link that opens a mailto to the operator. (Full profile editing is Phase 8 scope.)

---

## 8. Admin moderation queue

**Edit:** `app/admin/page.tsx`

Add a new section below existing content: "Listing moderation queue".

Query:
```ts
const { data: pendingHorses } = await supabase
  .from('horse')
  .select('id, slug, name, sire, dam, sex, location_state, pds_url, listing_tier_code, submitted_at, syndicator_id, syndicator:syndicator_id(name, afsl_number, afsl_status)')
  .eq('status', 'submitted')
  .is('deleted_at', null)
  .order('submitted_at', { ascending: true });
```

For each horse, show:
- Sire × Dam, syndicator name, AFSL status badge, PDS link (open in new tab), submitted date
- "Approve" button → `POST /api/admin/horses/[id]/approve`
- "Reject" button → opens an inline text input for reason → `POST /api/admin/horses/[id]/reject`

### 8.1 Approve API

**`POST /api/admin/horses/[id]/approve`**

1. `requireRole(['operator'])`.
2. Verify horse is in `submitted` status.
3. Check compliance gate: `pds_url IS NOT NULL` AND syndicator `afsl_status = 'verified'`.
4. Update horse: `status = 'active'`, `approved_at = now()`, `approved_by = auth.uid()`.
5. Insert into `search_outbox`: `{ document_id: horseId, op: 'upsert', reason: 'moderation_approved' }`.
6. Return 200.

### 8.2 Reject API

**`POST /api/admin/horses/[id]/reject`**

Body: `{ reason: string }` (required, max 500 chars).

1. `requireRole(['operator'])`.
2. Update horse: `status = 'draft'`, `rejection_reason = reason`.
3. Send email to syndicator's contact_email (plain text via Resend) with the reason and a link to edit and resubmit.
4. Return 200.

---

## 9. Files to create / edit

| Path | Purpose |
|---|---|
| `supabase/migrations/20260425130000_update_listing_tiers.sql` | Update tier codes + prices |
| `supabase/migrations/20260425130100_horse_listing_columns.sql` | Add `listing_tier_code`, `stripe_payment_id`, `submitted_at`, `approved_at`, `approved_by`, `rejection_reason`, `share_listings` columns |
| `supabase/migrations/20260425130200_syndicator_horse_rls.sql` | Syndicator insert/update RLS policies |
| `lib/stripe/client.ts` | Stripe singleton |
| `app/list/page.tsx` | Pricing page |
| `app/list/submit/page.tsx` | RSC shell (renders SubmitStepper) |
| `app/list/submit/success/page.tsx` | Post-payment confirmation |
| `components/list/SubmitStepper.tsx` | `'use client'` — 4-step form |
| `components/list/ListingTierTable.tsx` | Tier comparison table (used on pricing + step 4) |
| `app/list/dashboard/page.tsx` | Syndicator dashboard |
| `components/list/EnquiryPane.tsx` | `'use client'` — enquiry detail (two-pane / drawer) |
| `app/api/list/create-checkout/route.ts` | POST — creates horse + Stripe session |
| `app/api/list/webhook/route.ts` | POST — Stripe webhook handler |
| `app/api/admin/horses/[id]/approve/route.ts` | POST — operator approve action |
| `app/api/admin/horses/[id]/reject/route.ts` | POST — operator reject action |
| `lib/supabase/types.ts` | Add new horse columns |
| `app/admin/page.tsx` | Add moderation queue section |

---

## 10. Compliance checklist

- Horse `status = 'active'` requires `pds_url IS NOT NULL` AND `syndicator.afsl_status = 'verified'`. Enforced in the approve API route (defence in depth on top of the existing DB CHECK constraint).
- Stripe receives only listing-fee payments — never share purchase amounts.
- The webhook handler verifies the Stripe signature on every call.
- `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are server-only env vars — never in `NEXT_PUBLIC_*`.

---

*— spec v1, 2026-04-25*
