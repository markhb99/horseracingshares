import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import { getCurrentConsent, ALL_CONSENT_TYPES } from '@/lib/auth/consent';
import { H1, H2, H3, Body, Small, Caption, SireDam } from '@/components/typography';
import { Button } from '@/components/ui/button';
import ConsentToggles, { type InitialConsent } from '@/components/account/ConsentToggles';
import { signOut } from '@/lib/auth/actions';
import { deleteSavedSearch, removeFromWishlist } from '@/app/account/actions';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'My account' };

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'saved-searches' | 'wishlist' | 'enquiries' | 'preferences';

const TABS: { id: Tab; label: string }[] = [
  { id: 'saved-searches', label: 'Saved searches' },
  { id: 'wishlist', label: 'Wishlist' },
  { id: 'enquiries', label: 'Enquiries' },
  { id: 'preferences', label: 'Preferences' },
];

interface ShareListing {
  pct: number;
  price_cents: number;
  available: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-AU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function frequencyLabel(freq: string): string {
  switch (freq) {
    case 'daily': return 'Daily';
    case 'weekly': return 'Weekly';
    case 'instant': return 'Instant';
    default: return freq;
  }
}

function outcomeLabel(outcome: string): string {
  switch (outcome) {
    case 'pending': return 'Pending';
    case 'contacted': return 'Contacted';
    case 'converted': return 'Converted';
    case 'no_interest': return 'No interest';
    default: return outcome;
  }
}

// ─── Tab: Saved Searches ─────────────────────────────────────────────────────

async function SavedSearchesTab({ userId }: { userId: string }) {
  const supabase = await createServerClient();
  const { data: rows } = await supabase
    .from('saved_search')
    .select('id, name, frequency, last_sent_at, last_match_count, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (!rows?.length) {
    return (
      <EmptyState
        heading="No saved searches yet"
        body="Browse horses and save a search to get email alerts when new listings match."
        cta={{ href: '/browse', label: 'Browse horses' }}
      />
    );
  }

  return (
    <ul className="divide-y divide-border">
      {rows.map((row) => (
        <li key={row.id} className="flex items-start justify-between gap-4 py-4">
          <div className="min-w-0 flex-1">
            <p className="text-body-type font-semibold text-midnight">{row.name}</p>
            <Small>
              {frequencyLabel(row.frequency)} alerts
              {row.last_sent_at
                ? ` · Last sent ${fmtDate(row.last_sent_at)}`
                : ' · Never sent'}
              {row.last_match_count
                ? ` · ${row.last_match_count} match${row.last_match_count === 1 ? '' : 'es'}`
                : ''}
            </Small>
          </div>
          <form action={deleteSavedSearch.bind(null, row.id)}>
            <button
              type="submit"
              className="shrink-0 text-small-type text-charcoal-soft underline underline-offset-2 hover:text-charcoal"
            >
              Delete
            </button>
          </form>
        </li>
      ))}
    </ul>
  );
}

// ─── Tab: Wishlist ────────────────────────────────────────────────────────────

async function WishlistTab({ userId }: { userId: string }) {
  const supabase = await createServerClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows } = await (supabase as any)
    .from('wishlist')
    .select(`
      horse_id,
      horse:horse_id(
        id, slug, name, sire, dam, dam_sire, sex, foal_date,
        location_state, bonus_schemes, share_listings,
        total_shares_remaining, wishlist_count,
        trainer:primary_trainer_id(id, slug, name)
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (!rows?.length) {
    return (
      <EmptyState
        heading="Your wishlist is empty"
        body="Tap the heart icon on any listing to save horses you want to revisit."
        cta={{ href: '/browse', label: 'Browse horses' }}
      />
    );
  }

  return (
    <ul className="divide-y divide-border">
      {rows.map((row: { horse_id: string; horse: Record<string, unknown> | null }) => {
        const h = row.horse;
        if (!h) return null;

        const shareListings = (h.share_listings as ShareListing[] | null) ?? [];
        const available = shareListings.filter((s) => s.available);
        const priceMinCents = available.length
          ? Math.min(...available.map((s) => s.price_cents))
          : 0;
        const sharePctsAvailable = available.map((s) => s.pct);

        return (
          <li key={row.horse_id} className="flex items-center gap-4 py-4">
            <div className="min-w-0 flex-1">
              <Link
                href={`/horse/${h.slug as string}`}
                className="text-body-type font-semibold text-midnight hover:underline"
              >
                {h.name
                  ? (h.name as string)
                  : <SireDam sire={h.sire as string} dam={h.dam as string} />}
              </Link>
              <Small className="mt-0.5">
                {h.sire as string} × {h.dam as string}
                {priceMinCents > 0
                  ? ` · From ${formatCents(priceMinCents)}`
                  : ''}
                {sharePctsAvailable.length > 0
                  ? ` · ${sharePctsAvailable.join('%, ')}% shares`
                  : ''}
              </Small>
              <Small>{h.location_state as string}</Small>
            </div>
            <form action={removeFromWishlist.bind(null, row.horse_id)}>
              <button
                type="submit"
                className="shrink-0 text-small-type text-charcoal-soft underline underline-offset-2 hover:text-charcoal"
              >
                Remove
              </button>
            </form>
          </li>
        );
      })}
    </ul>
  );
}

// ─── Tab: Enquiries ───────────────────────────────────────────────────────────

async function EnquiriesTab({ userId }: { userId: string }) {
  const supabase = await createServerClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows } = await (supabase as any)
    .from('enquiry')
    .select(`
      id, share_size_interested_pct, outcome, created_at,
      horse:horse_id(name, sire, dam, slug),
      syndicator:syndicator_id(name)
    `)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (!rows?.length) {
    return (
      <EmptyState
        heading="No enquiries yet"
        body="When you enquire about a horse, it will appear here."
        cta={{ href: '/browse', label: 'Browse horses' }}
      />
    );
  }

  return (
    <ul className="divide-y divide-border">
      {rows.map((row: Record<string, unknown>) => {
        const horse = row.horse as Record<string, unknown> | null;
        const syndicator = row.syndicator as Record<string, unknown> | null;
        const horseName = horse?.name
          ? (horse.name as string)
          : horse
          ? `${horse.sire as string} × ${horse.dam as string}`
          : 'Unknown horse';

        return (
          <li key={row.id as string} className="flex items-start justify-between gap-4 py-4">
            <div className="min-w-0 flex-1">
              {horse?.slug ? (
                <Link
                  href={`/horse/${horse.slug as string}`}
                  className="text-body-type font-semibold text-midnight hover:underline"
                >
                  {horseName}
                </Link>
              ) : (
                <p className="text-body-type font-semibold text-midnight">{horseName}</p>
              )}
              <Small className="mt-0.5">
                {syndicator?.name as string ?? ''}
                {row.share_size_interested_pct
                  ? ` · ${row.share_size_interested_pct as number}% share`
                  : ''}
                {' · '}
                {fmtDate(row.created_at as string)}
              </Small>
            </div>
            <span
              className={cn(
                'shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-caption-type font-medium',
                row.outcome === 'converted'
                  ? 'bg-brass/20 text-brass-dark'
                  : row.outcome === 'contacted'
                  ? 'bg-midnight/10 text-midnight'
                  : 'bg-charcoal/10 text-charcoal',
              )}
            >
              {outcomeLabel(row.outcome as string)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

// ─── Tab: Preferences ────────────────────────────────────────────────────────

async function PreferencesTab({ userId }: { userId: string }) {
  const consentMap = await getCurrentConsent(userId);
  const initialConsent = Object.fromEntries(
    ALL_CONSENT_TYPES.map((type) => [type, consentMap.get(type)!]),
  ) as InitialConsent;

  return (
    <div className="flex flex-col gap-6">
      <ConsentToggles initialConsent={initialConsent} />
      <Caption>
        Horse Racing Shares is owned by Regal Bloodstock.{' '}
        <Link href="/about" className="underline underline-offset-4">
          Read about the relationship.
        </Link>
      </Caption>
    </div>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState({
  heading,
  body,
  cta,
}: {
  heading: string;
  body: string;
  cta: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <H3 className="text-charcoal">{heading}</H3>
      <Body className="max-w-sm text-muted-foreground">{body}</Body>
      <Button asChild variant="outline" className="rounded-full">
        <Link href={cta.href}>{cta.label}</Link>
      </Button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/account');
  }

  const { tab: tabParam } = await searchParams;
  const activeTab: Tab =
    TABS.find((t) => t.id === tabParam)?.id ?? 'saved-searches';

  return (
    <main className="min-h-svh bg-background">
      {/* Page header */}
      <div className="border-b border-border bg-paper">
        <div className="mx-auto max-w-3xl px-6 py-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <H1 className="mb-1">My account</H1>
              <Body className="text-muted-foreground">{user.email}</Body>
            </div>
            <form action={signOut}>
              <Button type="submit" variant="outline" size="sm" className="rounded-full">
                Sign out
              </Button>
            </form>
          </div>

          {/* Tab nav */}
          <nav
            className="mt-8 flex gap-1 overflow-x-auto"
            aria-label="Account sections"
          >
            {TABS.map((tab) => (
              <Link
                key={tab.id}
                href={`/account?tab=${tab.id}`}
                className={cn(
                  'whitespace-nowrap rounded-full px-4 py-2 text-small-type font-medium transition-colors',
                  activeTab === tab.id
                    ? 'bg-midnight text-paper'
                    : 'text-charcoal hover:bg-charcoal/10',
                )}
                aria-current={activeTab === tab.id ? 'page' : undefined}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab content */}
      <div className="mx-auto max-w-3xl px-6 py-8">
        {activeTab === 'saved-searches' && (
          <>
            <H2 className="mb-6">Saved searches</H2>
            <SavedSearchesTab userId={user.id} />
          </>
        )}
        {activeTab === 'wishlist' && (
          <>
            <H2 className="mb-6">Wishlist</H2>
            <WishlistTab userId={user.id} />
          </>
        )}
        {activeTab === 'enquiries' && (
          <>
            <H2 className="mb-6">Enquiries</H2>
            <EnquiriesTab userId={user.id} />
          </>
        )}
        {activeTab === 'preferences' && (
          <>
            <H2 className="mb-6">Preferences</H2>
            <PreferencesTab userId={user.id} />
          </>
        )}
      </div>
    </main>
  );
}
