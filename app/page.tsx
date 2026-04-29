import Link from 'next/link';
import { Users, Calculator, ShieldCheck } from 'lucide-react';
import { createServerClient } from '@/lib/supabase/server';
import { searchHorses } from '@/lib/search/typesense-client';
import type { HorseHit } from '@/lib/search/typesense-client';
import { HorseCard } from '@/components/horse/HorseCard';
import type { HorseCardHorse } from '@/components/horse/HorseCard';
import { SireDam, H2, Body, Small, Caption } from '@/components/typography';
import { NewsletterForm } from '@/components/home/NewsletterForm';

export const metadata = {
  title: 'The Australian home of racehorse shares',
  description:
    'Browse shares in Australian racehorses — from 1% micro-shares to 10% stakes. Every listing is backed by a licensed syndicator and a Product Disclosure Statement.',
};

// ─── Types ────────────────────────────────────────────────────────

interface FeaturedHorseRow {
  id: string;
  slug: string;
  name: string | null;
  sire: string;
  dam: string;
  dam_sire: string | null;
  sex: string;
  foal_date: string | null;
  location_state: string;
  description: string | null;
  horse_image: Array<{ storage_path: string; is_hero: boolean }> | null;
}

// ─── Helpers ─────────────────────────────────────────────────────

function horseHitToCard(hit: HorseHit): HorseCardHorse {
  return {
    slug: hit.slug,
    name: hit.name,
    sire: hit.sire,
    dam: hit.dam,
    damSire: hit.dam_sire,
    sex: hit.sex,
    foalYear: hit.foal_year,
    locationState: hit.location_state,
    primaryTrainerName: hit.primary_trainer_name,
    primaryTrainerSlug: hit.primary_trainer_slug,
    priceMinCents: hit.price_min_cents,
    sharePctsAvailable: hit.share_pcts_available ?? [],
    totalSharesRemaining: hit.total_shares_remaining,
    hasFinalShares: hit.has_final_shares,
    bonusSchemes: hit.bonus_schemes ?? [],
    heroImagePath: hit.hero_image_path,
  };
}

function foalYearFromDate(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const year = new Date(dateStr).getFullYear();
  return isNaN(year) ? null : year;
}

function capitaliseSex(sex: FeaturedHorseRow['sex']): string {
  return sex.charAt(0).toUpperCase() + sex.slice(1);
}

// ─── Quick filter chip definitions ───────────────────────────────

const FILTER_CHIPS = [
  {
    label: 'Under $5k per share',
    href: `/browse?filters=${encodeURIComponent('{"price_bucket":"under_5k"}')}`,
  },
  {
    label: 'Yearlings',
    href: `/browse?filters=${encodeURIComponent('{"age_category":"yearling"}')}`,
  },
  {
    label: 'NSW',
    href: `/browse?filters=${encodeURIComponent('{"location_state":"NSW"}')}`,
  },
  {
    label: 'VIC',
    href: `/browse?filters=${encodeURIComponent('{"location_state":"VIC"}')}`,
  },
  {
    label: 'Magic Millions eligible',
    href: `/browse?filters=${encodeURIComponent('{"bonus_schemes":["Magic Millions"]}')}`,
  },
  {
    label: 'Snitzel progeny',
    href: `/browse?filters=${encodeURIComponent('{"sire":"Snitzel"}')}`,
  },
] as const;

// ─── Educational card definitions ────────────────────────────────

const EDU_CARDS = [
  {
    icon: Users,
    title: 'What is a horse syndicate?',
    href: '/handbook/what-is-a-syndicate',
    body: 'Co-own a racehorse for as little as 1%. Share the costs, the prizemoney, and the raceday experience.',
  },
  {
    icon: Calculator,
    title: 'What does it actually cost?',
    href: '/handbook/the-numbers',
    body: 'Upfront share price plus weekly training fees. We break down every cost so there are no surprises.',
  },
  {
    icon: ShieldCheck,
    title: 'How to pick the right syndicator',
    href: '/handbook/picking-a-syndicator',
    body: 'Every syndicator on Horse Racing Shares holds an AFSL or is an authorised representative. Here’s what else to check.',
  },
] as const;

// ─── SkeletonCard ─────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div
      className="animate-pulse rounded-lg bg-fog"
      style={{ aspectRatio: '4/5' }}
      aria-hidden="true"
    />
  );
}

// ─── HomePage ─────────────────────────────────────────────────────

