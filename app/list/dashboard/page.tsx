'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { H1, H3, Body, Caption } from '@/components/typography';
import { EnquiryPane, type EnquiryRow } from '@/components/list/EnquiryPane';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface HorseRow {
  id: string;
  slug: string;
  name: string | null;
  sire: string;
  dam: string;
  status: string;
  listing_tier_code: string | null;
  view_count: number;
  enquiry_count: number;
  approved_at: string | null;
}

interface SyndicatorProfile {
  id: string;
  name: string;
  afsl_number: string | null;
  afsl_status: string;
  contact_email: string;
  contact_phone: string;
  website_url: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-AU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function daysRemaining(approvedAt: string | null): number | null {
  if (!approvedAt) return null;
  const approved = new Date(approvedAt).getTime();
  const expires = approved + 90 * 24 * 60 * 60 * 1000;
  const remaining = Math.ceil((expires - Date.now()) / (24 * 60 * 60 * 1000));
  return remaining;
}

type StatusBadgeVariant = 'default' | 'secondary' | 'outline' | 'destructive';

function statusVariant(status: string): StatusBadgeVariant {
  const map: Record<string, StatusBadgeVariant> = {
    active: 'default',
    submitted: 'secondary',
    draft: 'outline',
    sold: 'outline',
    withdrawn: 'outline',
    expired: 'destructive',
  };
  return map[status] ?? 'outline';
}

function afslVariant(status: string): StatusBadgeVariant {
  const map: Record<string, StatusBadgeVariant> = {
    verified: 'default',
    pending: 'secondary',
    unverified: 'outline',
    suspended: 'destructive',
    expired: 'destructive',
  };
  return map[status] ?? 'outline';
}

// ─── Status groups ────────────────────────────────────────────────────────────

const STATUS_ORDER = ['submitted', 'active', 'draft', 'sold', 'withdrawn', 'expired'];
const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Awaiting approval',
  active: 'Active',
  sold: 'Sold',
  withdrawn: 'Withdrawn',
  expired: 'Expired',
};

// ─── Horse card ───────────────────────────────────────────────────────────────

