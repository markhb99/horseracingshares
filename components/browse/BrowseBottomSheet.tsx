'use client';

import { useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { SlidersHorizontal, ChevronDown, ChevronUp, X } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { FilterJson } from '@/lib/search/filter-schema';
import type { FacetCount } from '@/lib/search/typesense-client';
import { SaveSearchButton } from '@/components/browse/SaveSearchButton';

// ─── Types ────────────────────────────────────────────────────────

export interface BrowseBottomSheetProps {
  filterJson: FilterJson;
  facetCounts: FacetCount[];
  found: number;
  finalOnly: boolean;
  q: string;
  isLoggedIn: boolean;
}

// ─── Local helpers (duplicated from FilterRail to keep components isolated) ──

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

// ─── Sub-components ───────────────────────────────────────────────

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
    ? items.filter((i) => i.value.toLowerCase().includes(query.toLowerCase()))
    : items.slice(0, 10);

  return (
    <div className="space-y-1">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="h-7 border-fog bg-white text-small-type"
      />
      <div className="max-h-40 overflow-y-auto">
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
          <p className="text-caption-type py-2 text-charcoal-soft">No results</p>
        )}
      </div>
    </div>
  );
}

const PRICE_BUCKETS = [
  { label: 'Under $1k', minCents: 0, maxCents: null as number | null },
  { label: '$1k–$2.5k', minCents: 100000, maxCents: 249999 as number | null },
  { label: '$2.5k–$5k', minCents: 250000, maxCents: 499999 as number | null },
  { label: '$5k–$10k', minCents: 500000, maxCents: 999999 as number | null },
  { label: '$10k+', minCents: 1000000, maxCents: null as number | null },
];

const SHARE_PCT_OPTIONS = [1, 2, 5, 10, 20] as const;
const LOCATION_STATES = ['VIC', 'NSW', 'QLD', 'SA', 'WA', 'TAS', 'ACT', 'NT'] as const;
const BONUS_SCHEME_OPTIONS = ['BOBS', 'VOBIS', 'QTIS', 'Magic Millions', 'Inglis Xtra'];
const AGE_CATEGORY_OPTIONS = ['weanling', 'yearling', '2yo', '3yo', 'older'] as const;
const SEX_OPTIONS = ['colt', 'filly', 'gelding', 'mare', 'stallion'] as const;
const COLOUR_OPTIONS = ['bay', 'brown', 'chestnut', 'grey', 'black', 'roan'] as const;

type LocationState = (typeof LOCATION_STATES)[number];
type AgeCategory = (typeof AGE_CATEGORY_OPTIONS)[number];
type Sex = (typeof SEX_OPTIONS)[number];
type Colour = (typeof COLOUR_OPTIONS)[number];

// ─── BrowseBottomSheet ────────────────────────────────────────────

