'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';

// ─── Schemas ─────────────────────────────────────────────────────────────────

const magicLinkSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
  next: z.string().startsWith('/').optional(),
});

// ─── Actions ─────────────────────────────────────────────────────────────────

/**
 * Send a magic-link sign-in email to the given address.
 *
 * Uses the SSR server client (cookie-backed) — NOT the service client —
 * so the PKCE code_verifier lands in an HttpOnly cookie on the user's
 * browser. When they click the email link and return to /auth/callback,
 * the stored verifier lets us exchange the `?code=` param for a session.
 * Using the service client here silently breaks PKCE and Supabase falls
 * back to hash-fragment implicit flow, which server-side Next.js cannot
 * read.
 */
export async function sendMagicLink(input: unknown): Promise<{ ok: true }> {
  const { email, next } = magicLinkSchema.parse(input);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) throw new Error('NEXT_PUBLIC_SITE_URL is not configured.');

  const redirectTo = `${siteUrl}/auth/callback${
    next ? `?next=${encodeURIComponent(next)}` : ''
  }`;

  const supabase = await createServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo,
      shouldCreateUser: true,
    },
  });

  if (error) throw new Error(error.message);

  return { ok: true };
}

/**
 * Sign the current user out and redirect to the home page.
 */
export async function signOut(): Promise<never> {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/');
}
