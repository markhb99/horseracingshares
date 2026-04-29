# Enquiry handling — implementation spec

> **Status:** v1 (Phase 4 [OPUS]).
> **Audience:** builder implementing the enquiry pipeline.
> **References:** `CLAUDE.md` (compliance rules: forward within 60 s, consent before syndicator share, no share purchases on platform); `docs/design-system.md` §3.2 #3 (EnquiryForm); `docs/db/schema.md` §3.9 (enquiry table), §3.16 (consent_ledger); `lib/auth/consent.ts`, `lib/auth/consent-actions.ts`; `lib/email/resend.ts`; `lib/scoring/compute.ts`.
> **Scope:** `POST /api/enquiries`, the enquiry forward email, the consent-ledger writes, rate limiting, duplicate handling, and lead-score recompute. The EnquiryForm React component is separate (Phase 1 task); this spec defines the server contract that component talks to.

---

## 1. API route — `POST /api/enquiries`

### 1.1 Request schema (Zod)

```ts
// app/api/enquiries/route.ts — top of file
import { z } from 'zod';

const EnquiryRequestSchema = z.object({
  horse_id: z.string().uuid(),
  horse_slug: z.string().min(1).max(200),   // redundant with horse_id, used for audit + email copy
  full_name: z.string().trim().min(2).max(120),
  email: z.string().email().max(254),
  mobile: z
    .string()
    .trim()
    .regex(/^(\+?61|0)4\d{8}$/, 'Must be a valid Australian mobile')
    .transform((v) => v.replace(/\s+/g, '')),
  share_size_pct: z.number().positive().max(100),
  message: z.string().trim().max(2000).optional(),
  marketing_consent: z.boolean(),
  syndicator_share_consent: z.boolean(),
  // Optional third opt-in exposed via the ConsentDrawer. Carried through so the
  // ledger record is written on submit rather than on a separate trip.
  regal_partner_consent: z.boolean().optional(),
});

export type EnquiryRequest = z.infer<typeof EnquiryRequestSchema>;
```

**Auth:** anonymous submissions are permitted. A buyer may enquire before registering. If a session user exists (`supabase.auth.getUser()` returns a user), use their `user_id` directly and skip the create-or-find-by-email step in §1.3.

### 1.2 Response contracts

| Outcome | Status | Body |
|---|---|---|
| Success (new enquiry created + forward scheduled) | 201 | `{ enquiry_id: string, deduped: false }` |
| Duplicate within 7 days (§6) | 200 | `{ enquiry_id: string, deduped: true }` |
| Validation failure | 422 | `{ error: 'Validation failed', issues: z.inferFormattedError[] }` |
| Rate limit hit (§5) | 429 | `{ error: 'You have already sent three enquiries about this horse. Please contact the syndicator directly.', retryAfterSeconds: null }` |
| AFSL gate fail (horse is not active) | 409 | `{ error: 'This horse is not currently accepting enquiries.' }` |
| Server error | 500 | `{ error: 'Unable to record enquiry. Please try again.' }` |

### 1.3 Handler pseudocode

```ts
export async function POST(request: NextRequest) {
  // 0. Parse + validate
  const body = await request.json().catch(() => null);
  const parsed = EnquiryRequestSchema.safeParse(body);
  if (!parsed.success) return json({ error: 'Validation failed', issues: parsed.error.issues }, 422);
  const payload = parsed.data;

  const supabase = await createServiceRoleClient();      // service-role — inserts into enquiry happen via server role per RLS §5.4 note
  const ssr = await createServerClient();                 // SSR — for reading auth.getUser()

  // 1. Resolve user_id — session first, then by email (create or find)
  const { data: { user } } = await ssr.auth.getUser();
  let userId: string;
  if (user) {
    userId = user.id;
  } else {
    userId = await findOrCreateProfileByEmail(supabase, payload.email, payload.full_name);
    // findOrCreateProfileByEmail is defined in §1.4.
  }

  // 2. AFSL/active gate — confirm horse is active + pull syndicator_id + syndicator contact email
  const horse = await supabase
    .from('horse')
    .select('id, slug, name, sire, dam, syndicator_id, status, syndicator:syndicator_id (id, name, contact_email, contact_name, afsl_number)')
    .eq('id', payload.horse_id)
    .is('deleted_at', null)
    .single();
  if (horse.error || !horse.data) return json({ error: 'Horse not found' }, 404);
  if (horse.data.status !== 'active') return json({ error: 'This horse is not currently accepting enquiries.' }, 409);

  // 3. Rate limit — 3 enquiries per email per horse
  const hitLimit = await checkRateLimit(supabase, payload.email, payload.horse_id);
  if (hitLimit) return json({ error: '…', retryAfterSeconds: null }, 429);

  // 4. Dedup — same (user_id, horse_id) within 7 days
  const existing = await findRecentEnquiry(supabase, userId, payload.horse_id);
  if (existing) {
    return json({ enquiry_id: existing.id, deduped: true }, 200);
  }

  // 5. Insert enquiry (status=received, forwarded_at=null)
  const { data: enquiry, error: insertErr } = await supabase
    .from('enquiry')
    .insert({
      user_id: userId,
      horse_id: payload.horse_id,
      syndicator_id: horse.data.syndicator_id,
      contact_name: payload.full_name,
      contact_email: payload.email.toLowerCase(),
      contact_phone: payload.mobile,
      message: payload.message ?? null,
      share_size_interested_pct: payload.share_size_pct,
      consent_marketing_at_submit: payload.marketing_consent,
      consent_share_at_submit: payload.syndicator_share_consent,
      source: 'horse_detail',
      status: 'received',
    })
    .select('id')
    .single();
  if (insertErr || !enquiry) return json({ error: 'Unable to record enquiry. Please try again.' }, 500);

  // 6. Consent-ledger writes (§2) — awaited, inside the request
  await recordEnquiryConsents(userId, payload, ssrHeaders(request));

  // 7. Schedule the forward + lead-score recompute AFTER the response (§4)
  after(async () => {
    await forwardEnquiryToSyndicator(enquiry.id);      // §3
    await recomputeLeadScoreFor(userId);               // §9
  });

  return json({ enquiry_id: enquiry.id, deduped: false }, 201);
}
```

