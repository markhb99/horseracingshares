import { Suspense } from 'react';
import Link from 'next/link';
import { H1 } from '@/components/typography';
import { HorseCard } from '@/components/horse/HorseCard';
import { FilterRail } from '@/components/browse/FilterRail';
import { SortBar } from '@/components/browse/SortBar';
import { BrowseBottomSheet } from '@/components/browse/BrowseBottomSheet';
import { searchHorses } from '@/lib/search/typesense-client';
import { FilterJsonSchema } from '@/lib/search/filter-schema';
import type { FilterJson } from '@/lib/search/filter-schema';
import type { HorseHit } from '@/lib/search/typesense-client';
import { DEFAULT_SORT } from '@/components/browse/SortBar';
import { createServerClient } from '@/lib/supabase/server';

// ─── Metadata ─────────────────────────────────────────────────────

export const metadata = {
  title: 'Browse Horses',
  description:
    'Discover racehorse syndication shares available across Australia. Filter by price, trainer, sire, location, and bonus schemes.',
};

// ─── Helpers ─────────────────────────────────────────────────────

function parseFilterJson(raw: string | undefined): FilterJson {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return FilterJsonSchema.parse(parsed);
  } catch {
    return {};
  }
}

function horseHitToCard(hit: HorseHit) {
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

// ─── SkeletonGrid ─────────────────────────────────────────────────

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-lg bg-fog"
          style={{ aspectRatio: '4/5' }}
        />
      ))}
    </div>
  );
}

// ─── BrowseResults (async inner component) ───────────────────────

interface BrowseResultsProps {
  q: string;
  filterJson: FilterJson;
  sortBy: string;
  page: number;
  finalOnly: boolean;
  isLoggedIn: boolean;
}

