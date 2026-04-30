/**
 * Operator console — Phase 2 shell.
 * Role-gated: operator only.
 * Shows aggregate counts for syndicators, horses, enquiries, and users,
 * plus a list of syndicators awaiting AFSL verification.
 */

import Link from 'next/link';
import { H1, H3, Body, Small, Caption } from '@/components/typography';
import { ModerationQueue } from '@/components/admin/ModerationQueue';
import { EnquiryTable } from '@/components/admin/EnquiryTable';
import type { EnquiryRow } from '@/components/admin/EnquiryTable';
import { VerifyAfslDialog } from '@/components/admin/VerifyAfslDialog';
import { HorseManagementTable } from '@/components/admin/HorseManagementTable';
import type { HorseManagementRow } from '@/components/admin/HorseManagementTable';
import { FeaturedHorseToggle } from '@/components/admin/FeaturedHorseToggle';
import type { FeaturedHorseRow } from '@/components/admin/FeaturedHorseToggle';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AfslShield } from '@/components/icons';
import { requireRole } from '@/lib/auth/role';
import { createServerClient } from '@/lib/supabase/server';

export const metadata = {
  title: 'Operator console',
};

// ── date helper ──────────────────────────────────────────────────────────────
function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-AU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// ── date helpers ─────────────────────────────────────────────────────────────
function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

// ── afsl status badge variants ────────────────────────────────────────────────
type BadgeVariant = 'default' | 'secondary' | 'outline' | 'destructive';

function afslVariant(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    verified: 'default',
    pending: 'secondary',
    unverified: 'outline',
    suspended: 'destructive',
    expired: 'destructive',
  };
  return map[status] ?? 'outline';
}