### 1.4 `findOrCreateProfileByEmail`

Anonymous submissions must still produce a `user_profile` row so the enquiry has a `user_id` and the consent-ledger writes have a valid FK.

```ts
async function findOrCreateProfileByEmail(
  supabase: SupabaseServiceClient,
  email: string,
  fullName: string,
): Promise<string> {
  const normalised = email.toLowerCase();

  // Try auth.users first via a server-role query (auth schema requires service role).
  const { data: existingAuth } = await supabase.auth.admin
    .listUsers({ email: normalised });                 // Supabase Admin API
  if (existingAuth?.users?.[0]) {
    const id = existingAuth.users[0].id;
    // Ensure user_profile row exists (self-heal).
    await supabase.from('user_profile').upsert(
      { id, display_name: fullName },
      { onConflict: 'id', ignoreDuplicates: true },
    );
    return id;
  }

  // Create an auth user with no password + email_confirm=false.
  // They remain unverified until they use a magic link; this is deliberate:
  // we capture the enquiry first, earn the verification later via a welcome email.
  const { data: created, error } = await supabase.auth.admin.createUser({
    email: normalised,
    email_confirm: false,
    user_metadata: { created_via: 'enquiry_form' },
  });
  if (error || !created.user) throw new Error(`Cannot create auth user: ${error?.message}`);

  // Insert user_profile (trigger on auth.users should normally do this; be defensive).
  await supabase.from('user_profile').upsert(
    { id: created.user.id, display_name: fullName, role: 'buyer' },
    { onConflict: 'id' },
  );

  return created.user.id;
}
```

**Compliance check on this step:** creating an auth row for an unverified email is acceptable because no password is set, no session is minted, and no marketing is sent until the user confirms via the welcome-sequence magic link (Phase 5 email lifecycle). The enquiry itself is a lawful interest (forwarding to the syndicator under the consent the user just gave). `consent_marketing_at_submit` is false-by-default if the user didn't tick the box, so no marketing sends happen pre-verification.

---

## 2. Consent recording

Per the task brief and CLAUDE.md compliance rules, the enquiry form consents are **account-level**, not per-enquiry. The `enquiry` row already carries immutable snapshots (`consent_marketing_at_submit`, `consent_share_at_submit`) for audit; the ledger carries the live state.

### 2.1 Ledger writes

Call the existing `recordConsent()` helper from `lib/auth/consent.ts`. Note: that helper currently uses `createServerClient()` (SSR) and relies on RLS policy `cl_self_insert`, which requires `auth.uid() = user_id`. **For anonymous enquiries, the user has no session** — the insert would fail under RLS.

**Fix:** the enquiry route must call the ledger via the service role, not via `recordConsent()` as-written. Add a sibling helper:

```ts
// lib/auth/consent.ts — new export
export async function recordConsentAsService(
  userId: string,
  consentType: ConsentType,
  granted: boolean,
  source: string,
  ip?: string | null,
  userAgent?: string | null,
): Promise<string> {
  const supabase = await createServiceRoleClient();      // bypasses RLS
  const { data, error } = await (supabase as any).rpc('record_consent', {
    p_user_id: userId,
    p_consent_type: consentType,
    p_granted: granted,
    p_source: source,
    p_ip: ip ?? null,
    p_user_agent: userAgent ?? null,
  });
  if (error) throw new Error(`record_consent (service) RPC failed: ${error.message}`);
  return data as string;
}
```

Keep `recordConsent()` (the SSR-session version) as-is for preference-page writes. The service-role variant is reserved for routes that must write ledger rows for anonymous users.

### 2.2 Which rows to write on submit

