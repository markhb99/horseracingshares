/**
 * POST /api/enquiries
 *
 * Captures a buyer enquiry, records consent, and schedules forwarding
 * to the syndicator email + lead-score recompute via next/server after().
 *
 * Steps:
 *  1. Validate request (Zod)
 *  2. Resolve userId (session user or findOrCreateProfileByEmail)
 *  3. AFSL / active gate
 *  4. Rate limit (3 per email per horse per 24h)
 *  5. Insert enquiry (trigger handles dedup within 7 days)
 *  6. Record consent ledger entries
 *  7. after() → forward + lead score recompute
 *  8. Return 201
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { recordConsentAsService } from '@/lib/auth/consent';
import { sendEnquiryForward } from '@/lib/email/send-enquiry-forward';
import { sendEnquiryConfirmation } from '@/lib/email/send-enquiry-confirmation';
import { recomputeLeadScoreFor } from '@/lib/scoring/recompute';

// ─── Zod schema ───────────────────────────────────────────────────────────────

const EnquiryRequestSchema = z.object({
  horse_id: z.string().uuid(),
  horse_slug: z.string().min(1).max(200),
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
  regal_partner_consent: z.boolean().optional(),
});

type EnquiryRequest = z.infer<typeof EnquiryRequestSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function findOrCreateProfileByEmail(
  email: string,
  fullName: string,
): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceClient() as any;

  // Try to find existing user via listUsers + email filter
  let existingAuthId: string | null = null;
  try {
    const { data: listData } = await supabase.auth.admin.listUsers({});
    if (listData?.users) {
      const found = listData.users.find(
        (u: { email?: string; id: string }) =>
          u.email?.toLowerCase() === email.toLowerCase(),
      );
      if (found?.id) existingAuthId = found.id as string;
    }
  } catch {
    // listUsers not available in all configs — fall through to createUser
  }

  if (existingAuthId) {
    // Ensure user_profile row exists (enquiry.user_id FK requires it)
    const { error: upErr } = await supabase.from('user_profile').upsert(
      { id: existingAuthId, display_name: fullName },
      { onConflict: 'id', ignoreDuplicates: true },
    );
    if (upErr) throw new Error(`user_profile upsert: ${upErr.message}`);
    return existingAuthId;
  }

  // Create new auth user
  const { data: newUser, error: createError } =
    await supabase.auth.admin.createUser({
      email,
      email_confirm: false,
      user_metadata: {
        created_via: 'enquiry_form',
        display_name: fullName,
      },
    });

  if (!createError && newUser?.user?.id) {
    const newId = newUser.user.id as string;
    // Create user_profile row so enquiry.user_id FK resolves
    const { error: upErr } = await supabase.from('user_profile').upsert(
      { id: newId, display_name: fullName },
      { onConflict: 'id', ignoreDuplicates: true },
    );
    if (upErr) throw new Error(`user_profile upsert: ${upErr.message}`);
    return newId;
  }

  if (createError) {
    throw new Error(createError.message);
  }

  throw new Error('Could not resolve user');
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Parse + validate
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = EnquiryRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.issues },
      { status: 422 },
    );
  }

  const data: EnquiryRequest = parsed.data;

  // 2. Resolve userId
  let userId: string | null = null;

  try {
    const authSupabase = await createServerClient();
    const {
      data: { user },
    } = await authSupabase.auth.getUser();
    if (user?.id) {
      userId = user.id;
    }
  } catch {
    // No session — fall through to create profile
  }

  if (!userId) {
    try {
      userId = await findOrCreateProfileByEmail(data.email, data.full_name);
    } catch (err) {
      // Non-fatal — continue with userId=null (enquiry saved as guest)
      console.error('[enquiry] findOrCreateProfile failed', err);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceClient() as any;

  // 3. Fetch horse + syndicator
  const { data: horse, error: horseFetchError } = await supabase
    .from('horse')
    .select(
      'id, slug, name, sire, dam, syndicator_id, status, syndicator:syndicator_id(id, name, afsl_number, afsl_verified_at)',
    )
    .eq('id', data.horse_id)
    .is('deleted_at', null)
    .single();

  if (horseFetchError || !horse) {
    return NextResponse.json({ error: 'Horse not found' }, { status: 404 });
  }

  const syndicatorRaw = horse.syndicator;
  const syndicator = Array.isArray(syndicatorRaw)
    ? syndicatorRaw[0]
    : syndicatorRaw;

  if (!syndicator?.id) {
    return NextResponse.json(
      { error: 'Syndicator not found for this horse' },
      { status: 422 },
    );
  }

  // AFSL / active gate — belt-and-braces, DB constraint also enforces this
  if (horse.status !== 'active') {
    return NextResponse.json(
      { error: 'This listing is no longer active' },
      { status: 422 },
    );
  }
  if (!syndicator.afsl_number || !syndicator.afsl_verified_at) {
    return NextResponse.json(
      { error: 'Syndicator AFSL not verified — enquiries unavailable' },
      { status: 422 },
    );
  }

  // 4. Rate limit: max 3 enquiries per email per horse in 24 hours
  const twentyFourHoursAgo = new Date(
    Date.now() - 24 * 60 * 60 * 1000,
  ).toISOString();

  const { count: recentCount } = await supabase
    .from('enquiry')
    .select('id', { count: 'exact', head: true })
    .eq('horse_id', data.horse_id)
    .eq('contact_email', data.email)
    .gte('created_at', twentyFourHoursAgo)
    .is('deleted_at', null);

  if ((recentCount ?? 0) >= 3) {
    return NextResponse.json(
      { error: 'Too many enquiries. Please wait before enquiring again.' },
      { status: 429 },
    );
  }

  // 5. Insert enquiry (the DB trigger handles dedup within 7 days)
  let enquiryId: string;

  try {
    const { data: inserted, error: insertError } = await supabase
      .from('enquiry')
      .insert({
        user_id: userId ?? null,
        horse_id: data.horse_id,
        syndicator_id: syndicator.id,
        contact_name: data.full_name,
        contact_email: data.email,
        contact_phone: data.mobile,
        message: data.message ?? null,
        share_size_interested_pct: data.share_size_pct,
        source: 'horse_detail_page',
        consent_marketing_at_submit: data.marketing_consent,
        consent_share_at_submit: data.syndicator_share_consent,
      })
      .select('id')
      .single();

    if (insertError) {
      // Handle dedup trigger — postgres unique_violation
      if (
        insertError.code === '23505' ||
        insertError.code === 'P0001' ||
        insertError.message?.includes('duplicate enquiry')
      ) {
        // Extract existing_id from HINT if available
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const hint = (insertError as unknown as Record<string, unknown>).hint as string | undefined;
        const existingId = hint?.match(
          /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
        )?.[0];

        if (existingId) {
          return NextResponse.json(
            { enquiry_id: existingId, deduped: true },
            { status: 200 },
          );
        }

        return NextResponse.json({ deduped: true }, { status: 200 });
      }

      console.error('[enquiry] insert failed', insertError);
      return NextResponse.json(
        { error: 'Could not save enquiry' },
        { status: 500 },
      );
    }

    if (!inserted?.id) {
      return NextResponse.json(
        { error: 'Could not save enquiry' },
        { status: 500 },
      );
    }

    enquiryId = inserted.id as string;
  } catch (err) {
    console.error('[enquiry] unexpected insert error', err);
    return NextResponse.json(
      { error: 'Could not save enquiry' },
      { status: 500 },
    );
  }

  // 6. Record consent ledger entries (non-fatal if it fails)
  if (userId) {
    const ip =
      req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip');
    const userAgent = req.headers.get('user-agent');

    try {
      if (data.marketing_consent) {
        await recordConsentAsService(
          userId,
          'marketing_email',
          true,
          `enquiry:${enquiryId}`,
          ip,
          userAgent,
        );
      }
      if (data.syndicator_share_consent) {
        await recordConsentAsService(
          userId,
          'share_with_syndicator_on_enquiry',
          true,
          `enquiry:${enquiryId}`,
          ip,
          userAgent,
        );
      }
      if (data.regal_partner_consent) {
        await recordConsentAsService(
          userId,
          'share_with_regal_partner_matches',
          true,
          `enquiry:${enquiryId}`,
          ip,
          userAgent,
        );
      }
    } catch (err) {
      // Non-fatal — enquiry is saved; log for ops review
      console.error('[enquiry] consent ledger write failed', err);
    }
  }

  // 7. Schedule async work: forward email + buyer confirmation + lead score recompute
  const capturedEnquiryId = enquiryId;
  const capturedUserId = userId;
  const capturedBuyerEmail = data.email;
  const capturedBuyerName = data.full_name;
  const capturedHorseName = horse.name ?? `${horse.sire} × ${horse.dam}`;
  const capturedHorseSlug = data.horse_slug;
  const capturedSyndicatorName = syndicator.name as string;
  const capturedShareSize = data.share_size_pct;

  after(async () => {
    try {
      await sendEnquiryForward(capturedEnquiryId);
    } catch (err) {
      console.error('[enquiry] forward failed', err);
    }

    try {
      await sendEnquiryConfirmation({
        to: capturedBuyerEmail,
        recipientName: capturedBuyerName,
        horseName: capturedHorseName,
        horseSlug: capturedHorseSlug,
        syndicatorName: capturedSyndicatorName,
        shareSize: capturedShareSize,
      });
    } catch (err) {
      console.error('[enquiry] buyer confirmation failed', err);
    }

    if (capturedUserId) {
      try {
        await recomputeLeadScoreFor(capturedUserId);
      } catch (err) {
        console.error('[enquiry] lead score recompute failed', err);
      }
    }
  });

  return NextResponse.json({ enquiry_id: enquiryId }, { status: 201 });
}
