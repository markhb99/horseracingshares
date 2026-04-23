/**
 * Syndicator dashboard — Phase 2 shell.
 * Role-gated: syndicator | operator.
 * Shows the first syndicator org the user belongs to, with horse counts
 * by status and the 5 most recent enquiries.
 */

import Link from 'next/link';
import { H1, H3, Small, Body, Caption } from '@/components/typography';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { requireRole } from '@/lib/auth/role';
import { createServerClient } from '@/lib/supabase/server';

export const metadata = {
  title: 'Syndicator dashboard',
};

// ── date helper ──────────────────────────────────────────────────────────────
function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-AU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// ── status badge variant map ──────────────────────────────────────────────────
type BadgeVariant = 'default' | 'secondary' | 'outline' | 'destructive';

function statusVariant(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    active: 'default',
    pending_review: 'secondary',
    draft: 'outline',
    sold: 'secondary',
    withdrawn: 'destructive',
  };
  return map[status] ?? 'outline';
}

export default async function SyndicatorDashboardPage() {
  const profile = await requireRole(
    ['syndicator', 'operator'],
    '/syndicator/dashboard',
  );

  const supabase = await createServerClient();

  // ── Resolve first syndicator for this user ──────────────────────────────
  const { data: syndicatorLinks } = await supabase
    .from('syndicator_user')
    .select('syndicator_id, accepted_at')
    .eq('user_id', profile.id)
    .not('accepted_at', 'is', null)
    .order('accepted_at', { ascending: true })
    .limit(1);

  const syndicatorId = syndicatorLinks?.[0]?.syndicator_id ?? null;

  // ── Fetch syndicator row ────────────────────────────────────────────────
  const { data: syndicator } = syndicatorId
    ? await supabase
        .from('syndicator')
        .select('id, name, afsl_number, afsl_verified_at')
        .eq('id', syndicatorId)
        .single()
    : { data: null };

  // ── Horse counts by status ──────────────────────────────────────────────
  type HorseCountRow = { status: string; count: string };
  const horseCounts: Record<string, number> = {
    active: 0,
    pending_review: 0,
    sold: 0,
    draft: 0,
  };

  if (syndicatorId) {
    const { data: horses } = await supabase
      .from('horse')
      .select('status')
      .eq('syndicator_id', syndicatorId)
      .is('deleted_at', null);

    if (horses) {
      for (const h of horses as HorseCountRow[]) {
        horseCounts[h.status] = (horseCounts[h.status] ?? 0) + 1;
      }
    }
  }

  // ── Recent enquiries (5) ────────────────────────────────────────────────
  type EnquiryRow = {
    id: string;
    contact_name: string;
    contact_email: string;
    created_at: string;
    outcome: string;
    horse: { name: string | null; slug: string } | null;
  };

  let recentEnquiries: EnquiryRow[] = [];

  if (syndicatorId) {
    const { data } = await supabase
      .from('enquiry')
      .select(
        'id, contact_name, contact_email, created_at, outcome, horse:horse_id(name, slug)',
      )
      .eq('syndicator_id', syndicatorId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(5);

    recentEnquiries = (data as EnquiryRow[] | null) ?? [];
  }

  // ── Stat cards config ────────────────────────────────────────────────────
  const statCards = [
    { label: 'Active', count: horseCounts.active, status: 'active' },
    {
      label: 'Pending review',
      count: horseCounts.pending_review,
      status: 'pending_review',
    },
    { label: 'Sold', count: horseCounts.sold, status: 'sold' },
    { label: 'Draft', count: horseCounts.draft, status: 'draft' },
  ];

  // ── No syndicator linked ──────────────────────────────────────────────────
  if (!syndicator) {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center bg-background px-6 py-16">
        <div className="w-full max-w-lg flex flex-col gap-6">
          <H1>No syndicator linked</H1>
          <Body className="text-muted-foreground">
            Your account is not yet linked to a syndicator organisation.
          </Body>
          {profile.role === 'operator' && (
            <Caption>
              <Link href="/admin" className="underline underline-offset-4">
                Go to the operator console
              </Link>{' '}
              to link a syndicator.
            </Caption>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-svh bg-background px-6 py-12">
      <div className="mx-auto w-full max-w-4xl flex flex-col gap-10">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-1">
          <H1>{syndicator.name}</H1>
          <Small className="text-muted-foreground">
            AFSL {syndicator.afsl_number ?? '—'} &middot; verified{' '}
            {fmtDate(syndicator.afsl_verified_at)}
          </Small>
        </div>

        {/* ── Stat grid ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {statCards.map(({ label, count, status }) => (
            <Card key={status}>
              <CardHeader>
                <CardDescription>{label}</CardDescription>
                <CardTitle>
                  <span className="text-3xl font-semibold tabular-nums">
                    {count}
                  </span>
                </CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>

        {/* ── Recent enquiries ───────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <H3>Recent enquiries</H3>

          {recentEnquiries.length === 0 ? (
            <Body className="text-muted-foreground">No enquiries yet.</Body>
          ) : (
            <div className="flex flex-col divide-y divide-border rounded-xl ring-1 ring-foreground/10 overflow-hidden">
              {recentEnquiries.map((enq) => (
                <div
                  key={enq.id}
                  className="flex items-center justify-between gap-4 bg-card px-4 py-3"
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <Body className="font-medium truncate">
                      {enq.contact_name}
                    </Body>
                    <Small className="truncate text-muted-foreground">
                      {enq.contact_email}
                    </Small>
                    {enq.horse && (
                      <Caption className="text-muted-foreground truncate">
                        Re:{' '}
                        {enq.horse.name ?? enq.horse.slug}
                      </Caption>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge variant={statusVariant(enq.outcome)}>
                      {enq.outcome}
                    </Badge>
                    <Caption className="text-muted-foreground">
                      {fmtDate(enq.created_at)}
                    </Caption>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Footer actions ─────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <Button disabled className="w-full sm:w-auto">
            Add new listing (coming in Phase 4)
          </Button>
          <Caption>
            <Link
              href="/syndicator/afsl"
              className="underline underline-offset-4 text-muted-foreground"
            >
              Manage your AFSL at /syndicator/afsl
            </Link>{' '}
            — coming Phase 4
          </Caption>
        </div>

      </div>
    </main>
  );
}
