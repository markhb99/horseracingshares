import { Suspense } from 'react';
import Link from 'next/link';
import { H1 } from '@/components/typography';
import { HorseCard } from '@/components/horse/HorseCard';
import { FilterRail } from '@/components/browse/FilterRail';
import { SearchInput } from '@/components/browse/SearchInput';
import { SortDropdown } from '@/components/browse/SortDropdown';
import { sortParamToTypesense } from '@/lib/search/sort';
import { BrowseBottomSheet } from '@/components/browse/BrowseBottomSheet';
import { searchHorses } from '@/lib/search/typesense-client';
import { FilterJsonSchema } from '@/lib/search/filter-schema';
import { parseSearchQuery } from '@/lib/search/parse';
import type { FilterJson } from '@/lib/search/filter-schema';
import type { HorseHit } from '@/lib/search/typesense-client';
import { createServerClient } from '@/lib/supabase/server';

// ─── Metadata ─────────────────────────────────────────────────────

export const metadata = {
  title: 'Browse Horses',
  description:
    'Discover racehorse syndication shares available across Australia. Filter by price, trainer, sire, location, and bonus schemes.',
};

// ─── Helpers ─────────────────────────────────────────────────────

function parseFiltersParam(raw: string | undefined): FilterJson {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return FilterJsonSchema.parse(parsed);
  } catch {
    return {};
  }
}

function hitToCard(hit: HorseHit) {
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

const PER_PAGE = 24;

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

// ─── ActiveFilterChips ────────────────────────────────────────────

interface ChipDef {
  label: string;
  removeHref: string;
}

function buildActiveChips(
  filterJson: FilterJson,
  q: string,
  sort: string,
  page: number,
): ChipDef[] {
  const chips: ChipDef[] = [];

  function hrefWithout(nextFilter: FilterJson): string {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    const fs = JSON.stringify(nextFilter);
    if (fs !== '{}') params.set('filters', fs);
    if (sort !== 'relevance' && sort !== '') params.set('sort', sort);
    // Reset to page 1 when removing a filter.
    return `/browse${params.toString() ? `?${params.toString()}` : ''}`;
  }

  (filterJson.sire ?? []).forEach((v) =>
    chips.push({
      label: `Sire: ${v}`,
      removeHref: hrefWithout({
        ...filterJson,
        sire: filterJson.sire?.filter((x) => x !== v) ?? [],
      }),
    }),
  );

  (filterJson.dam ?? []).forEach((v) =>
    chips.push({
      label: `Dam: ${v}`,
      removeHref: hrefWithout({
        ...filterJson,
        dam: filterJson.dam?.filter((x) => x !== v) ?? [],
      }),
    }),
  );

  (filterJson.dam_sire ?? []).forEach((v) =>
    chips.push({
      label: `Dam sire: ${v}`,
      removeHref: hrefWithout({
        ...filterJson,
        dam_sire: filterJson.dam_sire?.filter((x) => x !== v) ?? [],
      }),
    }),
  );

  (filterJson.sex ?? []).forEach((v) =>
    chips.push({
      label: v.charAt(0).toUpperCase() + v.slice(1),
      removeHref: hrefWithout({
        ...filterJson,
        sex: filterJson.sex?.filter((x) => x !== v),
      }),
    }),
  );

  (filterJson.colour ?? []).forEach((v) =>
    chips.push({
      label: v.charAt(0).toUpperCase() + v.slice(1),
      removeHref: hrefWithout({
        ...filterJson,
        colour: filterJson.colour?.filter((x) => x !== v),
      }),
    }),
  );

  (filterJson.age_category ?? []).forEach((v) =>
    chips.push({
      label: v.charAt(0).toUpperCase() + v.slice(1),
      removeHref: hrefWithout({
        ...filterJson,
        age_category: filterJson.age_category?.filter((x) => x !== v),
      }),
    }),
  );

  (filterJson.location_state ?? []).forEach((v) =>
    chips.push({
      label: v,
      removeHref: hrefWithout({
        ...filterJson,
        location_state: filterJson.location_state?.filter((x) => x !== v),
      }),
    }),
  );

  (filterJson.bonus_schemes ?? []).forEach((v) =>
    chips.push({
      label: v,
      removeHref: hrefWithout({
        ...filterJson,
        bonus_schemes: filterJson.bonus_schemes?.filter((x) => x !== v),
      }),
    }),
  );

  (filterJson.share_pcts ?? []).forEach((v) =>
    chips.push({
      label: `${v}% share`,
      removeHref: hrefWithout({
        ...filterJson,
        share_pcts: filterJson.share_pcts?.filter((x) => x !== v),
      }),
    }),
  );

  (filterJson.trainer ?? []).forEach((v) =>
    chips.push({
      label: v,
      removeHref: hrefWithout({
        ...filterJson,
        trainer: filterJson.trainer?.filter((x) => x !== v),
      }),
    }),
  );

  if (filterJson.price_min_cents != null || filterJson.price_max_cents != null) {
    const minDisplay = filterJson.price_min_cents != null
      ? `$${(filterJson.price_min_cents / 100).toLocaleString('en-AU')}`
      : null;
    const maxDisplay = filterJson.price_max_cents != null
      ? `$${(filterJson.price_max_cents / 100).toLocaleString('en-AU')}`
      : null;
    const label =
      minDisplay && maxDisplay
        ? `${minDisplay}–${maxDisplay}`
        : minDisplay
        ? `From ${minDisplay}`
        : `Up to ${maxDisplay}`;
    chips.push({
      label,
      removeHref: hrefWithout({
        ...filterJson,
        price_min_cents: undefined,
        price_max_cents: undefined,
      }),
    });
  }

  return chips;
}

// ─── ActiveFilterChipBar ──────────────────────────────────────────

function ActiveFilterChipBar({
  chips,
  clearAllHref,
}: {
  chips: ChipDef[];
  clearAllHref: string;
}) {
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 pb-3">
      {chips.map((chip) => (
        <Link
          key={chip.label}
          href={chip.removeHref}
          className="inline-flex items-center gap-1 rounded-full bg-midnight px-2.5 py-1 text-caption-type font-medium text-paper transition-colors hover:bg-midnight-light"
        >
          {chip.label}
          <span aria-hidden="true" className="ml-0.5 text-paper/60">
            ×
          </span>
        </Link>
      ))}
      <Link
        href={clearAllHref}
        className="text-caption-type font-medium text-charcoal-soft underline underline-offset-2 hover:text-charcoal"
      >
        Clear all
      </Link>
    </div>
  );
}

