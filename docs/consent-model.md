# Consent model — horseracingshares

> **Status:** v1 (2026-04-22). Phase 2 architect spec.
> **Audience:** the builder implementing `/account/preferences`, the enquiry form, and the consent ledger writer.
> **Scope:** what we ask, when we ask it, how we record it, how we honour revocations, how we audit.

The data schema for consent lives in `docs/db/schema.md` §3.16 (`consent_ledger`, append-only). This document covers what those rows *mean* and the UI flow that produces them.

---

## 1. Principles

- **Opt-in, never opt-out.** No pre-ticked boxes. Australian Privacy Act + Spam Act compliance requires express consent for marketing and for onward sharing.
- **Granular.** Five independent consent types (§2). A user can grant marketing email without granting SMS or partner-sharing.
- **Revocable from one page.** `/account/preferences` is the canonical revoke surface; an unsubscribe link in every marketing email reaches it in one click.
- **Immutable audit.** Every grant and revoke appends a `consent_ledger` row. We never UPDATE — we only INSERT, so "what was this user's consent at time T" is always answerable. Enforced by the append-only trigger in `20260422120500_afsl_gate.sql`.
- **Disclosed at point of capture.** The consent control never stands alone — it's always accompanied by a one-sentence plain-English description of what the user is agreeing to.

---

## 2. The five consent types

| `consent_type`                        | What it means                                                                 | Default |
|---|---|---|
| `marketing_email`                     | We send newsletters, shortlists, and promotional emails.                       | false   |
| `marketing_sms`                       | We send SMS for urgent listing alerts and account security only.               | false   |
| `share_with_syndicator_on_enquiry`    | Your enquiry (name, email, phone, message) is forwarded to the listing syndicator. | required at enquiry time — enquiry cannot be submitted without it |
| `share_with_regal_partner_matches`    | Regal Bloodstock may contact you with matched horses from their own stable. This is the Regal disclosure in action. | false, with explicit Regal-relationship explainer next to the checkbox |
| `analytics_session_replay`            | PostHog records an anonymised replay of your session for UX analysis.          | false   |

`share_with_syndicator_on_enquiry` is the one non-optional consent in the system — without it we cannot deliver the product feature the user just asked for (the enquiry). The form makes it visible, not hidden: "To send this enquiry, we'll share your name, email, and message with {Syndicator Name}. [✓] I agree."

Everything else defaults to **false** and stays false unless the user explicitly opts in.

---

## 3. Capture moments

### 3.1 Signup (`/signup` and first-enquiry-as-signup)

Below the email field, three opt-in checkboxes, each unticked, each with disclosure text:

```
┌──────────────────────────────────────────────────────────────────┐
│  [ ] Send me the weekly Shortlist                                 │
│      Horses matched to what you've been looking at. Unsubscribe   │
│      any time.                                                    │
│                                                                   │
│  [ ] Let Regal Bloodstock contact me with matched horses          │
│      Horse Racing Shares is owned by Regal Bloodstock. If this is │
│      ticked, Regal may email you horses from their own stable.    │
│      Learn more in /about.                                        │
│                                                                   │
│  [ ] Allow session replay for UX research                         │
│      An anonymised video of your clicks. Never sold. Disable any  │
│      time in Preferences.                                         │
└──────────────────────────────────────────────────────────────────┘
```

Each unticked box generates **no** `consent_ledger` row at signup — absence of a consent is not a consent record. A ticked box generates `(consent_type, granted=true, source='signup', ip, user_agent)`.

### 3.2 Enquiry submission

The enquiry form shows the one mandatory consent (syndicator share) plus a separate optional consent for post-enquiry marketing:

```
[✓] Share my enquiry with {Syndicator Name}. Required.
[ ] Keep me posted about similar horses.    (optional)
```

