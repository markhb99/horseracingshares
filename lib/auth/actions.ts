'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/service';

// ─── Schemas ─────────────────────────────────────────────────────────────────

const magicLinkSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
  next: z.string().startsWith('/').optional(),
});

// ─── Actions ─────────────────────────────────────────────────────────────────

/**
 * Send a magic-link sign-in email to the given address.
 * On success the user is redirected to /auth/callback?next={next}.
 *
 * @throws {Error} when Supabase returns an error or the input fails validation.
 */
export async function sendMagicLink(input: unknown): Promise<{ ok: true }> {
  const { email, next } = magicLinkSchema.parse(input);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) throw new Error('NEXT_PUBLIC_SITE_URL is not configured.');

  const redirectTo = `${siteUrl}/auth/callback${
    next ? `?next=${encodeURIComponent(next)}` : ''
  }`;

  const supabase = createServiceClient();
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
  const { createServerClient } = await import('@/lib/supabase/server');
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/');
}
