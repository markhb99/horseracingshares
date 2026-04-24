'use client';

import { useState, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { ChevronDown, ChevronUp, X, SlidersHorizontal } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { FilterJson } from '@/lib/search/filter-schema';
import type { FacetCount } from '@/lib/search/typesense-client';
import { SaveSearchButton } from '@/components/browse/SaveSearchButton';

// ─── Types ────────────────────────────────────────────────────────

export interface FilterRailProps {
  filterJson: FilterJson;
  facetCounts: FacetCount[];
  finalOnly: boolean;
  q: string;
  resultCount: number;
  isLoggedIn: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────

function getFacetCounts(
  facetCounts: FacetCount[],
  fieldName: string,
): Array<{ value: string; count: number }> {
  const fc = facetCounts.find((f) => f.field_name === fieldName);
  if (!fc) return [];
  return fc.counts
    .map((c) => ({ value: c.value, count: c.count }))
    .sort((a, b) => b.count - a.count);
}

function countActiveFilters(filter: FilterJson, finalOnly: boolean): number {
  let n = 0;
  if (filter.sire?.length) n += filter.sire.length;
  if (filter.dam?.length) n += filter.dam.length;
  if (filter.dam_sire?.length) n += filter.dam_sire.length;
  if (filter.sex?.length) n += filter.sex.length;
  if (filter.colour?.length) n += filter.colour.length;
  if (filter.age_category?.length) n += filter.age_category.length;
  if (filter.location_state?.length) n += filter.location_state.length;
  if (filter.bonus_schemes?.length) n += filter.bonus_schemes.length;
  if (filter.share_pcts?.length) n += filter.share_pcts.length;
  if (filter.trainer?.length) n += filter.trainer.length;
  if (filter.price_min_cents != null || filter.price_max_cents != null) n += 1;
  if (finalOnly) n += 1;
  return n;
}

// ─── FilterGroup (collapsible section) ───────────────────────────

function FilterGroup({
  label,
  defaultOpen = true,
  children,
}: {
  label: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <Separator className="bg-fog" />
      <button
        type="button"
        className="flex w-full items-center justify-between py-3 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="text-small-type font-semibold text-charcoal">
          {label}
        </span>
        {open ? (
          <ChevronUp size={16} className="text-charcoal-soft" />
        ) : (
          <ChevronDown size={16} className="text-charcoal-soft" />
        )}
      </button>
      {open && <div className="pb-4">{children}</div>}
    </div>
  );
}

// ─── CheckboxRow ─────────────────────────────────────────────────

function CheckboxRow({
  label,
  count,
  checked,
  onChange,
}: {
  label: string;
  count?: number;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 py-1">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-midnight h-4 w-4 shrink-0 rounded"
      />
      <span className="text-small-type flex-1 text-charcoal">{label}</span>
      {count != null && (
        <span className="text-caption-type text-charcoal-soft">{count}</span>
      )}
    </label>
  );
}

// ─── SearchableList ───────────────────────────────────────────────

function SearchableList({
  items,
  selected,
  onToggle,
  placeholder,
}: {
  items: Array<{ value: string; count: number }>;
  selected: string[];
  onToggle: (value: string, checked: boolean) => void;
  placeholder: string;
}) {
  const [query, setQuery] = useState('');

  const filtered = query
    ? items.filter((i) =>
        i.value.toLowerCase().includes(query.toLowerCase()),
      )
    : items.slice(0, 10);

  return (
    <div className="space-y-1">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="h-7 border-fog bg-white text-small-type"
      />
      <div className="max-h-48 overflow-y-auto">
        {filtered.map((item) => (
          <CheckboxRow
            key={item.value}
            label={item.value}
            count={item.count}
            checked={selected.includes(item.value)}
            onChange={(checked) => onToggle(item.value, checked)}
          />
        ))}
        {filtered.length === 0 && (
          <p className="text-caption-type py-2 text-charcoal-soft">
            No results
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Active filter chips ──────────────────────────────────────────

interface ActiveChip {
  label: string;
  onRemove: () => void;
}

function ActiveChips({ chips }: { chips: ActiveChip[] }) {
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 pb-3">
      {chips.map((chip, i) => (
        <button
          key={i}
          type="button"
          onClick={chip.onRemove}
          className="inline-flex items-center gap-1 rounded-full bg-midnight px-2.5 py-1 text-caption-type font-medium text-paper hover:bg-midnight-light transition-colors"
        >
          {chip.label}
          <X size={12} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

// ─── Price bucket config ─────────────────────────────────────────

const PRICE_BUCKETS = [
  { label: 'Under $1k', minCents: 0, maxCents: null as number | null },
  { label: '$1k–$2.5k', minCents: 100000, maxCents: 249999 as number | null },
  { label: '$2.5k–$5k', minCents: 250000, maxCents: 499999 as number | null },
  { label: '$5k–$10k', minCents: 500000, maxCents: 999999 as number | null },
  { label: '$10k+', minCents: 1000000, maxCents: null as number | null },
];

function getPriceBucketLabel(
  minCents: number | undefined,
  maxCents: number | undefined,
): string | null {
  const bucket = PRICE_BUCKETS.find(
    (b) =>
      b.minCents === (minCents ?? 0) && b.maxCents === (maxCents ?? null),
  );
  return bucket?.label ?? null;
}

// ─── Share pct chip config ────────────────────────────────────────

const SHARE_PCT_OPTIONS = [1, 2, 5, 10, 20] as const;

// ─── Location states ──────────────────────────────────────────────

const LOCATION_STATES = ['VIC', 'NSW', 'QLD', 'SA', 'WA', 'TAS', 'ACT', 'NT'] as const;
type LocationState = (typeof LOCATION_STATES)[number];

// ─── Bonus scheme config ──────────────────────────────────────────

const BONUS_SCHEME_OPTIONS = [
  'BOBS',
  'VOBIS',
  'QTIS',
  'Magic Millions',
  'Inglis Xtra',
];

// ─── Age / sex / colour ───────────────────────────────────────────

const AGE_CATEGORY_OPTIONS = ['weanling', 'yearling', '2yo', '3yo', 'older'] as const;
type AgeCategory = (typeof AGE_CATEGORY_OPTIONS)[number];

const SEX_OPTIONS = ['colt', 'filly', 'gelding', 'mare', 'stallion'] as const;
type Sex = (typeof SEX_OPTIONS)[number];

const COLOUR_OPTIONS = ['bay', 'brown', 'chestnut', 'grey', 'black', 'roan'] as const;
type Colour = (typeof COLOUR_OPTIONS)[number];

// ─── FilterRail ───────────────────────────────────────────────────

export function FilterRail({ filterJson, facetCounts, finalOnly, q, resultCount, isLoggedIn }: FilterRailProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showMore, setShowMore] = useState(false);

  const pushParams = useCallback(
    (filter: FilterJson, nextFinalOnly: boolean) => {
      const params = new URLSearchParams(searchParams.toString());
      const serialised = JSON.stringify(filter);
      if (serialised === '{}') {
        params.delete('filters');
      } else {
        params.set('filters', serialised);
      }
      if (nextFinalOnly) {
        params.set('final', '1');
      } else {
        params.delete('final');
      }
      params.delete('page');
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  const pushFilter = useCallback(
    (next: FilterJson) => pushParams(next, finalOnly),
    [pushParams, finalOnly],
  );

  function toggleStringArray(
    key: 'sire' | 'dam' | 'dam_sire' | 'trainer' | 'location_state' | 'bonus_schemes' | 'sex' | 'colour' | 'age_category',
    value: string,
    checked: boolean,
  ) {
    const current = (filterJson[key] as string[] | undefined) ?? [];
    const next = checked
      ? [...current, value]
      : current.filter((v) => v !== value);
    pushFilter({ ...filterJson, [key]: next.length ? next : undefined });
  }

  function toggleSharePct(value: number, checked: boolean) {
    const current = filterJson.share_pcts ?? [];
    const next = checked
      ? [...current, value]
      : current.filter((v) => v !== value);
    pushFilter({ ...filterJson, share_pcts: next.length ? next : undefined });
  }

  function setPriceBucket(
    bucket: { label: string; minCents: number; maxCents: number | null },
    checked: boolean,
  ) {
    if (!checked) {
      pushFilter({
        ...filterJson,
        price_min_cents: undefined,
        price_max_cents: undefined,
      });
      return;
    }
    pushFilter({
      ...filterJson,
      price_min_cents: bucket.minCents === 0 ? undefined : bucket.minCents,
      price_max_cents: bucket.maxCents ?? undefined,
    });
  }

  function isActivePriceBucket(bucket: {
    minCents: number;
    maxCents: number | null;
  }): boolean {
    return (
      (filterJson.price_min_cents ?? 0) === bucket.minCents &&
      (filterJson.price_max_cents ?? null) === bucket.maxCents
    );
  }

  const activeFilterCount = countActiveFilters(filterJson, finalOnly);

  // Build active chips for dismissal
  const chips: ActiveChip[] = [];

  const priceBucketLabel = getPriceBucketLabel(
    filterJson.price_min_cents,
    filterJson.price_max_cents,
  );
  if (priceBucketLabel) {
    chips.push({
      label: priceBucketLabel,
      onRemove: () =>
        pushFilter({
          ...filterJson,
          price_min_cents: undefined,
          price_max_cents: undefined,
        }),
    });
  }
  (filterJson.share_pcts ?? []).forEach((pct) =>
    chips.push({
      label: `${pct}% share`,
      onRemove: () => toggleSharePct(pct, false),
    }),
  );
  (filterJson.trainer ?? []).forEach((v) =>
    chips.push({ label: v, onRemove: () => toggleStringArray('trainer', v, false) }),
  );
  (filterJson.sire ?? []).forEach((v) =>
    chips.push({ label: `Sire: ${v}`, onRemove: () => toggleStringArray('sire', v, false) }),
  );
  (filterJson.location_state ?? []).forEach((v) =>
    chips.push({ label: v, onRemove: () => toggleStringArray('location_state', v, false) }),
  );
  (filterJson.bonus_schemes ?? []).forEach((v) =>
    chips.push({ label: v, onRemove: () => toggleStringArray('bonus_schemes', v, false) }),
  );
  (filterJson.age_category ?? []).forEach((v) =>
    chips.push({ label: v, onRemove: () => toggleStringArray('age_category', v, false) }),
  );
  (filterJson.sex ?? []).forEach((v) =>
    chips.push({ label: v, onRemove: () => toggleStringArray('sex', v, false) }),
  );
  (filterJson.colour ?? []).forEach((v) =>
    chips.push({ label: v, onRemove: () => toggleStringArray('colour', v, false) }),
  );
  (filterJson.dam_sire ?? []).forEach((v) =>
    chips.push({ label: `Dam sire: ${v}`, onRemove: () => toggleStringArray('dam_sire', v, false) }),
  );
  if (finalOnly) {
    chips.push({
      label: 'Final shares only',
      onRemove: () => pushParams(filterJson, false),
    });
  }

  const trainerItems = getFacetCounts(facetCounts, 'primary_trainer_name');
  const sireItems = getFacetCounts(facetCounts, 'sire');
  const colourItems = getFacetCounts(facetCounts, 'colour');
  const locationItems = getFacetCounts(facetCounts, 'location_state');

  return (
    <aside className="hidden w-64 shrink-0 md:block">
      <div className="sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto rounded-lg border border-fog bg-white p-4">
        {/* Header row */}
        <div className="mb-1 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={16} className="text-charcoal" />
            <span className="text-small-type font-semibold text-charcoal">
              Filters
            </span>
            {activeFilterCount > 0 && (
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-midnight text-caption-type font-medium text-paper">
                {activeFilterCount}
              </span>
            )}
          </div>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={() => pushParams({}, false)}
              className="text-caption-type text-charcoal-soft underline underline-offset-2 hover:text-charcoal"
            >
              Clear all
            </button>
          )}
        </div>

        <ActiveChips chips={chips} />

        {/* 1. Price range */}
        <FilterGroup label="Price range">
          {PRICE_BUCKETS.map((bucket) => (
            <CheckboxRow
              key={bucket.label}
              label={bucket.label}
              checked={isActivePriceBucket(bucket)}
              onChange={(checked) => setPriceBucket(bucket, checked)}
            />
          ))}
        </FilterGroup>

        {/* 2. Share size */}
        <FilterGroup label="Share size">
          <div className="flex flex-wrap gap-1.5">
            {SHARE_PCT_OPTIONS.map((pct) => {
              const active = (filterJson.share_pcts ?? []).includes(pct);
              return (
                <button
                  key={pct}
                  type="button"
                  onClick={() => toggleSharePct(pct, !active)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-caption-type font-medium transition-colors',
                    active
                      ? 'border-midnight bg-midnight text-paper'
                      : 'border-fog bg-white text-charcoal hover:border-midnight',
                  )}
                >
                  {pct}%{pct === 20 ? '+' : ''}
                </button>
              );
            })}
          </div>
        </FilterGroup>

        {/* 3. Trainer */}
        <FilterGroup label="Trainer">
          <SearchableList
            items={trainerItems}
            selected={filterJson.trainer ?? []}
            onToggle={(v, checked) => toggleStringArray('trainer', v, checked)}
            placeholder="Search trainers..."
          />
        </FilterGroup>

        {/* 4. Sire */}
        <FilterGroup label="Sire">
          <SearchableList
            items={sireItems}
            selected={filterJson.sire ?? []}
            onToggle={(v, checked) => toggleStringArray('sire', v, checked)}
            placeholder="Search sires..."
          />
        </FilterGroup>

        {/* 5. Location */}
        <FilterGroup label="Location">
          {LOCATION_STATES.map((state) => {
            const facet = locationItems.find((i) => i.value === state);
            return (
              <CheckboxRow
                key={state}
                label={state}
                count={facet?.count}
                checked={(filterJson.location_state ?? []).includes(state as LocationState)}
                onChange={(checked) =>
                  toggleStringArray('location_state', state, checked)
                }
              />
            );
          })}
        </FilterGroup>

        {/* 6. Bonus schemes */}
        <FilterGroup label="Bonus schemes">
          {BONUS_SCHEME_OPTIONS.map((scheme) => (
            <CheckboxRow
              key={scheme}
              label={scheme}
              checked={(filterJson.bonus_schemes ?? []).includes(scheme)}
              onChange={(checked) =>
                toggleStringArray('bonus_schemes', scheme, checked)
              }
            />
          ))}
        </FilterGroup>

        {/* More filters toggle */}
        <div className="py-3">
          <Separator className="mb-3 bg-fog" />
          <button
            type="button"
            onClick={() => setShowMore((v) => !v)}
            className="flex items-center gap-1 text-small-type font-medium text-charcoal-soft hover:text-charcoal"
          >
            {showMore ? (
              <>
                <ChevronUp size={14} /> Fewer filters
              </>
            ) : (
              <>
                <ChevronDown size={14} /> More filters
              </>
            )}
          </button>
        </div>

        {showMore && (
          <>
            {/* 7. Age */}
            <FilterGroup label="Age" defaultOpen={false}>
              {AGE_CATEGORY_OPTIONS.map((age) => (
                <CheckboxRow
                  key={age}
                  label={age}
                  checked={(filterJson.age_category ?? []).includes(age as AgeCategory)}
                  onChange={(checked) =>
                    toggleStringArray('age_category', age, checked)
                  }
                />
              ))}
            </FilterGroup>

            {/* 8. Sex */}
            <FilterGroup label="Sex" defaultOpen={false}>
              {SEX_OPTIONS.map((sex) => (
                <CheckboxRow
                  key={sex}
                  label={sex.charAt(0).toUpperCase() + sex.slice(1)}
                  checked={(filterJson.sex ?? []).includes(sex as Sex)}
                  onChange={(checked) =>
                    toggleStringArray('sex', sex, checked)
                  }
                />
              ))}
            </FilterGroup>

            {/* 9. Colour (top values from facets, fall back to schema values) */}
            <FilterGroup label="Colour" defaultOpen={false}>
              {(colourItems.length > 0
                ? colourItems.slice(0, 10)
                : COLOUR_OPTIONS.map((c) => ({ value: c, count: 0 }))
              ).map((item) => (
                <CheckboxRow
                  key={item.value}
                  label={item.value.charAt(0).toUpperCase() + item.value.slice(1)}
                  count={item.count > 0 ? item.count : undefined}
                  checked={(filterJson.colour ?? []).includes(item.value as Colour)}
                  onChange={(checked) =>
                    toggleStringArray('colour', item.value, checked)
                  }
                />
              ))}
            </FilterGroup>

            {/* 10. Dam sire */}
            <FilterGroup label="Dam sire" defaultOpen={false}>
              <SearchableList
                items={getFacetCounts(facetCounts, 'dam_sire')}
                selected={filterJson.dam_sire ?? []}
                onToggle={(v, checked) =>
                  toggleStringArray('dam_sire', v, checked)
                }
                placeholder="Search dam sires..."
              />
            </FilterGroup>

            {/* 11. Final shares only */}
            <FilterGroup label="Final shares only" defaultOpen={false}>
              <label className="flex cursor-pointer items-center justify-between py-1">
                <span className="text-small-type text-charcoal">
                  Show final shares only
                </span>
                <Switch
                  checked={finalOnly}
                  onCheckedChange={(checked) =>
                    pushParams(filterJson, checked)
                  }
                />
              </label>
            </FilterGroup>
          </>
        )}

        <div className="pt-3">
          <Separator className="mb-3 bg-fog" />
          <SaveSearchButton
            filterJson={filterJson}
            q={q}
            resultCount={resultCount}
            isLoggedIn={isLoggedIn}
          />
        </div>
      </div>
    </aside>
  );
}