```ts
async function recordEnquiryConsents(
  userId: string,
  payload: EnquiryRequest,
  hdrs: { ip: string | null; userAgent: string | null },
) {
  // Always record what the user ticked — granted OR explicit not-granted.
  // Writing granted=false for unchecked boxes is deliberate: it creates a
  // ledger row proving the user saw the option and declined. That answers
  // a compliance audit better than absence-of-row.
  await recordConsentAsService(
    userId, 'marketing_email', payload.marketing_consent,
    'enquiry_form', hdrs.ip, hdrs.userAgent,
  );
  await recordConsentAsService(
    userId, 'share_with_syndicator_on_enquiry', payload.syndicator_share_consent,
    'enquiry_form', hdrs.ip, hdrs.userAgent,
  );
  if (typeof payload.regal_partner_consent === 'boolean') {
    await recordConsentAsService(
      userId, 'share_with_regal_partner_matches', payload.regal_partner_consent,
      'enquiry_form', hdrs.ip, hdrs.userAgent,
    );
  }
}
```

### 2.3 Consent semantics (mapping to the five types in `lib/auth/consent.ts`)

| UI label on enquiry form | Ledger consent_type | Default |
|---|---|---|
| "Email me about horses matching my preferences" | `marketing_email` | unchecked |
| "Forward my details to the syndicator for this enquiry" | `share_with_syndicator_on_enquiry` | unchecked |
| (ConsentDrawer optional) "Also hear from Regal Bloodstock about matching horses" | `share_with_regal_partner_matches` | unchecked |

**The forwarding pipeline (§3) must not run if `share_with_syndicator_on_enquiry` is false.** This is the load-bearing compliance link. See §3.1.

> **Product question the builder must raise if it hits it:** if `syndicator_share_consent === false`, should the enquiry record still be created? I'm saying yes — the buyer made a declared interest, we keep the on-platform record and the ledger proves they declined forwarding — but we do NOT send the email and we surface the enquiry in the operator's queue as "contact-not-shared". See §3.1 and §8.

---

## 3. Forward pipeline

### 3.1 Gating

Forward only when `payload.syndicator_share_consent === true`. Otherwise:
- Set `enquiry.status = 'received'`, `forwarded_at` stays NULL.
- Operator can see these in the admin console (§8) and, if the buyer re-opts-in later, trigger a manual forward via an admin action (out of scope for this spec).

### 3.2 Email composition

Use the shared `resend` client at `lib/email/resend.ts`. No React Email template — this is an internal operational email, plain HTML is the right choice.

New module: `lib/email/send-enquiry-forward.ts`.

```ts
import { resend, FROM } from '@/lib/email/resend';
import { createServiceRoleClient } from '@/lib/supabase/service';

export interface ForwardResult { ok: true } | { ok: false; error: string };

export async function sendEnquiryForward(enquiryId: string): Promise<ForwardResult> {
  const supabase = await createServiceRoleClient();

  // One query — all columns needed to compose the email.
  const { data: row, error } = await supabase
    .from('enquiry')
    .select(`
      id, created_at, contact_name, contact_email, contact_phone,
      message, share_size_interested_pct,
      horse:horse_id (id, slug, name, sire, dam, location_state),
      syndicator:syndicator_id (id, name, contact_email, contact_name)
    `)
    .eq('id', enquiryId)
    .single();
  if (error || !row) return { ok: false, error: error?.message ?? 'enquiry not found' };

  const horseTitle = row.horse.name ?? `${row.horse.sire} × ${row.horse.dam}`;
  const horseUrl   = `${process.env.NEXT_PUBLIC_SITE_URL}/horse/${row.horse.slug}`;
  const subject    = `New enquiry — ${horseTitle}`;

  const text = [
    `New enquiry via horseracingshares.com`,
    ``,
    `Horse:        ${horseTitle}`,
    `Listing:      ${horseUrl}`,
    ``,
    `Buyer name:   ${row.contact_name}`,
    `Email:        ${row.contact_email}`,
    `Mobile:       ${row.contact_phone ?? '—'}`,
    `Share size:   ${row.share_size_interested_pct}%`,
    ``,
    `Message:`,
    row.message ? row.message : '(no message provided)',
    ``,
    `Submitted:    ${new Date(row.created_at).toISOString()}`,
    ``,
    `This enquiry was forwarded under the buyer's explicit consent recorded at submit.`,
    `Reply directly to the buyer — horseracingshares.com does not mediate further contact.`,
  ].join('\n');

  const html = `
    <div style="font-family: -apple-system, system-ui, sans-serif; color:#1A1A1A; max-width:600px; margin:0 auto; padding:24px;">
      <h2 style="font-family: Georgia, serif; margin:0 0 16px; color:#0E1E3A;">New enquiry — ${escapeHtml(horseTitle)}</h2>
      <p style="margin:0 0 12px;">A buyer has enquired about your listing.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; border-collapse:collapse; margin:16px 0;">
        <tr><td style="padding:4px 0; color:#2D2D2D; width:140px;">Horse</td><td style="padding:4px 0;"><a href="${horseUrl}" style="color:#0E1E3A;">${escapeHtml(horseTitle)}</a></td></tr>
        <tr><td style="padding:4px 0; color:#2D2D2D;">Buyer name</td><td style="padding:4px 0;">${escapeHtml(row.contact_name)}</td></tr>
        <tr><td style="padding:4px 0; color:#2D2D2D;">Email</td><td style="padding:4px 0;"><a href="mailto:${escapeHtml(row.contact_email)}" style="color:#0E1E3A;">${escapeHtml(row.contact_email)}</a></td></tr>
        <tr><td style="padding:4px 0; color:#2D2D2D;">Mobile</td><td style="padding:4px 0;">${escapeHtml(row.contact_phone ?? '—')}</td></tr>
        <tr><td style="padding:4px 0; color:#2D2D2D;">Share size</td><td style="padding:4px 0;">${row.share_size_interested_pct}%</td></tr>
        <tr><td style="padding:4px 0; color:#2D2D2D;">Submitted</td><td style="padding:4px 0;">${new Date(row.created_at).toLocaleString('en-AU')}</td></tr>
      </table>
      ${row.message ? `<div style="border-left:3px solid #B8893E; padding:8px 12px; background:#FAF7F2; margin:16px 0;"><strong>Message:</strong><br/>${escapeHtml(row.message).replace(/\n/g, '<br/>')}</div>` : ''}
      <p style="font-size:13px; color:#2D2D2D; margin-top:24px;">Reply directly to the buyer's email. Horse Racing Shares does not mediate contact after this forward.</p>
      <p style="font-size:13px; color:#2D2D2D;">This enquiry was forwarded under the buyer's explicit consent recorded at submit.</p>
    </div>
  `;

  const sendRes = await resend.emails.send({
    from: FROM,
    to: row.syndicator.contact_email,
    replyTo: row.contact_email,
    subject,
    text,
    html,
  });

  if (sendRes.error) return { ok: false, error: sendRes.error.message };
  return { ok: true };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
