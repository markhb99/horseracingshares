# Auth flow — horseracingshares

> **Status:** v1 (2026-04-22). Phase 2 architect spec.
> **Audience:** the builder implementing `/login`, `/signup`, `/account` shells, Supabase client helpers, middleware, and role-based redirects.
> **Scope:** authentication, session handling, role separation. Authorisation (RLS) lives in `docs/db/schema.md` §5.

---

## 1. Principles

- **Email is the identity.** We never ask for a username. `auth.users.email` is canonical.
- **Magic link primary, password optional.** First-time friction is the enemy. Password login is offered as a secondary path on the same screen for users who prefer it.
- **One account model.** Every human is a `user_profile` row keyed to `auth.users.id`. The `role` column (`buyer | syndicator | operator`) determines UI routing. A single user can belong to multiple syndicators via `syndicator_user`.
- **Session in HttpOnly cookies.** We use `@supabase/ssr` for App Router. No tokens in localStorage.
- **Server components first.** The app shell reads session server-side via `createServerClient`. Only client-interactive surfaces (login form, consent toggles) use `createBrowserClient`.
- **Fail closed.** Missing session → redirect to `/login?next=...`. Role mismatch → `/403`. Never render a protected page with a degraded view.

---

## 2. User paths

### 2.1 Buyer signup (default)

```
/horse/{slug}  ──(click "Enquire")──▶ /enquiry/{slug}     (no auth required)
                                               │
                                  (submit with contact email)
                                               │
           email delivered  ◀──── Supabase auth.sendMagicLink ─── POST /api/enquiry
                 │
       click magic link
                 │
                 ▼
   /auth/callback?code=...   ──▶ exchangeCodeForSession ──▶ /account/welcome
                                                                 │
                                                    create user_profile if missing
                                                                 │
                                                                 ▼
                                                       original enquiry ✓
```

First enquiry double-dips as signup: we capture the contact details for the enquiry, send a magic link, and create the `user_profile` row on callback. The enquiry is already stored; the magic link just binds it to a durable account.

### 2.2 Direct signup (`/signup`)

Single form: email + optional preferences. Submit triggers magic link. Same callback flow as 2.1 but lands at `/account/onboarding` where the buyer fills out the profile (state, budget range, preferred sires) before seeing their dashboard.

### 2.3 Syndicator invitation

Operators (Regal staff) invite syndicator admins from the admin panel: creates `syndicator_user` row with `invited_at`, generates a token, and sends an invite email with a link to `/syndicator/accept?token=...`.

```
operator invites ──▶ POST /api/admin/syndicator/invite
                           │
                    creates syndicator_user(invited_at, accepted_at=NULL)
                    sends email via Resend
                           │
       invitee clicks ──▶ /syndicator/accept?token=...
                           │
                    validates token → sends magic link
                           │
            magic link ──▶ /auth/callback?code=...
                           │
                    callback flips syndicator_user.accepted_at = now()
                    sets user_profile.role = 'syndicator'
                           │
                           ▼
                  /syndicator/dashboard
```

### 2.4 Return login

`/login`:

- Email input + "Send magic link" primary button.
- Secondary link: "Use password instead" (progressive disclosure — a password input slides in; if user has no password set, form prompts to fall back to magic link).
- Magic link arrives → `/auth/callback` → role-based redirect (see §4).

### 2.5 Password flow (optional)

- Users can set a password from `/account/security` after signing in via magic link.
- Password flow hits `supabase.auth.signInWithPassword()`. Session lands directly; no callback round-trip.
- Password reset = magic link with `redirectTo=/account/security/reset-password`.

---

## 3. Implementation shape

### 3.1 Packages

```jsonc
{
  "dependencies": {
    "@supabase/supabase-js": "^2.x",
    "@supabase/ssr":         "^0.5.x"
  }
}
```

### 3.2 Environment

```
NEXT_PUBLIC_SUPABASE_URL=          # project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # public anon key (RLS-protected)
SUPABASE_SERVICE_ROLE_KEY=         # server-only, bypasses RLS
NEXT_PUBLIC_SITE_URL=              # redirect base for magic links
```

`SUPABASE_SERVICE_ROLE_KEY` is read-only in API routes and never exposed to the browser. Used for:
- Inserting `enquiry` rows (client-side INSERT is RLS-denied per schema §5.4).
- Writing `view_event` rows (same reason).
- Stripe webhook handlers updating `payment` / `subscription`.

### 3.3 Clients

```
lib/supabase/server.ts     createServerClient  — App Router server components + route handlers
lib/supabase/browser.ts    createBrowserClient — client components only
lib/supabase/service.ts    createServiceClient — service-role key, server-only
lib/supabase/middleware.ts refresh session cookie on every request
```

The middleware file at `middleware.ts` project root calls through to `lib/supabase/middleware.ts` so the session cookie stays fresh on navigation.