On submit we append:
- `share_with_syndicator_on_enquiry, granted=true` — guaranteed (required to submit).
- `marketing_email, granted=true` — only if the user ticked the second box.
- Plus we snapshot both values onto the `enquiry` row itself (`consent_marketing_at_submit`, `consent_share_at_submit`) so the enquiry record carries the consent state at the moment of submission, immutable even if the user later revokes.

### 3.3 Preferences page (`/account/preferences`)

Shows all five consents as toggles, each with:
- Current state (from `current_consent(user_id)`).
- Plain-English description (same as at capture).
- The date the current state was granted or revoked ("last changed 14/04/2026").
- A link to the Privacy Policy section explaining that consent.

Flipping a toggle appends a new `consent_ledger` row with `source='preferences_page'`. We never edit the existing row.

### 3.4 Unsubscribe link in emails

Every marketing email has a one-click unsubscribe link `{site}/unsubscribe?token=...` that, on visit:

- Appends `(marketing_email, granted=false, source='email_unsub_link')` (or `marketing_sms` / `share_with_regal_partner_matches` depending on which email type).
- Shows a confirmation page with a "You've been unsubscribed — manage all preferences here" link to `/account/preferences`.
- Does NOT require login. Token is scoped to the single user + consent type.

This is the legally-required single-click unsubscribe under the Spam Act.

---

## 4. Enforcement points

- **Email send.** Before dispatching any marketing email, the sender worker calls `current_consent(user_id)` and skips users without `marketing_email = true`. Applies to the newsletter, saved-search alerts, and Regal partner-match emails.
- **Enquiry forward.** The API route verifies the enquiry's `consent_share_at_submit` is true before calling the Resend handler. No consent → hard 422 (should never happen because the form blocks submission, but belt-and-braces).
- **Session replay.** PostHog's `session_recording: { enabled: false }` by default; we flip to enabled only when `analytics_session_replay = true`. Checked client-side on PostHog init and again server-side on every fetch for the user.
- **Regal partner outreach.** The hot-lead matching job filters users to those with `share_with_regal_partner_matches = true` before writing a matched-contact row. Without this consent, even a fire-band lead is never passed to Regal — matches the "no passing leads without explicit consent" rule in CLAUDE.md.

---

## 5. Operator view

From `/admin/consent`, an operator can:
- Look up the current consent state for a given user.
- See the full consent ledger for that user (immutable audit trail).
- Search for users who revoked a given consent in the last 30 days (compliance monitoring).

Operators cannot edit consent. If a user emails support saying "please unsubscribe me from everything," the operator triggers a service-role script that appends revocation rows on their behalf, sourced as `source='support_request:{ticket_id}'`. The appended rows are attributable in the audit log.

---

## 6. Account deletion

When a user requests account deletion (`/account/delete` → 30-day grace, then hard delete):

1. Day 0: soft-delete `user_profile.deleted_at = now()`. Append `(every_consent_type, granted=false, source='account_delete_requested')`.
2. Day 30: cascade hard-delete of `user_profile` → Postgres FKs handle `saved_search`, `consent_ledger`, `lead_score`, `view_event`.
3. `enquiry` rows are NOT cascade-deleted — they're legally retained for the syndicator's compliance trail. Personal contact fields on those rows are nulled and replaced with `'[deleted]'` placeholders. The enquiry's `consent_*_at_submit` snapshot stays.

---

## 7. What's out of scope

- **Cookie banner.** We don't use non-essential cookies without consent (analytics is opt-in, marketing cookies aren't used pre-consent). No banner required in v1. Revisit if we add third-party tags.
- **GDPR data export / portability.** The app is Australian-market. If EU residency edge cases emerge, add `/account/data-export` (JSON dump of user_profile + enquiries + saved_searches + consent_ledger).
- **Age verification.** 18+ gate is handled on signup ("I confirm I am over 18" checkbox, immutable boolean on `user_profile`), not via the consent ledger. Same enforcement mechanism as a consent flag but separate concept — gambling-adjacent products require age attestation regardless of marketing preferences.

---

*— architect (v1, 2026-04-22)*