```

**`replyTo: row.contact_email`** — a syndicator hitting "reply" in Gmail replies to the buyer directly. This is the single affordance that carries the whole forward flow.

### 3.3 Recording the outcome

```ts
// In the route, called from after():
async function forwardEnquiryToSyndicator(enquiryId: string) {
  const supabase = await createServiceRoleClient();

  // Bail if the syndicator_share consent was false — defence in depth on top
  // of the route-level gate. Read the snapshot from the enquiry row itself.
  const { data: enq } = await supabase
    .from('enquiry')
    .select('consent_share_at_submit')
    .eq('id', enquiryId)
    .single();
  if (!enq || !enq.consent_share_at_submit) return;

  const result = await sendEnquiryForward(enquiryId);

  if (result.ok) {
    await supabase.from('enquiry').update({
      forwarded_to_syndicator_at: new Date().toISOString(),
      status: 'forwarded',
      forward_error: null,
      forward_failed_at: null,
    }).eq('id', enquiryId);
  } else {
    await supabase.from('enquiry').update({
      forward_failed_at: new Date().toISOString(),
      status: 'failed',
      forward_error: result.error.slice(0, 500),
    }).eq('id', enquiryId);
  }
}
```

**No automatic retry.** Per the task brief: the operator triages failures from the admin console (§8) and resends manually. A background retry queue becomes a Phase 5 workstream if the failure rate warrants it; it is out of scope here.

---

## 4. Timing — `after()` pattern

CLAUDE.md mandates forward-within-60s. On Vercel serverless, Next.js 15's `after()` from `next/server` runs work after the response is committed, still within the serverless function's lifecycle. This is the right primitive.

### 4.1 Exact usage

```ts
import { after } from 'next/server';

// Inside the POST handler, after successfully inserting the enquiry:
after(async () => {
  try {
    await forwardEnquiryToSyndicator(enquiry.id);
  } catch (err) {
    // Log — but do NOT re-throw; the response is already committed.
    console.error('[enquiry] forward failed', enquiry.id, err);
  }
  try {
    await recomputeLeadScoreFor(userId);
  } catch (err) {
    console.error('[enquiry] lead-score recompute failed', userId, err);
  }
});