function HorseCard({ horse }: { horse: HorseRow }) {
  const remaining = horse.status === 'active' ? daysRemaining(horse.approved_at) : null;
  const horseName = horse.name ?? `${horse.sire} × ${horse.dam}`;

  return (
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-fog bg-paper p-4">
      <div className="space-y-1 min-w-0">
        <p className="font-medium text-charcoal truncate">{horseName}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={statusVariant(horse.status)}>{STATUS_LABELS[horse.status] ?? horse.status}</Badge>
          {horse.listing_tier_code && (
            <Badge variant="outline" className="capitalize">
              {horse.listing_tier_code}
            </Badge>
          )}
        </div>
        <div className="flex gap-4 text-xs text-charcoal-soft mt-1">
          <span>{horse.view_count} views</span>
          <span>{horse.enquiry_count} enquiries</span>
          {remaining != null && (
            <span className={cn(remaining < 14 ? 'text-destructive' : '')}>
              {remaining > 0 ? `${remaining} days remaining` : 'Expired'}
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <Button size="sm" variant="outline" disabled className="rounded-full text-xs">
          Edit
        </Button>
        {horse.status === 'expired' && (
          <Button size="sm" variant="outline" disabled className="rounded-full text-xs">
            Renew
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Dashboard (full client) ──────────────────────────────────────────────────

export default function DashboardPage() {
  const [horses, setHorses] = useState<HorseRow[]>([]);
  const [enquiries, setEnquiries] = useState<EnquiryRow[]>([]);
  const [syndicator, setSyndicator] = useState<SyndicatorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createBrowserSupabaseClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          window.location.href = '/login?next=/list/dashboard';
          return;
        }

        // Get syndicator_id
        const { data: synUser } = await supabase
          .from('syndicator_user')
          .select('syndicator_id')
          .eq('user_id', user.id)
          .single();

        if (!synUser) {
          setError('No syndicator account found.');
          setLoading(false);
          return;
        }

        const synId = synUser.syndicator_id;

        // Parallel: horses + enquiries + syndicator
        const [horsesRes, enquiriesRes, synRes] = await Promise.all([
          supabase
            .from('horse')
            .select('id, slug, name, sire, dam, status, listing_tier_code, view_count, enquiry_count, approved_at')
            .eq('syndicator_id', synId)
            .is('deleted_at', null)
            .order('created_at', { ascending: false }),
          supabase
            .from('enquiry')
            .select(
              'id, created_at, contact_name, contact_email, contact_phone, share_size_interested_pct, message, consent_share_at_submit, forwarded_to_syndicator_at, forward_failed_at, status, horse_id',
            )
            .eq('syndicator_id', synId)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(100),
          supabase
            .from('syndicator')
            .select('id, name, afsl_number, afsl_status, contact_email, contact_phone, website_url')
            .eq('id', synId)
            .single(),
        ]);

        setHorses((horsesRes.data as HorseRow[]) ?? []);

        // Enrich enquiries with horse name/slug
        const horseMap = new Map(
          ((horsesRes.data as HorseRow[]) ?? []).map((h) => [
            h.id,
            { name: h.name, slug: h.slug, sire: h.sire, dam: h.dam },
          ]),
        );

        const enriched: EnquiryRow[] = ((enquiriesRes.data as Array<{
          id: string;
          created_at: string;
          contact_name: string;
          contact_email: string;
          contact_phone: string | null;
          share_size_interested_pct: number | null;
          message: string | null;
          consent_share_at_submit: boolean;
          forwarded_to_syndicator_at: string | null;
          forward_failed_at: string | null;
          status: string;
          horse_id: string;
        }>) ?? []).map((e) => {
          const horse = horseMap.get(e.horse_id);
          return {
            ...e,
            horse_name: horse?.name ?? null,
            horse_slug: horse?.slug ?? '',
            horse_sire: horse?.sire ?? '',
            horse_dam: horse?.dam ?? '',
          };
        });

        setEnquiries(enriched);
        setSyndicator(synRes.data as SyndicatorProfile ?? null);
      } catch (err) {
        setError('Failed to load dashboard.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return (
      <main className="min-h-svh bg-background px-6 py-12">
        <div className="mx-auto max-w-4xl">
          <div className="py-16 text-center text-sm text-charcoal-soft">Loading dashboard…</div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-svh bg-background px-6 py-12">
        <div className="mx-auto max-w-4xl">
          <p className="text-sm text-destructive py-8 text-center">{error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-svh bg-background px-6 py-12">
      <div className="mx-auto max-w-4xl space-y-8">

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <H1>Dashboard</H1>
            {syndicator && (
              <div className="flex items-center gap-2">
                <Caption className="text-charcoal-soft">{syndicator.name}</Caption>
                <Badge variant={afslVariant(syndicator.afsl_status)}>
                  AFSL {syndicator.afsl_status}
                </Badge>
              </div>
            )}
          </div>
          <Button asChild className="rounded-full bg-brass text-midnight hover:bg-brass/90">
            <a href="/list/submit">+ New listing</a>
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="listings">
          <TabsList className="mb-6">
            <TabsTrigger value="listings">Listings</TabsTrigger>
            <TabsTrigger value="enquiries">
              Enquiries
              {enquiries.length > 0 && (
                <span className="ml-1.5 rounded-full bg-midnight/10 px-1.5 text-xs tabular-nums">
                  {enquiries.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          {/* ── Listings tab ─────────────────────────────────────────────── */}
          <TabsContent value="listings" className="space-y-8">
            {STATUS_ORDER.map((status) => {
              const group = horses.filter((h) => h.status === status);
              if (group.length === 0) return null;
              return (
                <div key={status} className="space-y-3">
                  <H3>{STATUS_LABELS[status]}</H3>
                  {group.map((h) => <HorseCard key={h.id} horse={h} />)}
                </div>
              );
            })}
            {horses.length === 0 && (
              <div className="rounded-xl border border-fog bg-paper py-12 text-center space-y-3">
                <Body className="text-charcoal-soft">No listings yet.</Body>
                <Button asChild className="rounded-full bg-midnight text-paper hover:bg-midnight/90">
                  <a href="/list/submit">Submit your first listing</a>
                </Button>
              </div>
            )}
          </TabsContent>

          {/* ── Enquiries tab ────────────────────────────────────────────── */}
          <TabsContent value="enquiries">
            <EnquiryPane enquiries={enquiries} />
          </TabsContent>

          {/* ── Profile tab ──────────────────────────────────────────────── */}
          <TabsContent value="profile">
            {syndicator ? (
              <div className="rounded-xl border border-fog bg-paper divide-y divide-fog">
                {[
                  { label: 'Trading name', value: syndicator.name },
                  { label: 'AFSL number', value: syndicator.afsl_number ?? '—' },
                  { label: 'AFSL status', value: syndicator.afsl_status },
                  { label: 'Contact email', value: syndicator.contact_email },
                  { label: 'Contact phone', value: syndicator.contact_phone },
                  { label: 'Website', value: syndicator.website_url ?? '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex flex-wrap items-center gap-3 px-5 py-3">
                    <p className="w-40 shrink-0 text-sm font-medium text-charcoal-soft">{label}</p>
                    <p className="text-sm text-charcoal">{value}</p>
                  </div>
                ))}
                <div className="px-5 py-3">
                  <a
                    href={`mailto:operator@horseracingshares.com?subject=Profile update request — ${syndicator.name}`}
                    className="text-sm text-midnight underline underline-offset-2 hover:text-midnight/80"
                  >
                    Request profile update →
                  </a>
                </div>
              </div>
            ) : (
              <Body className="text-charcoal-soft">Profile not found.</Body>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