### 3.4 Routes

| Path | Type | Purpose |
|---|---|---|
| `/login` | page | Email input + magic link send + optional password. |
| `/signup` | page | Same form as `/login` with a different heading. Both call the same server action. |
| `/auth/callback` | route handler | `GET`. Exchanges `?code=...` for session, upserts `user_profile`, resolves any pending `syndicator_user` invites, redirects by role. |
| `/account` | page | Buyer shell. Server component; `redirect('/login?next=/account')` if no session. |
| `/account/preferences` | page | Consent + notification preferences. |
| `/account/security` | page | Password set/change, connected devices. |
| `/syndicator/dashboard` | page | Syndicator shell. Requires `role='syndicator'` AND accepted `syndicator_user`. |
| `/admin` | page | Operators only. Requires `role='operator'`. |
| `/403` | page | "You don't have access." Lightweight. |

### 3.5 Server action — `sendMagicLink(email: string, next?: string)`

```ts
'use server';

import { createServiceClient } from '@/lib/supabase/service';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  next:  z.string().startsWith('/').optional(),
});

export async function sendMagicLink(input: unknown) {
  const { email, next } = schema.parse(input);
  const supabase = createServiceClient();
  const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ''}`;
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo, shouldCreateUser: true },
  });
  if (error) throw new Error(error.message);
  return { ok: true };
}
```

### 3.6 `/auth/callback`

```ts
// app/auth/callback/route.ts
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/account';
  if (!code) return NextResponse.redirect(new URL('/login?error=missing_code', url));

  const supabase = await createServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, url));

  // Upsert user_profile; resolve any pending syndicator invites (by email match)
  await ensureUserProfile();                 // creates user_profile row if missing
  await resolvePendingSyndicatorInvites();   // flips syndicator_user.accepted_at

  // Role-based landing
  return NextResponse.redirect(new URL(await resolveLandingPath(next), url));
}
```

Each helper is a named server function in `lib/auth/*.ts` with its own zod-typed signature.

---

## 4. Role-based routing

`resolveLandingPath(next)`:

1. If `next` is set and passes the authorisation check for the current user's role → return `next`.
2. Else fall back to role-default:
   - `buyer` → `/account`
   - `syndicator` → `/syndicator/dashboard`
   - `operator` → `/admin`

Authorisation check is a thin allowlist per path prefix:

```ts
const roleAllow: Record<string, UserRole[]> = {
  '/account':              ['buyer', 'syndicator', 'operator'],
  '/syndicator':           ['syndicator', 'operator'],
  '/admin':                ['operator'],
};
```

Middleware short-circuits disallowed paths with a 307 redirect to `/403`.

---

## 5. Session lifecycle

- **Magic link → session:** set by `exchangeCodeForSession`. HttpOnly cookies, 60-day expiry (Supabase default).
- **Refresh:** middleware calls `supabase.auth.getUser()` on every request, which transparently refreshes if needed.
- **Logout:** `POST /auth/signout` → `supabase.auth.signOut()` → redirect to `/`.
- **Expiry:** expired sessions redirect to `/login?next=...` with a flash toast "Your session expired. Please log in again."

---

## 6. Edge cases

- **Enquiry-as-signup with an existing account.** The enquiry API tries `auth.admin.getUserByEmail`; if the user exists, it sends a magic link that redirects back to the horse with a "We sent you a link to confirm" toast. The enquiry record is created regardless and linked once the session lands.
- **Two-role ambiguity.** If a user is both a buyer and a syndicator admin (same email), `user_profile.role` = `syndicator` (higher privilege). The `/account` routes still work — `/syndicator/dashboard` shows both panes.
- **Syndicator invite expiry.** Tokens are 72h. Expired tokens send the user to `/syndicator/accept?error=expired` with a "Request a new invite" CTA.
- **Operator privilege escalation.** `role = 'operator'` is settable only via the service client (no end-user UI). Seeded via a migration / admin runbook for the first Regal Bloodstock operator.

---

## 7. Security baseline

- No tokens in localStorage. HttpOnly cookies only.
- CSRF: POST routes require the Origin header to match `NEXT_PUBLIC_SITE_URL`, plus `credentials: 'include'`.
- Rate limit magic link sends: 3 per 10 min per email, 10 per hour per IP. Enforce via a small Redis-or-Supabase table `auth_rate_limit`.
- Never log email contents or magic link URLs. Sentry / PostHog scrub filters in place before Phase 2 ships.

---

## 8. What's NOT in scope for Phase 2

- Social login (Google, Apple). Deferred to post-launch — adds compliance surface and isn't blocking first-time-buyer friction.
- MFA. For operators only, Phase 8 before public launch.
- Passkeys. Supabase supports them; revisit in Q2 post-launch once adoption data exists.

---

*— architect (v1, 2026-04-22)*
