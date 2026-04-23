/**
 * Operator console — Phase 2 shell.
 * Role-gated: operator only.
 * Shows aggregate counts for syndicators, horses, enquiries, and users,
 * plus a list of syndicators awaiting AFSL verification.
 */

import { H1, H3, Body, Small, Caption } from '@/components/typography';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
        <H1>Operator console</H1>

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
                        <div className="flex flex-col gap-1">
                          <Button size="sm" disabled>
                            Verify
                          </Button>
                          <Caption className="text-muted-foreground">
                            Verification workflow ships Phase 4
                          </Caption>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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

      </div>
    </main>
  );
}
