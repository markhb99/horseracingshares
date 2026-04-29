import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { createServiceClient } from '@/lib/supabase/service';
import { createServerClient } from '@/lib/supabase/server';
import { H1, H2, Lead, Small, Caption } from '@/components/typography';
import { HorseCard } from '@/components/horse/HorseCard';
import type { HorseCardHorse } from '@/components/horse/HorseCard';

// ─── Slug helpers ──────────────────────────────────────────────────

function sireToSlug(sire: string): string {
  return sire
    .toLowerCase()
    .replace(/['''`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Reverse: given a slug, find the matching sire name from the DB rows
function matchSire(slug: string, sires: string[]): string | null {
  return sires.find((s) => sireToSlug(s) === slug) ?? null;
}

// ─── generateStaticParams ─────────────────────────────────────────

export async function generateStaticParams() {
  const db = createServiceClient();
  const { data } = await db
    .from('horse')
    .select('sire')
    .eq('status', 'active')
    .is('deleted_at', null);

  const slugs = [...new Set((data ?? []).map((r) => sireToSlug(r.sire)))];
  return slugs.map((slug) => ({ slug }));
}

// ─── generateMetadata ─────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const db = createServiceClient();
  const { data } = await db
    .from('horse')
    .select('sire')
    .eq('status', 'active')
    .is('deleted_at', null);

  const sireName = matchSire(slug, (data ?? []).map((r) => r.sire));
  if (!sireName) return { title: 'Sire | Horse Racing Shares' };

  return {
    title: `${sireName} Shares | Horse Racing Shares`,
    description: `Browse available racehorse syndication shares in horses by ${sireName}. Find your perfect share in a ${sireName} youngster today.`,
  };
}

// ─── Horse row type ───────────────────────────────────────────────

interface HorseRow {
  id: string;
  slug: string;
  name: string | null;
  sire: string;
  dam: string;
  dam_sire: string | null;
  sex: string;
  foal_date: string | null;
  colour: string | null;
  location_state: string;
  total_shares_remaining: number;
  share_listings: Array<{ pct: number; price_cents: number; available: boolean }> | null;
  bonus_schemes: string[];
  vet_xray_clear: boolean | null;
  vet_scope_clear: boolean | null;
  horse_image: Array<{ storage_path: string; is_hero: boolean }> | null;
  syndicator: { name: string } | null;
  primary_trainer: { name: string; slug: string } | null;
}

function rowToCard(h: HorseRow): HorseCardHorse {
  const listings = h.share_listings ?? [];
  const avail = listings.filter((s) => s.available);
  const priceMin = avail.length ? Math.min(...avail.map((s) => s.price_cents)) : 0;
  const images = h.horse_image ?? [];
  const hero = images.find((i) => i.is_hero) ?? images[0];

  return {
    slug: h.slug,
    name: h.name,
    sire: h.sire,
    dam: h.dam,
    damSire: h.dam_sire,
    sex: h.sex as HorseCardHorse['sex'],
    foalYear: h.foal_date ? new Date(h.foal_date).getFullYear() : null,
    locationState: h.location_state,
    primaryTrainerName: h.primary_trainer?.name ?? null,
    primaryTrainerSlug: h.primary_trainer?.slug ?? null,
    priceMinCents: priceMin,
    sharePctsAvailable: avail.map((s) => s.pct),
    totalSharesRemaining: h.total_shares_remaining,
    hasFinalShares: Number(h.total_shares_remaining) <= 2,
    bonusSchemes: h.bonus_schemes ?? [],
    heroImagePath: hero?.storage_path ?? null,
  };
}

// ─── Page ─────────────────────────────────────────────────────────

export default async function SirePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Use server client so RLS applies
  const supabase = await createServerClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows } = await (supabase as any)
    .from('horse')
    .select(
      `id, slug, name, sire, dam, dam_sire, sex, foal_date, colour,
       location_state, total_shares_remaining, share_listings,
       bonus_schemes, vet_xray_clear, vet_scope_clear,
       horse_image(storage_path, is_hero),
       syndicator:syndicator_id(name),
       primary_trainer:primary_trainer_id(name, slug)`,
    )
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  const horses = (rows ?? []) as HorseRow[];

  // Resolve the canonical sire name from the slug
  const sireName = matchSire(slug, horses.map((h) => h.sire));
  if (!sireName) notFound();

  const sireHorses = horses.filter((h) => sireToSlug(h.sire) === slug);

  return (
    <main className="min-h-svh bg-paper pb-24">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="border-b border-fog bg-paper">
        <div className="mx-auto max-w-[var(--container-max)] px-[var(--container-pad)] py-3">
          <ol className="flex items-center gap-2 text-sm text-charcoal-soft">
            <li>
              <Link href="/sires" className="hover:text-charcoal transition-colors">
                Sires
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-charcoal font-medium">{sireName}</li>
          </ol>
        </div>
      </nav>

      {/* Header */}
      <div className="border-b border-fog bg-white px-[var(--container-pad)] py-10">
        <div className="mx-auto max-w-[var(--container-max)]">
          <H1 className="text-midnight">{sireName}</H1>
          <Lead className="mt-2 text-charcoal-soft">
            {sireHorses.length}{' '}
            {sireHorses.length === 1 ? 'horse' : 'horses'} with shares
            available
          </Lead>
        </div>
      </div>

      {/* Horse grid */}
      <div className="mx-auto max-w-[var(--container-max)] px-[var(--container-pad)] py-10">
        {sireHorses.length === 0 ? (
          <div className="py-16 text-center">
            <Small className="text-charcoal-soft">
              No active listings for {sireName} right now.
            </Small>
            <div className="mt-4">
              <Link
                href="/browse"
                className="text-sm font-medium text-midnight underline underline-offset-2 hover:text-midnight/70"
              >
                Browse all horses →
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sireHorses.map((h) => (
              <HorseCard key={h.id} horse={rowToCard(h)} variant="standard" />
            ))}
          </div>
        )}

        {/* Related sires */}
        <div className="mt-16 border-t border-fog pt-10">
          <H2 className="text-midnight mb-6">Browse other sires</H2>
          <Link
            href="/sires"
            className="inline-flex items-center gap-2 rounded-full border border-midnight px-5 py-2.5 text-sm font-medium text-midnight hover:bg-midnight hover:text-paper transition-colors duration-150"
          >
            View all sires →
          </Link>
        </div>
      </div>
    </main>
  );
}