export default async function AdminPage() {
  await requireRole(['operator'], '/admin');

  const supabase = await createServerClient();

  // ── Syndicator counts by afsl_status ────────────────────────────────────
  const { data: allSyndicators } = await supabase
    .from('syndicator')
    .select('afsl_status')
    .is('deleted_at', null);

  const syndicatorsByStatus: Record<string, number> = {};
  for (const s of allSyndicators ?? []) {
    syndicatorsByStatus[s.afsl_status] =
      (syndicatorsByStatus[s.afsl_status] ?? 0) + 1;
  }
  const totalSyndicators = allSyndicators?.length ?? 0;

  // ── Horse counts by status ───────────────────────────────────────────────
  const { data: allHorses } = await supabase
    .from('horse')
    .select('status')
    .is('deleted_at', null);

  const horsesByStatus: Record<string, number> = {};
  for (const h of allHorses ?? []) {
    horsesByStatus[h.status] = (horsesByStatus[h.status] ?? 0) + 1;
  }
  const totalHorses = allHorses?.length ?? 0;

  // ── Enquiry count last 7 days ────────────────────────────────────────────
  const sevenDaysAgo = daysAgoISO(7);
  const { count: enquiryCount } = await supabase
    .from('enquiry')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', sevenDaysAgo)
    .is('deleted_at', null);

  // ── User counts by role ──────────────────────────────────────────────────
  const { data: allUsers } = await supabase
    .from('user_profile')
    .select('role')
    .is('deleted_at', null);

  const usersByRole: Record<string, number> = {};
  for (const u of allUsers ?? []) {
    usersByRole[u.role] = (usersByRole[u.role] ?? 0) + 1;
  }
  const totalUsers = allUsers?.length ?? 0;

  // ── Failed enquiry forwards ─────────────────────────────────────
  type FailedForward = {
    id: string;
    created_at: string;
    forward_failed_at: string | null;
    forward_error: string | null;
    contact_name: string;
    contact_email: string;
    horse_id: string;
    syndicator_id: string;
  };

  const { data: failedForwards } = await supabase
    .from('enquiry')
    .select(
      'id, created_at, forward_failed_at, forward_error, contact_name, contact_email, horse_id, syndicator_id',
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .eq('status' as any, 'failed')
    .is('deleted_at', null)
    .order('forward_failed_at', { ascending: false })
    .limit(20);

  // ── All enquiries log ───────────────────────────────────────────────────
  type EnquiryLog = {
    id: string;
    created_at: string;
    contact_name: string;
    contact_email: string;
    contact_phone: string | null;
    share_size_interested_pct: number | null;
    message: string | null;
    status: string | null;
    forwarded_to_syndicator_at: string | null;
    horse: { name: string | null; sire: string; dam: string } | null;
    syndicator: { name: string } | null;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: enquiryLog } = await (supabase as any)
    .from('enquiry')
    .select('id, created_at, contact_name, contact_email, contact_phone, share_size_interested_pct, message, status, forwarded_to_syndicator_at, horse:horse_id(name,sire,dam), syndicator:syndicator_id(name)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(50);

  // ── Horses awaiting moderation ──────────────────────────────────────────
  type PendingHorse = {
    id: string;
    name: string | null;
    sire: string;
    dam: string;
    sex: string;
    location_state: string;
    pds_url: string | null;
    listing_tier_code: string | null;
    submitted_at: string | null;
    syndicator_id: string;
  };

  const { data: pendingHorses } = await supabase
    .from('horse')
    .select(
      'id, name, sire, dam, sex, location_state, pds_url, listing_tier_code, submitted_at, syndicator_id',
    )
    .eq('status', 'pending_review')
    .is('deleted_at', null)
    .order('submitted_at', { ascending: true });

  // Fetch syndicator names for pending horses
  const syndicatorIds = [...new Set((pendingHorses ?? []).map((h) => h.syndicator_id))];
  const { data: syndicatorsForHorses } = syndicatorIds.length > 0
    ? await supabase
        .from('syndicator')
        .select('id, name, afsl_number, afsl_status')
        .in('id', syndicatorIds)
    : { data: [] };

  const synMap = new Map(
    (syndicatorsForHorses ?? []).map((s) => [s.id, s]),
  );

  // ── Syndicators awaiting verification ───────────────────────────────────
  type PendingSyndicator = {
    id: string;
    name: string;
    afsl_number: string | null;
    afsl_status: string;
    created_at: string;
  };

  const { data: pendingSyndicators } = await supabase
    .from('syndicator')
    .select('id, name, afsl_number, afsl_status, created_at')
    .in('afsl_status', ['pending', 'unverified'])
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(5);

  // ── All horses for management table ────────────────────────────────────
  type AllHorseRow = {
    id: string;
    slug: string;
    name: string | null;
    sire: string;
    dam: string;
    status: string;
    location_state: string;
    created_at: string;
    syndicator_id: string;
    is_featured: boolean;
  };

  const { data: allHorseRows } = await supabase
    .from('horse')
    .select('id, slug, name, sire, dam, status, location_state, created_at, syndicator_id, is_featured')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(200);

  // Build syndicator name map (reuse syndicatorsForHorses + pending syndicators)
  const allSyndicatorIds = [...new Set((allHorseRows ?? []).map((h) => h.syndicator_id))];
  const { data: syndicatorsForAll } = allSyndicatorIds.length > 0
    ? await supabase
        .from('syndicator')
        .select('id, name')
        .in('id', allSyndicatorIds)
    : { data: [] };
  const allSynMap = new Map((syndicatorsForAll ?? []).map((s) => [s.id, s.name]));

  const allManagementHorses: HorseManagementRow[] = (allHorseRows as AllHorseRow[] ?? []).map((h) => ({
    id: h.id,
    slug: h.slug,
    name: h.name,
    sire: h.sire,
    dam: h.dam,
    status: h.status,
    syndicator_name: allSynMap.get(h.syndicator_id) ?? '—',
    location_state: h.location_state,
    created_at: h.created_at,
  }));

  const managementHorses = allManagementHorses.filter((h) => h.status !== 'withdrawn');
  const withdrawnHorses = allManagementHorses.filter((h) => h.status === 'withdrawn');

  // ── Summary cards ───────────────────────────────────────────────────────
  const summaryCards = [
    {
      label: 'Syndicators',
      value: totalSyndicators,
      detail: `${syndicatorsByStatus.verified ?? 0} verified`,
      icon: true,
    },
    {
      label: 'Horses',
      value: totalHorses,
      detail: `${horsesByStatus.active ?? 0} active`,
      icon: false,
    },
    {
      label: 'Enquiries this week',
      value: enquiryCount ?? 0,
      detail: 'last 7 days',
      icon: false,
    },
    {
      label: 'Users',
      value: totalUsers,
      detail: `${usersByRole.buyer ?? 0} buyers`,
      icon: false,
    },
  ];

  return (
    <main className="min-h-svh bg-background px-6 py-12">
      <div className="mx-auto w-full max-w-5xl flex flex-col gap-10">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <H1>Operator console</H1>
          <Link
            href="/admin/horses/new"
            className="inline-flex items-center gap-2 rounded-full bg-midnight px-5 py-2.5 text-sm font-medium text-paper hover:bg-midnight/90 transition-colors"
          >
            + Add horse
          </Link>
        </div>

        {/* ── Summary cards ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {summaryCards.map(({ label, value, detail, icon }) => (
            <Card key={label}>
              <CardHeader>
                <CardDescription className="flex items-center gap-1.5">
                  {icon && (
                    <AfslShield
                      className="size-3.5 text-muted-foreground"
                      aria-hidden
                    />
                  )}
                  {label}
                </CardDescription>
                <CardTitle>
                  <span className="text-3xl font-semibold tabular-nums">
                    {value}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Caption className="text-muted-foreground">{detail}</Caption>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── User breakdown ─────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <H3>Users by role</H3>
          <div className="flex flex-wrap gap-3">
            {(['buyer', 'syndicator', 'operator'] as const).map((role) => (
              <div
                key={role}
                className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2"
              >
                <Small className="capitalize text-muted-foreground">
                  {role}
                </Small>
                <span className="text-lg font-semibold tabular-nums">
                  {usersByRole[role] ?? 0}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Horse breakdown ────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <H3>Horses by status</H3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(horsesByStatus).map(([status, count]) => (
              <div
                key={status}
                className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2"
              >
                <Small className="text-muted-foreground">{status}</Small>
                <span className="text-lg font-semibold tabular-nums">
                  {count}
                </span>
              </div>
            ))}
            {Object.keys(horsesByStatus).length === 0 && (
              <Body className="text-muted-foreground">No horses yet.</Body>
            )}
          </div>
        </div>

        {/* ── Listing moderation queue ───────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <H3>Listing moderation queue</H3>
          <ModerationQueue
            pendingHorses={(pendingHorses as PendingHorse[] ?? []).map((h) => ({
              id: h.id,
              name: h.name,
              sire: h.sire,
              dam: h.dam,
              sex: h.sex,
              location_state: h.location_state,
              pds_url: h.pds_url,
              listing_tier_code: h.listing_tier_code,
              submitted_at: h.submitted_at,
              syndicator_name: synMap.get(h.syndicator_id)?.name ?? '—',
              syndicator_afsl_number: synMap.get(h.syndicator_id)?.afsl_number ?? null,
              syndicator_afsl_status: synMap.get(h.syndicator_id)?.afsl_status ?? 'unverified',
            }))}
          />
        </div>

        {/* ── Awaiting AFSL verification ─────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <H3>Awaiting AFSL verification</H3>

          {(pendingSyndicators ?? []).length === 0 ? (
            <Body className="text-muted-foreground">
              All syndicators verified.
            </Body>
          ) : (
            <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Syndicator
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      AFSL number
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Submitted
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {(pendingSyndicators as PendingSyndicator[]).map((s) => (
                    <tr key={s.id}>
                      <td className="px-4 py-3 font-medium">{s.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {s.afsl_number ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {fmtDate(s.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={afslVariant(s.afsl_status)}>
                          {s.afsl_status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <VerifyAfslDialog
                          syndicatorId={s.id}
                          syndicatorName={s.name}
                          currentAfslNumber={s.afsl_number}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Failed forwards ────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <H3>Failed enquiry forwards</H3>
          <Small className="text-muted-foreground">
            Enquiries where the email forward to the syndicator failed. Requires manual follow-up.
          </Small>

          {(failedForwards ?? []).length === 0 ? (
            <Body className="text-muted-foreground">No failed forwards.</Body>
          ) : (
            <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Enquiry ID</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Prospect</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Submitted</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Failed at</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {(failedForwards as FailedForward[]).map((f) => (
                    <tr key={f.id}>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {f.id.slice(0, 8)}…
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{f.contact_name}</div>
                        <Caption className="text-muted-foreground">{f.contact_email}</Caption>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {fmtDate(f.created_at)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {fmtDate(f.forward_failed_at)}
                      </td>
                      <td className="px-4 py-3 text-destructive text-xs max-w-[200px] truncate">
                        {f.forward_error ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── All enquiries log ──────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <H3>All enquiries</H3>
          <Small className="text-muted-foreground">Most recent 50 enquiries across all horses.</Small>
          <EnquiryTable
            initialRows={(enquiryLog as EnquiryLog[] ?? []).map((e) => {
              const horse = Array.isArray(e.horse) ? e.horse[0] : e.horse;
              const syndicator = Array.isArray(e.syndicator) ? e.syndicator[0] : e.syndicator;
              return {
                id: e.id,
                created_at: e.created_at,
                contact_name: e.contact_name,
                contact_email: e.contact_email,
                contact_phone: e.contact_phone,
                share_size_interested_pct: e.share_size_interested_pct,
                message: e.message,
                status: e.status,
                forwarded_to_syndicator_at: e.forwarded_to_syndicator_at,
                horse_name: horse?.name ?? (horse ? `${horse.sire} × ${horse.dam}` : '—'),
                syndicator_name: syndicator?.name ?? '—',
              } satisfies EnquiryRow;
            })}
          />
        </div>

        {/* ── Syndicator AFSL status breakdown ───────────────────────────── */}
        <div className="flex flex-col gap-3">
          <H3>Syndicators by AFSL status</H3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(syndicatorsByStatus).map(([status, count]) => (
              <div
                key={status}
                className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2"
              >
                {status === 'verified' && (
                  <AfslShield
                    className="size-4 text-muted-foreground"
                    aria-hidden
                  />
                )}
                <Small className="text-muted-foreground">{status}</Small>
                <span className="text-lg font-semibold tabular-nums">
                  {count}
                </span>
              </div>
            ))}
            {Object.keys(syndicatorsByStatus).length === 0 && (
              <Body className="text-muted-foreground">No syndicators yet.</Body>
            )}
          </div>
        </div>

        {/* ── Featured hero horse ────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <div>
            <H3>Homepage hero horse</H3>
            <p className="text-sm text-muted-foreground mt-1">The starred horse appears as the hero on the homepage. Only active horses are shown.</p>
          </div>
          <FeaturedHorseToggle
            initialHorses={(allHorseRows as AllHorseRow[] ?? [])
              .filter((h) => h.status === 'active')
              .map((h): FeaturedHorseRow => ({
                id: h.id,
                name: h.name,
                sire: h.sire,
                dam: h.dam,
                syndicator_name: allSynMap.get(h.syndicator_id) ?? '—',
                is_featured: h.is_featured,
              }))}
          />
        </div>

        {/* ── Horse management ───────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <H3>All listings</H3>
          <HorseManagementTable horses={managementHorses} />
        </div>

        {/* ── Withdrawn / archive ────────────────────────────────────────── */}
        {withdrawnHorses.length > 0 && (
          <div className="flex flex-col gap-4">
            <H3>Withdrawn / archive</H3>
            <HorseManagementTable horses={withdrawnHorses} />
          </div>
        )}

      </div>
    </main>
  );
}
