'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import { recordConsent, ALL_CONSENT_TYPES, type ConsentType } from '@/lib/auth/consent';

// ─── Schema ───────────────────────────────────────────────────────────────────

const toggleConsentSchema = z.object({
  consentType: z.enum(ALL_CONSENT_TYPES as [ConsentType, ...ConsentType[]]),
  granted: z.boolean(),
});

// ─── Action ───────────────────────────────────────────────────────────────────

interface ToggleConsentResult {
  ok: true;
  grantedAt: string;
}

interface ToggleConsentError {
  ok: false;
  status: number;
  message: string;
}

/**
 * Server action: toggle a consent type for the current user.
 *
 * - Zod-validates input.
 * - Reads session via the SSR server client; returns a 403 payload if no session.
 * - Appends a consent_ledger row with source='preferences_page'.
 * - Revalidates /account/preferences so the server component re-renders.
 */
export async function toggleConsent(
  input: unknown,
): Promise<ToggleConsentResult | ToggleConsentError> {
  // Validate input
  const parseResult = toggleConsentSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      ok: false,
      status: 400,
      message: 'Invalid consent type or granted value.',
    };
  }

  const { consentType, granted } = parseResult.data;

  // Require authenticated session
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, status: 403, message: 'Authentication required.' };
  }

  // Read IP and user-agent from request headers for the audit record
  const reqHeaders = await headers();
  const ip = reqHeaders.get('x-forwarded-for') ?? reqHeaders.get('x-real-ip') ?? null;
  const userAgent = reqHeaders.get('user-agent') ?? null;

  await recordConsent(user.id, consentType, granted, 'preferences_page', ip, userAgent);

  revalidatePath('/account/preferences');

  return { ok: true, grantedAt: new Date().toISOString() };
}
