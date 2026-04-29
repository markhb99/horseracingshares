'use client';

/**
 * SearchInput — free-text search bar for the /browse page.
 *
 * Synced to the `q` URL param via useSearchParams.
 * On submit (Enter or button click) calls parseSearchQuery and pushes
 * a new URL with q + merged filterOverrides, resetting page to 1.
 */

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { parseSearchQuery } from '@/lib/search/parse';
import type { FilterJson } from '@/lib/search/filter-schema';
import { cn } from '@/lib/utils';

// ─── Helpers ─────────────────────────────────────────────────────

function mergeFilters(base: FilterJson, overrides: Partial<FilterJson>): FilterJson {
  const merged: FilterJson = { ...base };
  for (const _key of Object.keys(overrides) as (keyof FilterJson)[]) {
    const key = _key as keyof FilterJson;
    const val = overrides[key];
    if (val !== undefined) {
      // Type assertion required: overrides[key] is narrowed per key but
      // FilterJson is a discriminated union of array/scalar fields.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (merged as any)[key] = val;
    }
  }
  return merged;
}

// ─── SearchInput ──────────────────────────────────────────────────

export function SearchInput({ className }: { className?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialise from URL — keep in sync when URL changes externally.
  const urlQ = searchParams.get('q') ?? '';
  const [value, setValue] = useState(urlQ);

  useEffect(() => {
    setValue(urlQ);
  }, [urlQ]);

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();

    const { q, filterOverrides } = parseSearchQuery(value);

    // Parse current filters from URL and merge pattern overrides.
    let currentFilters: FilterJson = {};
    const rawFilters = searchParams.get('filters');
    if (rawFilters) {
      try {
        currentFilters = JSON.parse(rawFilters) as FilterJson;
      } catch {
        currentFilters = {};
      }
    }

    const merged = mergeFilters(currentFilters, filterOverrides);

    // Build new URL params.
    const params = new URLSearchParams(searchParams.toString());

    if (q) {
      params.set('q', q);
    } else {
      params.delete('q');
    }

    const filtersStr = JSON.stringify(merged);
    if (filtersStr !== '{}') {
      params.set('filters', filtersStr);
    } else {
      params.delete('filters');
    }

    // Reset to page 1 on new search.
    params.delete('page');

    router.push(`/browse?${params.toString()}`);
  }

  function handleClear() {
    setValue('');
    const params = new URLSearchParams(searchParams.toString());
    params.delete('q');
    params.delete('page');
    router.push(`/browse?${params.toString()}`);
    inputRef.current?.focus();
  }

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      className={cn('relative flex items-center', className)}
    >
      <label htmlFor="browse-search" className="sr-only">
        Search horses
      </label>
      <Search
        size={16}
        className="pointer-events-none absolute left-3 text-charcoal-soft"
        aria-hidden="true"
      />
      <input
        ref={inputRef}
        id="browse-search"
        type="search"
        autoComplete="off"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder='Search horses, sires… try "Snitzel sons"'
        className={cn(
          'h-10 w-full rounded-full border border-fog bg-white pl-9 pr-10',
          'text-small-type text-charcoal placeholder:text-charcoal-soft',
          'outline-none transition-colors',
          'focus:border-midnight focus:ring-2 focus:ring-midnight/20',
        )}
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={handleClear}
          className="absolute right-10 flex h-5 w-5 items-center justify-center rounded-full text-charcoal-soft hover:text-charcoal"
        >
          <X size={14} aria-hidden="true" />
        </button>
      )}
      <button
        type="submit"
        aria-label="Search"
        className={cn(
          'absolute right-2 flex h-7 w-7 items-center justify-center rounded-full',
          'bg-midnight text-paper transition-colors hover:bg-midnight-light',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        )}
      >
        <Search size={13} aria-hidden="true" />
      </button>
    </form>
  );
}