async function BrowseResults({
  q,
  filterJson,
  sortBy,
  page,
  finalOnly,
  isLoggedIn,
}: BrowseResultsProps) {
  // Append has_final_shares filter when finalOnly is set
  const effectiveFilter: FilterJson = finalOnly
    ? { ...filterJson }
    : filterJson;

  let result;
  try {
    result = await searchHorses({
      q,
      filterJson: effectiveFilter,
      sortBy,
      page,
      perPage: 24,
    });
  } catch {
    return (
      <div className="py-16 text-center">
        <p className="text-small-type text-charcoal-soft">
          Search is temporarily unavailable. Please try again shortly.
        </p>
      </div>
    );
  }

  const { hits, found, facet_counts } = result;
  const totalPages = Math.ceil(found / 24);

  // Build prev/next URLs
  function buildPageUrl(targetPage: number): string {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    const fs = JSON.stringify(filterJson);
    if (fs !== '{}') params.set('filters', fs);
    if (sortBy !== DEFAULT_SORT) params.set('sort', sortBy);
    if (finalOnly) params.set('final', '1');
    if (targetPage > 1) params.set('page', String(targetPage));
    const qs = params.toString();
    return `/browse${qs ? `?${qs}` : ''}`;
  }

  return (
    <>
      {/* SortBar + result count */}
      <SortBar found={found} currentSort={sortBy} />

      {/* FilterRail is desktop-only inside the layout; BrowseBottomSheet handles mobile */}
      {/* Results grid */}
      {hits.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <p className="text-small-type text-charcoal-soft">
            No horses match your filters.
          </p>
          <Link
            href="/browse"
            className="text-small-type font-medium text-midnight underline underline-offset-2 hover:text-midnight-light"
          >
            Clear filters
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {hits.map((hit) => (
            <HorseCard key={hit.id} horse={horseHitToCard(hit)} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <nav
          aria-label="Pagination"
          className="mt-10 flex items-center justify-center gap-4"
        >
          {page > 1 ? (
            <Link
              href={buildPageUrl(page - 1)}
              className="rounded-full border border-fog bg-white px-5 py-2 text-small-type font-medium text-charcoal hover:border-midnight transition-colors"
            >
              ← Previous
            </Link>
          ) : (
            <span className="rounded-full border border-fog px-5 py-2 text-small-type font-medium text-charcoal-soft opacity-40 cursor-not-allowed">
              ← Previous
            </span>
          )}

          <span className="text-caption-type text-charcoal-soft">
            Page {page} of {totalPages}
          </span>

          {page < totalPages ? (
            <Link
              href={buildPageUrl(page + 1)}
              className="rounded-full border border-fog bg-white px-5 py-2 text-small-type font-medium text-charcoal hover:border-midnight transition-colors"
            >
              Next →
            </Link>
          ) : (
            <span className="rounded-full border border-fog px-5 py-2 text-small-type font-medium text-charcoal-soft opacity-40 cursor-not-allowed">
              Next →
            </span>
          )}
        </nav>
      )}

      {/* Pass filter/facet data to mobile sheet */}
      <BrowseBottomSheet
        filterJson={filterJson}
        facetCounts={facet_counts}
        found={found}
        finalOnly={finalOnly}
        q={q}
        isLoggedIn={isLoggedIn}
      />
    </>
  );
}

// ─── BrowsePage ───────────────────────────────────────────────────

interface BrowsePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function BrowsePage({ searchParams }: BrowsePageProps) {
  const params = await searchParams;

  const q = typeof params.q === 'string' ? params.q : '';
  const filterJson = parseFilterJson(
    typeof params.filters === 'string' ? params.filters : undefined,
  );
  const sortBy =
    typeof params.sort === 'string' ? params.sort : DEFAULT_SORT;
  const page = typeof params.page === 'string' ? Math.max(1, Number(params.page)) : 1;
  const finalOnly = params.final === '1';

  // Resolve auth and initial search in parallel
  const [authResult, searchResult] = await Promise.allSettled([
    createServerClient().then((sb) => sb.auth.getUser()),
    searchHorses({ q, filterJson, sortBy, page, perPage: 24 }),
  ]);

  const isLoggedIn =
    authResult.status === 'fulfilled' && !!authResult.value.data.user;

  const initialFacets =
    searchResult.status === 'fulfilled' ? searchResult.value.facet_counts : [];
  const initialFound =
    searchResult.status === 'fulfilled' ? searchResult.value.found : 0;
  const fetchError = searchResult.status === 'rejected';

  return (
    <main className="min-h-svh bg-paper pb-24 md:pb-0">
      {/* Page header */}
      <div className="border-b border-fog bg-white px-[var(--container-pad)] py-8">
        <div className="mx-auto max-w-[var(--container-max)]">
          <H1>Browse Horses</H1>
          {!fetchError && (
            <p className="mt-1 text-small-type text-charcoal-soft">
              {initialFound === 1
                ? '1 horse found'
                : `${initialFound.toLocaleString('en-AU')} horses found`}
            </p>
          )}
        </div>
      </div>

      {/* Body — rail + results */}
      <div className="mx-auto max-w-[var(--container-max)] px-[var(--container-pad)] py-8">
        <div className="flex gap-8 items-start">
          {/* Desktop filter rail */}
          <Suspense fallback={<div className="hidden w-64 shrink-0 md:block" />}>
            <FilterRail
              filterJson={filterJson}
              facetCounts={initialFacets}
              finalOnly={finalOnly}
              q={q}
              resultCount={initialFound}
              isLoggedIn={isLoggedIn}
            />
          </Suspense>

          {/* Results column */}
          <div className="min-w-0 flex-1">
            <Suspense fallback={<SkeletonGrid />}>
              <BrowseResults
                q={q}
                filterJson={filterJson}
                sortBy={sortBy}
                page={page}
                finalOnly={finalOnly}
                isLoggedIn={isLoggedIn}
              />
            </Suspense>
          </div>
        </div>
      </div>
    </main>
  );
}