export function BrowseBottomSheet({
  filterJson,
  facetCounts,
  found,
  finalOnly,
  q,
  isLoggedIn,
}: BrowseBottomSheetProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Local draft state — applied only when "Show results" is tapped
  const [draftFilter, setDraftFilter] = useState<FilterJson>(filterJson);
  const [draftFinalOnly, setDraftFinalOnly] = useState(finalOnly);

  function applyAndClose() {
    const params = new URLSearchParams(searchParams.toString());
    const serialised = JSON.stringify(draftFilter);
    if (serialised === '{}') {
      params.delete('filters');
    } else {
      params.set('filters', serialised);
    }
    if (draftFinalOnly) {
      params.set('final', '1');
    } else {
      params.delete('final');
    }
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`);
    setOpen(false);
  }

  function toggleStringArray(
    key: 'sire' | 'dam' | 'dam_sire' | 'trainer' | 'location_state' | 'bonus_schemes' | 'sex' | 'colour' | 'age_category',
    value: string,
    checked: boolean,
  ) {
    const current = (draftFilter[key] as string[] | undefined) ?? [];
    const next = checked
      ? [...current, value]
      : current.filter((v) => v !== value);
    setDraftFilter((f) => ({ ...f, [key]: next.length ? next : undefined }));
  }

  function toggleSharePct(value: number, checked: boolean) {
    const current = draftFilter.share_pcts ?? [];
    const next = checked
      ? [...current, value]
      : current.filter((v) => v !== value);
    setDraftFilter((f) => ({
      ...f,
      share_pcts: next.length ? next : undefined,
    }));
  }

  function setPriceBucket(
    bucket: { minCents: number; maxCents: number | null },
    checked: boolean,
  ) {
    if (!checked) {
      setDraftFilter((f) => ({
        ...f,
        price_min_cents: undefined,
        price_max_cents: undefined,
      }));
      return;
    }
    setDraftFilter((f) => ({
      ...f,
      price_min_cents: bucket.minCents === 0 ? undefined : bucket.minCents,
      price_max_cents: bucket.maxCents ?? undefined,
    }));
  }

  function isActivePriceBucket(bucket: {
    minCents: number;
    maxCents: number | null;
  }): boolean {
    return (
      (draftFilter.price_min_cents ?? 0) === bucket.minCents &&
      (draftFilter.price_max_cents ?? null) === bucket.maxCents
    );
  }

  const activeCount = countActiveFilters(filterJson, finalOnly);
  const trainerItems = getFacetCounts(facetCounts, 'primary_trainer_name');
  const sireItems = getFacetCounts(facetCounts, 'sire');
  const colourItems = getFacetCounts(facetCounts, 'colour');
  const locationItems = getFacetCounts(facetCounts, 'location_state');

  return (
    <>
      {/* Sticky trigger bar — mobile only */}
      <div className="fixed bottom-0 left-0 right-0 z-[var(--z-sticky)] border-t border-fog bg-white px-4 py-3 md:hidden">
        <button
          type="button"
          onClick={() => {
            setDraftFilter(filterJson);
            setDraftFinalOnly(finalOnly);
            setOpen(true);
          }}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-midnight py-3 text-small-type font-semibold text-paper"
        >
          <SlidersHorizontal size={16} />
          Filters
          {activeCount > 0 && (
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brass text-caption-type font-bold text-midnight">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" showCloseButton={false} className="max-h-[85svh] flex flex-col p-0">
          <SheetHeader className="flex-row items-center justify-between px-4 pt-4 pb-0">
            <SheetTitle className="text-h5">Filters</SheetTitle>
            {countActiveFilters(draftFilter, draftFinalOnly) > 0 && (
              <button
                type="button"
                onClick={() => {
                  setDraftFilter({});
                  setDraftFinalOnly(false);
                }}
                className="text-caption-type text-charcoal-soft underline underline-offset-2"
              >
                Clear all
              </button>
            )}
            <SheetClose asChild>
              <button
                type="button"
                className="ml-auto flex h-8 w-8 items-center justify-center rounded-full hover:bg-fog"
                aria-label="Close filters"
              >
                <X size={16} />
              </button>
            </SheetClose>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4">
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
                  const active = (draftFilter.share_pcts ?? []).includes(pct);
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
                selected={draftFilter.trainer ?? []}
                onToggle={(v, checked) => toggleStringArray('trainer', v, checked)}
                placeholder="Search trainers..."
              />
            </FilterGroup>

            {/* 4. Sire */}
            <FilterGroup label="Sire">
              <SearchableList
                items={sireItems}
                selected={draftFilter.sire ?? []}
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
                    checked={(draftFilter.location_state ?? []).includes(state as LocationState)}
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
                  checked={(draftFilter.bonus_schemes ?? []).includes(scheme)}
                  onChange={(checked) =>
                    toggleStringArray('bonus_schemes', scheme, checked)
                  }
                />
              ))}
            </FilterGroup>

            {/* 7. Age */}
            <FilterGroup label="Age" defaultOpen={false}>
              {AGE_CATEGORY_OPTIONS.map((age) => (
                <CheckboxRow
                  key={age}
                  label={age}
                  checked={(draftFilter.age_category ?? []).includes(age as AgeCategory)}
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
                  checked={(draftFilter.sex ?? []).includes(sex as Sex)}
                  onChange={(checked) =>
                    toggleStringArray('sex', sex, checked)
                  }
                />
              ))}
            </FilterGroup>

            {/* 9. Colour */}
            <FilterGroup label="Colour" defaultOpen={false}>
              {(colourItems.length > 0
                ? colourItems.slice(0, 10)
                : COLOUR_OPTIONS.map((c) => ({ value: c, count: 0 }))
              ).map((item) => (
                <CheckboxRow
                  key={item.value}
                  label={item.value.charAt(0).toUpperCase() + item.value.slice(1)}
                  count={item.count > 0 ? item.count : undefined}
                  checked={(draftFilter.colour ?? []).includes(item.value as Colour)}
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
                selected={draftFilter.dam_sire ?? []}
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
                  checked={draftFinalOnly}
                  onCheckedChange={setDraftFinalOnly}
                />
              </label>
            </FilterGroup>

            {/* Bottom padding so content clears the footer */}
            <div className="h-4" />
          </div>

          <SheetFooter className="flex flex-col gap-2 border-t border-fog px-4 py-3">
            <SaveSearchButton
              filterJson={draftFilter}
              q={q}
              resultCount={found}
              isLoggedIn={isLoggedIn}
            />
            <Button
              className="w-full rounded-full bg-midnight py-3 text-small-type font-semibold text-paper hover:bg-midnight-light"
              onClick={applyAndClose}
            >
              Show {found.toLocaleString('en-AU')} result
              {found !== 1 ? 's' : ''}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