return json({ enquiry_id: enquiry.id, deduped: false }, 201);
```

**Constraints to verify at build:**

- `export const runtime = 'nodejs';` on the route (Resend and service-role Supabase need Node runtime, not Edge).
- Vercel function timeout ≥ 30 s (default 10 s on Hobby is fine; `after()` work extends the billable duration, not the response latency).
- `after()` executes even on 4xx responses — wrap both branches that call `after()` in conditional checks so failed validation doesn't kick off a forward.

### 4.2 Why not a worker

The project has a `workers/` dir (git status confirms this), but routing enquiry forwards through a worker queue adds a network hop, a queue service dependency, and a monitoring surface for a send that completes in 200-500 ms inline. `after()` is the right tool here. If we ever batch forwards (e.g. aggregating multiple enquiries into a single daily digest for a high-volume syndicator — unlikely), the worker becomes justified.

---

## 5. Rate limiting — 3 enquiries per email per horse

```ts
async function checkRateLimit(
  supabase: SupabaseServiceClient,
  email: string,
  horseId: string,
): Promise<boolean> {
  const { count, error } = await supabase
    .from('enquiry')
    .select('*', { count: 'exact', head: true })
    .eq('contact_email', email.toLowerCase())
    .eq('horse_id', horseId)
    .is('deleted_at', null);
  if (error) throw new Error(`rate-limit check failed: ${error.message}`);
  return (count ?? 0) >= 3;
}
```

### 5.1 Why this count, not a time window

Lifetime count of 3 per `(email, horse_id)` is the simplest rule the compliance team can audit. A user legitimately needs 1-2 enquiries (maybe clarifying a question after the syndicator's reply); 3 is an upper bound, 4+ is noise or abuse. No time window complicates the mental model without meaningful upside.

### 5.2 Additional abuse controls not in scope here

- No captcha at v1 (design-system.md §3.2 #3 explicit).
- Honeypot field on the EnquiryForm (component concern).
- Cloudflare Turnstile if abuse emerges (operational concern).

### 5.3 Response when hit

```json
{
  "error": "You have already sent three enquiries about this horse. Please contact the syndicator directly — their details are on the horse listing page.",
  "retryAfterSeconds": null
}
```

Status 429. `retryAfterSeconds: null` because the limit is lifetime, not a window.

---

## 6. Duplicate handling

Same `(user_id, horse_id)` pair within 7 days → return existing enquiry with 200 + `deduped: true`. No forward email resent.

```ts
async function findRecentEnquiry(
  supabase: SupabaseServiceClient,
  userId: string,
  horseId: string,
): Promise<{ id: string } | null> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('enquiry')
    .select('id, created_at')
    .eq('user_id', userId)
    .eq('horse_id', horseId)
    .gte('created_at', sevenDaysAgo)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`dedup check failed: ${error.message}`);
  return data ? { id: data.id } : null;
}
```

### 6.1 Race condition

Two near-simultaneous submits from the same user hitting two serverless instances can both see "no recent enquiry" and both insert. Mitigation: a **partial unique index** on `enquiry (user_id, horse_id)` where `created_at > now() - interval '7 days'`. Postgres supports partial indexes but not time-bounded uniqueness natively — so instead enforce at INSERT via a BEFORE trigger that raises on dedupe, and catch the raise in the route to return the existing row.

Add to migrations:

```sql
-- Add after the enquiry table exists. Timestamp the migration appropriately.
CREATE OR REPLACE FUNCTION enforce_enquiry_dedup() RETURNS trigger AS $$
DECLARE
  existing_id UUID;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;                          -- anonymous path handled by findOrCreate upstream
  END IF;
  SELECT id INTO existing_id
    FROM enquiry
   WHERE user_id  = NEW.user_id
     AND horse_id = NEW.horse_id
     AND deleted_at IS NULL
     AND created_at > now() - interval '7 days'
   LIMIT 1;
  IF existing_id IS NOT NULL THEN
    RAISE EXCEPTION 'duplicate enquiry within 7 days (existing_id=%)', existing_id
      USING ERRCODE = 'unique_violation', HINT = existing_id::text;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enquiry_dedup_trigger
  BEFORE INSERT ON enquiry
  FOR EACH ROW EXECUTE FUNCTION enforce_enquiry_dedup();
```

Route-side: if the insert throws `unique_violation` with the dedup `HINT`, look up the existing enquiry and return 200 + `deduped: true`.

---

## 7. `enquiry` table columns

The schema (§3.9) defines most of what's needed but is missing three columns the forward pipeline requires and a `status` enum value. Ship a migration in Phase 4.

### 7.1 Migration — `supabase/migrations/20260425120000_enquiry_forward_columns.sql`

```sql
-- Enum for enquiry status (received → forwarded | failed).
-- Kept separate from enquiry_outcome which tracks post-forward lifecycle.
CREATE TYPE enquiry_status AS ENUM ('received', 'forwarded', 'failed');

ALTER TABLE enquiry
  ADD COLUMN status             enquiry_status NOT NULL DEFAULT 'received',
  ADD COLUMN forward_failed_at  TIMESTAMPTZ,
  ADD COLUMN forward_error      TEXT;

-- Back-fill existing rows: if forwarded_to_syndicator_at IS NOT NULL, status='forwarded'.
UPDATE enquiry
   SET status = 'forwarded'
 WHERE forwarded_to_syndicator_at IS NOT NULL;

CREATE INDEX enquiry_status_idx ON enquiry(status) WHERE deleted_at IS NULL;
CREATE INDEX enquiry_failed_idx ON enquiry(forward_failed_at DESC)
  WHERE forward_failed_at IS NOT NULL AND deleted_at IS NULL;