// ─── BrowseResults (async inner component) ───────────────────────

interface BrowseResultsProps {
  q: string;
  filterJson: FilterJson;
  sortParam: string;
  page: number;
  finalOnly: boolean;
  isLoggedIn: boolean;
}

async function BrowseResults({
  q,
  filterJson,
  sortParam,
  page,
  finalOnly,
  isLoggedIn,
}: BrowseResultsProps) {
  const sortBy = sortParamToTypesense(sortParam);

  let result;
  try {
    result = await searchHorses({
      q,
      filterJson,
      rawFilterBy: 'status:=active',
      sortBy,
      page,
      perPage: PER_PAGE,
    });
  } catch {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-small-type text-charcoal-soft">
          Browse is temporarily unavailable — please try again shortly.
        </p>
      </div>
    );
  }

  const { hits, found, facet_counts } = result;
  const totalPages = Math.ceil(found / PER_PAGE);

  // Active filter chips
  const chips = buildActiveChips(filterJson, q, sortParam, page);
  const clearAllHref = `/browse${q ? `?q=${encodeURIComponent(q)}` : ''}`;

  // Pagination URL builder
  function buildPageUrl(targetPage: number): string {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    const fs = JSON.stringify(filterJson);
    if (fs !== '{}') params.set('filters', fs);
    if (sortParam && sortParam !== 'relevance') params.set('sort', sortParam);
    if (finalOnly) params.set('final', '1');
    if (targetPage > 1) params.set('page', String(targetPage));
    const qs = params.toString();
    return `/browse${qs ? `?${qs}` : ''}`;
  }

  return (
    <>
      {/* Search + sort row */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex-1">
          <SearchInput />
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="shrink-0 text-small-type text-charcoal-soft">
            {found === 1 ? '1 horse' : `${found.toLocaleString('en-AU')} horses`}
          </p>
          <SortDropdown currentSort={sortParam} />
        </div>
      </div>

      {/* Active filter chips */}
      {chips.length > 0 && (
        <ActiveFilterChipBar chips={chips} clearAllHref={clearAllHref} />
      )}

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
            Clear all filters
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {hits.map((hit) => (
            <HorseCard key={hit.id} horse={hitToCard(hit)} horseId={hit.id} />
          ))}
        </div>
      )}

      {/* Pagination — prev/next only */}
      {totalPages > 1 && (
        <nav
          aria-label="Pagination"
          className="mt-10 flex items-center justify-center gap-4"
        >
          {page > 1 ? (
            <Link
              href={buildPageUrl(page - 1)}
              className="rounded-full border border-fog bg-white px-5 py-2 text-small-type font-medium text-charcoal transition-colors hover:border-midnight"
            >
              ← Previous
            </Link>
          ) : (
            <span className="cursor-not-allowed rounded-full border border-fog px-5 py-2 text-small-type font-medium text-charcoal-soft opacity-40">
              ← Previous
            </span>
          )}

          <span className="text-caption-type text-charcoal-soft">
            Page {page} of {totalPages}
          </span>

          {page < totalPages ? (
            <Link
              href={buildPageUrl(page + 1)}
              className="rounded-full border border-fog bg-white px-5 py-2 text-small-type font-medium text-charcoal transition-colors hover:border-midnight"
            >
              Next →
            </Link>
          ) : (
            <span className="cursor-not-allowed rounded-full border border-fog px-5 py-2 text-small-type font-medium text-charcoal-soft opacity-40">
              Next →
            </span>
          )}
        </nav>
      )}

      {/* Mobile filter sheet — rendered here so it has access to facet data */}
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

  // Parse q — apply parseSearchQuery to extract filter overrides from patterns
  const rawQ = typeof params.q === 'string' ? params.q : '';
  const { q, filterOverrides } = parseSearchQuery(rawQ);

  // Parse filters param, then merge any overrides derived from the query
  const baseFilters = parseFiltersParam(
    typeof params.filters === 'string' ? params.filters : undefined,
  );
  const filterJson: FilterJson = { ...baseFilters, ...filterOverrides };

  // Sort param — named value (relevance / price_asc / price_desc / newest)
  const sortParam = typeof params.sort === 'string' ? params.sort : 'relevance';

  // Page
  const page =
    typeof params.page === 'string' ? Math.max(1, Number(params.page)) : 1;

  // Legacy `final` param — preserved for compatibility with existing links
  const finalOnly = params.final === '1';

  // Resolve auth and initial search in parallel
  const [authResult, searchResult] = await Promise.allSettled([
    createServerClient().then((sb) => sb.auth.getUser()),
    searchHorses({
      q,
      filterJson,
      rawFilterBy: 'status:=active',
      sortBy: sortParamToTypesense(sortParam),
      page,
      perPage: PER_PAGE,
    }),
  ]);

  const isLoggedIn =
    authResult.status === 'fulfilled' && !!authResult.value.data.user;

  const initialFound =
    searchResult.status === 'fulfilled' ? searchResult.value.found : 0;
  const initialFacets =
    searchResult.status === 'fulfilled' ? searchResult.value.facet_counts : [];

  return (
    <main className="min-h-svh bg-paper pb-24 md:pb-0">
      {/* Page header */}
      <div className="border-b border-fog bg-white px-[var(--container-pad)] py-8">
        <div className="mx-auto max-w-[var(--container-max)]">
          <H1>Browse Horses</H1>
          <p className="mt-1 text-small-type text-charcoal-soft">
            {initialFound === 1
              ? '1 horse found'
              : `${initialFound.toLocaleString('en-AU')} horses found`}
          </p>
        </div>
      </div>

      {/* Body — filter rail + results */}
      <div className="mx-auto max-w-[var(--container-max)] px-[var(--container-pad)] py-8">
        <div className="flex items-start gap-8">
          {/* Desktop filter rail */}
          <Suspense fallback={<div className="hidden w-64 shrink-0 lg:block" />}>
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
                sortParam={sortParam}
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