export default async function HomePage() {
  // Resolve featured horse + recent listings in parallel.
  // Both are best-effort — the page renders gracefully if either fails.
  let featuredHorse: FeaturedHorseRow | null = null;
  let recentHorses: HorseHit[] = [];

  try {
    const supabase = await createServerClient();

    const [featuredResult, searchResult] = await Promise.allSettled([
      supabase
        .from('horse')
        .select(
          'id,slug,name,sire,dam,dam_sire,sex,foal_date,location_state,description,horse_image(storage_path,is_hero)',
        )
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      searchHorses({ q: '*', perPage: 4, page: 1 }),
    ]);

    if (
      featuredResult.status === 'fulfilled' &&
      featuredResult.value.data
    ) {
      featuredHorse = featuredResult.value.data as FeaturedHorseRow;
    } else if (featuredResult.status === 'rejected' || !featuredHorse) {
      // Fallback: most recent active horse
      const fallback = await supabase
        .from('horse')
        .select(
          'id,slug,name,sire,dam,dam_sire,sex,foal_date,location_state,description,horse_image(storage_path,is_hero)',
        )
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (fallback.data) featuredHorse = fallback.data as FeaturedHorseRow;
    }

    if (searchResult.status === 'fulfilled') {
      recentHorses = searchResult.value.hits;
    }
  } catch {
    // Supabase / Typesense unavailable — render page with empty state.
  }

  const featuredHeroPath =
    (featuredHorse?.horse_image ?? []).find((i) => i.is_hero)?.storage_path ??
    (featuredHorse?.horse_image ?? [])[0]?.storage_path ??
    null;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const featuredHeroUrl = featuredHeroPath
    ? `${supabaseUrl}/storage/v1/object/public/horse-photos/${featuredHeroPath}`
    : null;

  const descriptionText = featuredHorse?.description
    ? featuredHorse.description.length > 120
      ? `${featuredHorse.description.slice(0, 120)}…`
      : featuredHorse.description
    : featuredHorse
    ? `A talented young thoroughbred by ${featuredHorse.sire}. Contact the syndicator for the full story.`
    : null;

  return (
    <main>
      {/* ── 1. Hero ──────────────────────────────────────────────── */}
      <section
        className="relative flex items-center bg-midnight-dark overflow-hidden"
        style={{ minHeight: 'clamp(560px, 50vw, 640px)' }}
        aria-label="Hero"
      >
        {/* TODO: Replace with Mux dawn-gallop background video */}
        <div className="absolute inset-0 bg-midnight-dark" aria-hidden="true" />

        {/* Subtle gradient overlay for text legibility */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-midnight-dark/90 via-midnight-dark/60 to-transparent"
          aria-hidden="true"
        />

        <div className="relative z-10 mx-auto w-full max-w-[var(--container-max)] px-[var(--container-pad)] py-16">
          <div className="max-w-xl text-center md:text-left">
            <h1 className="text-display font-serif font-bold leading-[1.05] tracking-[-0.02em] text-brass-light">
              The Australian home of racehorse shares
            </h1>
            <p className="mt-4 text-lead text-paper/80 font-normal">
              Browse shares in Australian thoroughbreds. Every listing
              AFSL-verified.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 justify-center md:justify-start">
              <Link
                href="/browse"
                className="inline-flex items-center rounded-full bg-midnight-dark border border-paper/20 px-6 py-3 text-small-type font-medium text-paper hover:bg-midnight transition-colors duration-[120ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paper/50"
              >
                Browse horses
              </Link>
              <Link
                href="/handbook"
                className="inline-flex items-center rounded-full border border-paper/40 px-6 py-3 text-small-type font-medium text-paper hover:bg-paper/10 transition-colors duration-[120ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paper/50"
              >
                How it works
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. Quick filter chips ────────────────────────────────── */}
      <section
        className="bg-paper-dim border-b border-fog"
        aria-label="Quick filters"
      >
        <div
          className="mx-auto max-w-[var(--container-max)] px-[var(--container-pad)]"
        >
          <div
            className="flex gap-4 py-3.5 overflow-x-auto scrollbar-none"
            role="list"
            aria-label="Filter shortcuts"
          >
            {FILTER_CHIPS.map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                role="listitem"
                className="inline-flex shrink-0 items-center rounded-full border border-fog bg-paper px-4 py-2 text-small-type font-medium text-charcoal-soft hover:bg-fog transition-colors duration-[120ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring whitespace-nowrap"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. Hero Horse of the Week ────────────────────────────── */}
      <section
        className="bg-paper py-8 md:py-12 border-b border-fog"
        aria-label="Featured horse"
      >
        <div className="mx-auto max-w-[var(--container-max)] px-[var(--container-pad)]">
          <Caption
            as="p"
            className="mb-5 font-medium uppercase tracking-wider text-charcoal-soft"
            style={{ fontVariant: 'small-caps' }}
          >
            This fortnight at Horse Racing Shares
          </Caption>

          {featuredHorse ? (
            <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">
              {/* Image */}
              <div className="w-full lg:w-[60%] shrink-0">
                <div className="w-full rounded-lg overflow-hidden bg-fog">
                  {featuredHeroUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={featuredHeroUrl}
                      alt={featuredHorse.name ?? `${featuredHorse.sire} × ${featuredHorse.dam}`}
                      className="w-full object-cover object-center max-h-[480px]"
                    />
                  ) : (
                    <div className="aspect-[3/2] flex items-center justify-center">
                      <Caption className="text-center px-6 text-charcoal-soft">No photo yet</Caption>
                    </div>
                  )}
                </div>
              </div>

              {/* Editorial text */}
              <div className="flex flex-col gap-4 lg:pt-2">
                <div>
                  <h2 className="text-h2 font-serif font-bold text-midnight leading-snug">
                    <SireDam sire={featuredHorse.sire} dam={featuredHorse.dam} />
                  </h2>
                  {featuredHorse.dam_sire && (
                    <Small className="mt-1 font-medium text-charcoal-soft">
                      out of {featuredHorse.dam} ({featuredHorse.dam_sire})
                    </Small>
                  )}
                </div>

                <Small className="text-charcoal-soft">
                  {foalYearFromDate(featuredHorse.foal_date) != null
                    ? `${new Date().getFullYear() - foalYearFromDate(featuredHorse.foal_date)!}yo `
                    : ''}
                  {capitaliseSex(featuredHorse.sex)} &middot;{' '}
                  {featuredHorse.location_state}
                </Small>

                <Body className="text-charcoal">{descriptionText}</Body>

                <div className="mt-2">
                  <Link
                    href={`/horse/${featuredHorse.slug}`}
                    className="inline-flex items-center rounded-full bg-midnight px-5 py-2.5 text-small-type font-medium text-paper hover:bg-midnight-light transition-colors duration-[120ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    See this horse &rarr;
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            // Empty state — no featured horse yet
            <div className="rounded-lg bg-paper-dim border border-fog py-16 text-center">
              <Caption className="text-charcoal-soft">
                No featured horse at the moment. Check back soon.
              </Caption>
            </div>
          )}
        </div>
      </section>

      {/* ── 4. Educational three-up ──────────────────────────────── */}
      <section className="bg-paper py-12 md:py-16 border-b border-fog" aria-label="New to ownership">
        <div className="mx-auto max-w-[var(--container-max)] px-[var(--container-pad)]">
          <H2 className="mb-8 text-midnight">New to ownership? Start here.</H2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {EDU_CARDS.map(({ icon: Icon, title, href, body }) => (
              <Link
                key={href}
                href={href}
                className="group flex flex-col gap-4 rounded-lg bg-paper-dim p-6 border border-fog hover:shadow-md transition-shadow duration-[320ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-midnight/10">
                  <Icon size={20} className="text-midnight" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-h5 font-serif font-semibold text-midnight group-hover:text-midnight-light transition-colors">
                    {title}
                  </h3>
                  <Body className="mt-2 text-charcoal-soft">{body}</Body>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. Also listed this week ─────────────────────────────── */}
      <section
        className="bg-paper-dim py-12 md:py-16 border-b border-fog"
        aria-label="Also listed"
      >
        <div className="mx-auto max-w-[var(--container-max)] px-[var(--container-pad)]">
          <div className="flex items-baseline justify-between mb-6">
            <Caption
              as="p"
              className="font-medium uppercase tracking-wider text-charcoal-soft"
              style={{ fontVariant: 'small-caps' }}
            >
              Also on the market
            </Caption>
            <Link
              href="/browse"
              className="text-small-type font-medium text-midnight hover:text-midnight-light transition-colors duration-[120ms]"
            >
              View all &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            {recentHorses.length > 0
              ? recentHorses.map((hit) => (
                  <HorseCard
                    key={hit.id}
                    horse={horseHitToCard(hit)}
                    variant="standard"
                  />
                ))
              : Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
          </div>
        </div>
      </section>

      {/* ── 6. Trust strip ───────────────────────────────────────── */}
      <section
        className="bg-fog-dark py-0"
        aria-label="Trust verification"
      >
        <div className="mx-auto max-w-[var(--container-max)] px-[var(--container-pad)] flex items-center justify-center" style={{ minHeight: '72px' }}>
          <p className="text-small-type font-serif font-medium text-charcoal-soft text-center">
            Listings verified against Racing Victoria and Racing NSW syndicator
            registers
          </p>
        </div>
      </section>

      {/* ── 7. Email capture ─────────────────────────────────────── */}
      <section
        className="bg-midnight-dark py-16"
        aria-label="Newsletter signup"
      >
        <div className="mx-auto max-w-[var(--container-max)] px-[var(--container-pad)] flex flex-col items-center text-center gap-4">
          <H2 className="font-bold text-paper" as="h2">
            Three shares, every Sunday morning.
          </H2>
          <Body className="text-paper/70 max-w-md">
            Our weekly shortlist of the best new listings &mdash; free, no spam.
          </Body>
          <div className="w-full max-w-md mt-2">
            <NewsletterForm />
          </div>
          <Caption className="text-paper/50 mt-1">
            We&rsquo;ll email you once a week. Unsubscribe any time.{' '}
            <Link
              href="/legal/privacy"
              className="underline underline-offset-2 hover:text-paper/80 transition-colors"
            >
              See our privacy policy.
            </Link>
          </Caption>
        </div>
      </section>
    </main>
  );
}
