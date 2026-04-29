import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { searchHorses } from '@/lib/search/typesense-client';
import { sendSavedSearchDigest } from '@/lib/email/send-saved-search-digest';
import { FilterJsonSchema } from '@/lib/search/filter-schema';
import { signSavedSearchToken } from '@/lib/auth/saved-search-token';
import type { HorseHit } from '@/lib/search/typesense-client';
import type { SavedSearchDigestMatch } from '@/emails/saved-search-digest';

export const maxDuration = 300; // Vercel function max for cron

// ─── Auth guard ───────────────────────────────────────────────────

function isAuthorised(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}

// ─── Helpers ──────────────────────────────────────────────────────

const THIRTY_DAYS_SECS = 30 * 24 * 60 * 60;

function hitToMatch(hit: HorseHit, searchName: string): SavedSearchDigestMatch {
  return {
    id: hit.id,
    slug: hit.slug,
    name: hit.name ?? `${hit.sire} × ${hit.dam}`,
    sire: hit.sire,
    dam: hit.dam,
    sex: hit.sex,
    age_category: hit.age_category ?? '',
    location_state: hit.location_state,
    primary_trainer_name: hit.primary_trainer_name,
    price_min_cents: hit.price_min_cents,
    share_pcts_available: hit.share_pcts_available ?? [],
    has_final_shares: hit.has_final_shares,
    bonus_schemes: hit.bonus_schemes ?? [],
    hero_image_path: hit.hero_image_path,
    matched_searches: [searchName],
  };
}

// ─── Worker ───────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  if (!isAuthorised(request)) {
    return new Response('Unauthorized', { status: 401 });
  }

  const cadence = request.nextUrl.searchParams.get('cadence');
  if (cadence !== 'daily' && cadence !== 'weekly') {
    return NextResponse.json(
      { error: 'cadence must be daily or weekly' },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://horseracingshares.com';
  const now = new Date();
  const nowUnix = Math.floor(now.getTime() / 1000);

  // 1. Fetch all saved searches for this cadence
  const { data: searches, error: fetchError } = await supabase
    .from('saved_search')
    .select('id, user_id, name, filter_json, frequency, last_sent_at')
    .eq('frequency', cadence);

  if (fetchError) {
    console.error('[saved-search-digest] fetch error:', fetchError.message);
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!searches || searches.length === 0) {
    return NextResponse.json({ sent: 0, skipped: 0, total: 0 });
  }

  // 2. Batch-fetch user profiles (to filter deleted accounts)
  const userIds = [...new Set(searches.map((s) => s.user_id))];
  const { data: profiles } = await supabase
    .from('user_profile')
    .select('id, display_name, deleted_at')
    .in('id', userIds);

  const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);

  // 3. Batch-fetch user emails via auth admin API
  const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const emailMap = new Map(
    authData?.users.map((u) => [u.id, u.email ?? null]) ?? [],
  );

  // 4. Group searches by user_id (skip deleted users)
  const byUser = new Map<string, typeof searches>();
  for (const search of searches) {
    const profile = profileMap.get(search.user_id);
    if (!profile || profile.deleted_at !== null) continue;
    const list = byUser.get(search.user_id) ?? [];
    list.push(search);
    byUser.set(search.user_id, list);
  }

  let sent = 0;
  let skipped = 0;

  // 5. Process each user
  for (const [userId, userSearches] of byUser) {
    const userEmail = emailMap.get(userId);
    const profile = profileMap.get(userId);

    if (!userEmail) {
      skipped++;
      continue;
    }

    // Check marketing_email consent via service-role RPC
    let consentGranted = false;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: consentRows } = await (supabase as any).rpc('current_consent', {
        p_user_id: userId,
      });
      if (Array.isArray(consentRows)) {
        const row = (consentRows as Array<{ consent_type: string; granted: boolean }>).find(
          (r) => r.consent_type === 'marketing_email',
        );
        consentGranted = row?.granted ?? false;
      }
    } catch {
      // Conservative: skip on consent check failure
      skipped++;
      continue;
    }

    // Collect matches across all saved searches, deduped by horse id
    const horseMap = new Map<string, SavedSearchDigestMatch>();
    const savedSearchIds = userSearches.map((s) => s.id);
    let searchHadError = false;

    for (const search of userSearches) {
      const filterParsed = FilterJsonSchema.safeParse(search.filter_json);
      const filterJson = filterParsed.success ? filterParsed.data : {};

      const sinceUnix = search.last_sent_at
        ? Math.floor(new Date(search.last_sent_at).getTime() / 1000)
        : nowUnix - THIRTY_DAYS_SECS;

      try {
        const result = await searchHorses({
          q: '',
          filterJson,
          rawFilterBy: `created_at_unix:>${sinceUnix}`,
          perPage: 20,
        });

        for (const hit of result.hits) {
          const existing = horseMap.get(hit.id);
          if (existing) {
            existing.matched_searches.push(search.name);
          } else {
            horseMap.set(hit.id, hitToMatch(hit, search.name));
          }
        }
      } catch (err) {
        console.error(
          `[saved-search-digest] Typesense error for search ${search.id}:`,
          err,
        );
        searchHadError = true;
      }
    }

    const matches = [...horseMap.values()];
    const totalMatchCount = matches.length;
    let sentEmail = false;
    let emailMessageId: string | null = null;

    if (totalMatchCount > 0 && consentGranted) {
      const token = signSavedSearchToken('all', userId);
      const unsubscribeUrl = `${siteUrl}/api/saved-searches/unsubscribe?userId=${userId}&token=${token}`;
      const manageUrl = `${siteUrl}/account?tab=saved-searches`;

      const result = await sendSavedSearchDigest({
        to: userEmail,
        props: {
          recipientName: profile?.display_name ?? 'there',
          matches,
          totalMatchCount,
          unsubscribeUrl,
          manageUrl,
          siteUrl,
        },
      });

      if ('messageId' in result) {
        sentEmail = true;
        emailMessageId = result.messageId;
      } else {
        console.error(`[saved-search-digest] Resend error for ${userId}:`, result.error);
      }
    }

    // Write run log (always, for observability)
    await supabase.from('saved_search_run').insert({
      user_id: userId,
      saved_search_ids: savedSearchIds,
      cadence,
      sent_email: sentEmail,
      email_message_id: emailMessageId,
      match_count: totalMatchCount,
    });

    // Advance last_sent_at — even on zero matches (prevents unbounded lookback window).
    // Skip advancement if Typesense errored, so we retry next cadence.
    if (!searchHadError) {
      await supabase
        .from('saved_search')
        .update({
          last_sent_at: now.toISOString(),
          last_match_count: totalMatchCount,
        })
        .in('id', savedSearchIds);
    }

    if (sentEmail) {
      sent++;
    } else {
      skipped++;
    }
  }

  return NextResponse.json({ sent, skipped, total: byUser.size });
}