```

### 7.2 Final column set relevant to this spec

From schema.md §3.9 + the additions above:

| Column | Type | Purpose |
|---|---|---|
| `id` | UUID PK | Primary key. |
| `user_id` | UUID FK | Submitting user (always populated; findOrCreate fills anonymous cases). |
| `horse_id` | UUID FK | Target horse. |
| `syndicator_id` | UUID FK | Denormalised for routing the forward email. |
| `contact_name` | TEXT | Snapshot — survives user deletion. |
| `contact_email` | CITEXT | Lower-cased on insert. |
| `contact_phone` | TEXT | AU mobile, stored without spaces after zod transform. |
| `message` | TEXT | Optional. |
| `share_size_interested_pct` | NUMERIC(5,2) | The share size requested. |
| `consent_marketing_at_submit` | BOOL | Immutable snapshot. |
| `consent_share_at_submit` | BOOL | Immutable snapshot. Drives the forward gate. |
| `source` | TEXT | `'horse_detail'` for v1; future UTM capture wires here. |
| `created_at` | TIMESTAMPTZ | Auto. |
| `forwarded_to_syndicator_at` | TIMESTAMPTZ | Set on successful Resend send. |
| `forward_failed_at` | TIMESTAMPTZ | **New.** Set on Resend failure. |
| `forward_error` | TEXT | **New.** Error string, ≤ 500 chars. |
| `status` | enquiry_status | **New.** `received`/`forwarded`/`failed`. |
| `outcome` | enquiry_outcome | Existing. Post-contact lifecycle (`contacted`/`share_purchased`/…), updated by the syndicator dashboard. Distinct from `status`. |

### 7.3 Why `status` and `outcome` are both needed

- **`status`** is platform-facing: did the forward email go out?
- **`outcome`** is syndicator-facing: what happened in the relationship after the forward?

Conflating them was tempting but wrong — the syndicator mutates `outcome` via RLS policy `enq_syndicator_outcome`; `status` is system-owned.

---

## 8. Admin visibility — query for failed forwards

The admin console at `/admin` gets a new section "Failed forwards". SQL (or the Supabase JS equivalent):

```sql
SELECT
  e.id,
  e.created_at,
  e.forward_failed_at,
  e.forward_error,
  e.contact_name,
  e.contact_email,
  e.message,
  h.slug             AS horse_slug,
  h.name             AS horse_name,
  h.sire, h.dam,
  s.name             AS syndicator_name,
  s.contact_email    AS syndicator_email
FROM enquiry e
  JOIN horse h      ON h.id = e.horse_id
  JOIN syndicator s ON s.id = e.syndicator_id
WHERE e.status = 'failed'
  AND e.deleted_at IS NULL
ORDER BY e.forward_failed_at DESC
LIMIT 50;
```

Also surface `status = 'received' AND consent_share_at_submit = false` as a separate row — these are enquiries we legitimately did not forward, and the operator should see them to decide whether to re-engage the buyer with a "would you like us to share this after all?" follow-up (the follow-up itself is out of Phase 4 scope).

### 8.1 Operator action — manual resend

Out of scope for this spec. File as a follow-up task: "Admin action — resend failed enquiry forward". When built, it must re-check `consent_share_at_submit` before sending.

---

## 9. Lead scoring integration

After a successful enquiry + forward, recompute the buyer's `lead_score`.

### 9.1 Shape of the call

`lib/scoring/compute.ts` exports the pure `computeLeadScore(signals)` function. It needs:

```ts
interface LeadScoreSignals {
  budgetMaxCents: number | null;
  enquiryCount90d: number;
  saveCount30d: number;
  pdsDownloadCount30d: number;
  costCalcCount30d: number;
  dwellEvents30d: Array<{ dwellMs: number | null }>;
  distinctSessions30d: number;
  daysSinceLastView: number;
}
```

All signals come from Supabase — three `count` queries on `enquiry`/`view_event`, one fetch from `user_profile` for budget. Each is fast (indexes exist per schema.md §3.15 + §3.9).

### 9.2 Recommended implementation

Thin wrapper in `lib/scoring/recompute.ts`:

```ts
import { createServiceRoleClient } from '@/lib/supabase/service';
import { computeLeadScore } from '@/lib/scoring/compute';

