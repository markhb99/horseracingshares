/**
 * Server-only helpers for reading and writing consent state.
 * Uses the SSR server client so writes are made as the authenticated user,
 * satisfying the RLS policy `cl_self_insert` on consent_ledger.
 */

import { createServerClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ConsentType =
  | 'marketing_email'
  | 'marketing_sms'
  | 'share_with_syndicator_on_enquiry'
  | 'share_with_regal_partner_matches'
  | 'analytics_session_replay';

export const ALL_CONSENT_TYPES: ConsentType[] = [
  'marketing_email',
  'marketing_sms',
  'share_with_syndicator_on_enquiry',
  'share_with_regal_partner_matches',
  'analytics_session_replay',
];

export interface ConsentState {
  granted: boolean;
  grantedAt: string | null;
}

export type ConsentMap = Map<ConsentType, ConsentState>;

// Shape returned by the current_consent() SQL function
interface ConsentRow {
  consent_type: string;
  granted: boolean;
  granted_at: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Fetch the live consent state for a user from the consent_ledger.
 * Calls the `current_consent(p_user_id)` SQL function which resolves
 * DISTINCT ON (consent_type) ordered by created_at DESC.
 *
 * Missing rows default to { granted: false, grantedAt: null }.
 * All five consent types are always present in the returned Map.
 */
export async function getCurrentConsent(userId: string): Promise<ConsentMap> {
  const supabase = await createServerClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('current_consent', {
    p_user_id: userId,
  });

  if (error) {
    throw new Error(`current_consent RPC failed: ${error.message}`);
  }

  // Build map with defaults for all five types
  const map: ConsentMap = new Map(
    ALL_CONSENT_TYPES.map((type) => [type, { granted: false, grantedAt: null }]),
  );

  if (data) {
    for (const row of data as ConsentRow[]) {
      const type = row.consent_type as ConsentType;
      if (ALL_CONSENT_TYPES.includes(type)) {
        map.set(type, {
          granted: row.granted,
          grantedAt: row.granted_at ?? null,
        });
      }
    }
  }

  return map;
}

/**
 * Append a new row to consent_ledger via the `record_consent()` SQL function.
 * Passes ip_address and user_agent when available from the request headers.
 * Returns the new row's UUID.
 */
export async function recordConsent(
  userId: string,
  consentType: ConsentType,
  granted: boolean,
  source: string,
  ip?: string | null,
  userAgent?: string | null,
): Promise<string> {
  const supabase = await createServerClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('record_consent', {
    p_user_id: userId,
    p_consent_type: consentType,
    p_granted: granted,
    p_source: source,
    p_ip: ip ?? null,
    p_user_agent: userAgent ?? null,
  });

  if (error) {
    throw new Error(`record_consent RPC failed: ${error.message}`);
  }

  return data as string;
}

/**
 * Service-role variant of recordConsent.
 * Used in API routes where we have a userId but no user session cookie
 * (e.g. enquiry form submitted by a guest whose profile we just created).
 * Bypasses RLS — only call from server-side API routes.
 */
export async function recordConsentAsService(
  userId: string,
  consentType: ConsentType,
  granted: boolean,
  source: string,
  ip?: string | null,
  userAgent?: string | null,
): Promise<string> {
  const supabase = createServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