export async function recomputeLeadScoreFor(userId: string): Promise<void> {
  const supabase = await createServiceRoleClient();
  const since90 = new Date(Date.now() - 90 * 86400_000).toISOString();
  const since30 = new Date(Date.now() - 30 * 86400_000).toISOString();

  // Run in parallel.
  const [profileRes, enq90Res, saves30Res, pds30Res, calc30Res, dwell30Res, sessions30Res, lastViewRes] =
    await Promise.all([
      supabase.from('user_profile').select('budget_max_cents').eq('id', userId).maybeSingle(),
      supabase.from('enquiry').select('*', { count: 'exact', head: true })
        .eq('user_id', userId).gte('created_at', since90).is('deleted_at', null),
      supabase.from('view_event').select('*', { count: 'exact', head: true })
        .eq('user_id', userId).eq('event_type', 'save').gte('occurred_at', since30),
      supabase.from('view_event').select('*', { count: 'exact', head: true })
        .eq('user_id', userId).eq('event_type', 'pds_download').gte('occurred_at', since30),
      supabase.from('view_event').select('*', { count: 'exact', head: true })
        .eq('user_id', userId).eq('event_type', 'cost_calc').gte('occurred_at', since30),
      supabase.from('view_event').select('dwell_ms')
        .eq('user_id', userId).eq('event_type', 'view').gte('occurred_at', since30),
      supabase.rpc('distinct_sessions_30d', { p_user_id: userId }),   // see §9.3
      supabase.from('view_event').select('occurred_at')
        .eq('user_id', userId).order('occurred_at', { ascending: false }).limit(1).maybeSingle(),
    ]);

  const signals = {
    budgetMaxCents: profileRes.data?.budget_max_cents ?? null,
    enquiryCount90d: enq90Res.count ?? 0,
    saveCount30d: saves30Res.count ?? 0,
    pdsDownloadCount30d: pds30Res.count ?? 0,
    costCalcCount30d: calc30Res.count ?? 0,
    dwellEvents30d: (dwell30Res.data ?? []).map(r => ({ dwellMs: r.dwell_ms })),
    distinctSessions30d: sessions30Res.data ?? 0,
    daysSinceLastView: lastViewRes.data
      ? Math.floor((Date.now() - new Date(lastViewRes.data.occurred_at).getTime()) / 86400_000)
      : 999,
  };

  const { score, band } = computeLeadScore(signals);

  await supabase.from('lead_score').upsert({
    user_id: userId,
    score,
    band,
    last_enquiry_at: new Date().toISOString(),        // we just submitted
    enquiry_count_90d: signals.enquiryCount90d,
    declared_budget_cents: signals.budgetMaxCents,
    computed_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
}
```

### 9.3 `distinct_sessions_30d` RPC

A small SQL function because Supabase's PostgREST doesn't expose `count(distinct ...)`:

```sql
CREATE OR REPLACE FUNCTION distinct_sessions_30d(p_user_id UUID)
RETURNS INTEGER
LANGUAGE sql STABLE AS $$
  SELECT COUNT(DISTINCT session_id)::int
    FROM view_event
   WHERE user_id = p_user_id
     AND occurred_at > now() - interval '30 days';
$$;
```

Add to the migration file.

### 9.4 Why not a Postgres RPC for the whole recompute

Mark's memory note: Phase 2 already ships `computeLeadScore()` as a pure TS function with Vitest coverage. Duplicating the logic in SQL now would split the source of truth before the SQL version is proven. Call the TS function from the route — the SQL `recompute_lead_score()` in `20260422120700_lead_score_function.sql` is a future-worker concern (nightly rebuilds). At that point we port the TS logic to SQL and delete the TS wrapper.

### 9.5 Error handling

If recompute throws (e.g. RPC missing in a fresh env), the `after()` handler logs and continues. The enquiry itself is already saved + forwarded; stale lead-score is acceptable for minutes.

---

## 10. Files to create / edit

### 10.1 Create

| Path | Purpose |
|---|---|
| `app/api/enquiries/route.ts` | The POST handler per §1. |
| `lib/email/send-enquiry-forward.ts` | Composes + sends the forward email per §3.2. |
| `lib/scoring/recompute.ts` | Wrapper around `computeLeadScore` per §9.2. |
| `supabase/migrations/20260425120000_enquiry_forward_columns.sql` | Adds `status` enum, `forward_failed_at`, `forward_error` per §7.1. |
| `supabase/migrations/20260425120100_enquiry_dedup_trigger.sql` | Adds `enforce_enquiry_dedup()` + trigger per §6.1. |
| `supabase/migrations/20260425120200_distinct_sessions_rpc.sql` | Adds `distinct_sessions_30d()` function per §9.3. |
| `lib/supabase/service.ts` *(if not already present)* | Service-role client factory. The repo has `server.ts` for SSR; verify whether a service-role factory exists and create if not. |

### 10.2 Edit

| Path | Change |
|---|---|
| `lib/auth/consent.ts` | Add `recordConsentAsService()` per §2.1. |
| `app/admin/page.tsx` | Add "Failed forwards" card per §8. |
| `tests/` (new: `tests/enquiries-api.test.ts`) | Vitest integration covering validation, dedup, rate limit, consent-ledger writes, forward-gate when `syndicator_share_consent=false`, 429 response, 429 count. |

---

## 11. Acceptance criteria

1. Anonymous POST with valid body returns 201 + `{ enquiry_id, deduped: false }` within 300 ms p95 (measured locally with Resend stubbed).
2. `enquiry` row exists with `status='received'` immediately; within 10 s `status` updates to `'forwarded'` and `forwarded_to_syndicator_at` is populated.
3. Forward email arrives at the syndicator's `contact_email` address with `replyTo` set to the buyer's email, plain-text and HTML versions both populated, horse and buyer details correct.
4. Same buyer re-submitting within 7 days returns 200 + existing `enquiry_id`; no second email is sent; only one enquiry row exists.
5. Fourth submit from the same email on the same horse returns 429 with the rate-limit copy; row count stays at 3.
6. Unchecking `syndicator_share_consent` results in: enquiry row created, no forward email sent, `status='received'`, ledger row shows `granted=false` for `share_with_syndicator_on_enquiry`, admin query in §8 can see the enquiry as "contact not shared".
7. A Resend API failure (simulated by returning an error) sets `status='failed'`, `forward_error` populated with the error message truncated to 500 chars; admin console surfaces the row.
8. After successful submit, `lead_score` row exists/updates for the user with `enquiry_count_90d` incremented by 1.
9. Consent-ledger writes are append-only: submitting twice writes four (or six with Regal opt-in) ledger rows total, not two.
10. Zod validation on bad input (missing email, malformed mobile) returns 422 with field-level issues.

---

## 12. Failure modes and mitigations

| Mode | Mitigation |
|---|---|
| Resend transient 5xx. | `status='failed'`, `forward_error` set, admin can resend manually. No automatic retry at v1. |
| `syndicator.contact_email` is null or invalid. | Validation at syndicator onboarding (not this spec's responsibility) guarantees not-null via `syndicator.contact_email NOT NULL` CHECK. If it is somehow empty, Resend rejects and we hit the failure path above. |
| Race: two simultaneous submits from the same user + horse within 7 days. | Postgres dedup trigger in §6.1 raises `unique_violation` on the second; route catches and returns 200 + existing id. |
| Race: two simultaneous submits from the same email on a horse at count 2 → both pass the rate-limit check and insert, pushing count to 4. | Acceptable edge. The rate limit is a soft gate, not a hard unique constraint. If this becomes a real abuse vector we upgrade to a Postgres advisory lock keyed on `(email, horse_id)` in the route. Not worth the complexity at v1. |
| `user_profile` row missing when consent-ledger write fires (FK violation). | `findOrCreateProfileByEmail` upserts the row before consent writes run. If the Supabase auth-user-created trigger also populates `user_profile`, the upsert is idempotent. |
| Anonymous enquiry → user later signs up with the same email. | Supabase auth already dedupes by email; the existing `user_profile` row (created by `findOrCreateProfileByEmail`) is inherited. Enquiries remain associated. No migration needed. |
| `after()` task fails mid-forward (e.g. function timeout). | Response already sent. Forward marked `failed` or simply never updates from `received`. Admin console lists both states. |
| Malicious payload in `message` (HTML, scripts). | Escaped via `escapeHtml()` in the HTML email body; stored as plain text in DB; never rendered via `dangerouslySetInnerHTML` anywhere. Zod caps length at 2000 chars. |
| Horse becomes inactive between page render and submit. | AFSL gate check in §1.3 step 2 re-verifies `status='active'` at submit time. Returns 409 with a buyer-readable message. |
| Regal-partner consent ticked for a horse that is not a Regal listing. | The consent is account-level, not per-horse. Writing it once is correct. Future outreach filtering is the Regal-funnel worker's concern. |
| RLS blocks service-role insert into `enquiry`. | Service role bypasses RLS by design. The route uses `createServiceRoleClient()` explicitly; `createServerClient()` (SSR) would fail for anonymous submits. |
| Email address with a `+` alias treated differently from the bare form. | `email.toLowerCase()` only; no alias stripping. Compliance position: aliases are distinct identities unless the user tells us otherwise. |
| Rate-limit check is on `contact_email`, dedup check is on `user_id`. Divergence? | Intentional. Rate limit defends against abuse (same email, multiple identities); dedup defends against double-submits (same session, same horse). Layered, not redundant. |

---

## 13. Compliance check-in (CLAUDE.md)

- **Forward within 60 s** — satisfied by `after()` running inline post-response on the same serverless invocation. p99 latency is bounded by Resend's SLA (~200-2000 ms).
- **Consent before syndicator share** — enforced at two layers: (a) route-level gate in §3.1, (b) `forwardEnquiryToSyndicator` re-reads `consent_share_at_submit` from the enquiry row before dispatching (§3.3).
- **On-platform capture first, off-platform forward second** — the enquiry row is inserted before any email is queued. Even if Resend is down, we own the data.
- **Not an issuer** — no money, no share purchase, no escrow. The email is a lead forward, full stop.
- **No automated marketing from this route** — marketing sends are the province of the Phase 5 email lifecycle worker, which reads `consent_ledger.current_consent()` at send time. This route only writes the ledger.
- **Footer disclaimer copy** — not this spec's concern; shipped by the Footer component.

Addisons sign-off (Phase 8) will review the forward email copy, the consent microcopy inside the drawer, and the three consent types. Keep the email template's compliance line (*"This enquiry was forwarded under the buyer's explicit consent…"*) as a single source string in `content/compliance.ts` per the residual-risk note in `docs/design-system.md` — that way a legal rewrite is a one-file diff, not a component edit.

---

## 14. Handoff to builder

Implement in this order so each step is independently testable:

1. **Migrations first.** Ship the three SQL files (§7.1, §6.1, §9.3) and run them against local Supabase.
2. **Service-role helper.** Confirm `lib/supabase/service.ts` exists (create if not). Do not commit any service-role env var; read from `process.env.SUPABASE_SERVICE_ROLE_KEY`.
3. **`recordConsentAsService()`** in `lib/auth/consent.ts`. Unit test it by mocking the RPC.
4. **`sendEnquiryForward()`** in `lib/email/send-enquiry-forward.ts`. Unit test with the Resend mock.
5. **`recomputeLeadScoreFor()`** in `lib/scoring/recompute.ts`. Unit test against a seeded user.
6. **`POST /api/enquiries`** route. Integration-test the happy path, the dedup, the rate limit, the consent-off no-forward branch.
7. **Admin query** on `/admin` for the "Failed forwards" card.
8. **Playwright E2E** for the full form-submit flow once the EnquiryForm component lands.

Do not expand scope beyond §10. Specifically: do not build a retry queue, do not build the admin manual-resend action, do not wire PostHog events from this route (that happens in the view-event pipeline, separate ticket).

If anything is ambiguous — particularly around service-role vs SSR client boundaries, or the Regal-consent drawer opt-in's exact label — bounce back to the architect before guessing.

*— architect, 2026-04-25*
