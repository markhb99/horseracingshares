'use client';

import { useState } from 'react';
import { Bookmark } from 'lucide-react';
import { SavedSearchModal } from '@/components/browse/SavedSearchModal';
import type { FilterJson } from '@/lib/search/filter-schema';

// ─── Types ────────────────────────────────────────────────────────

export interface SaveSearchButtonProps {
  filterJson: FilterJson;
  q: string;
  resultCount: number;
  isLoggedIn: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────

function hasActiveFilters(filterJson: FilterJson, q: string): boolean {
  if (q.trim()) return true;
  return (
    (filterJson.sire?.length ?? 0) > 0 ||
    (filterJson.dam?.length ?? 0) > 0 ||
    (filterJson.dam_sire?.length ?? 0) > 0 ||
    (filterJson.sex?.length ?? 0) > 0 ||
    (filterJson.colour?.length ?? 0) > 0 ||
    (filterJson.age_category?.length ?? 0) > 0 ||
    (filterJson.location_state?.length ?? 0) > 0 ||
    (filterJson.bonus_schemes?.length ?? 0) > 0 ||
    (filterJson.share_pcts?.length ?? 0) > 0 ||
    (filterJson.trainer?.length ?? 0) > 0 ||
    filterJson.price_min_cents != null ||
    filterJson.price_max_cents != null
  );
}

// ─── SaveSearchButton ─────────────────────────────────────────────

export function SaveSearchButton({
  filterJson,
  q,
  resultCount,
  isLoggedIn,
}: SaveSearchButtonProps) {
  const [open, setOpen] = useState(false);

  const disabled = !hasActiveFilters(filterJson, q);

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-full border border-fog px-4 py-2 text-small-type font-medium text-charcoal transition-colors hover:border-midnight hover:text-midnight disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Bookmark size={15} />
        Save this search
      </button>

      <SavedSearchModal
        open={open}
        onClose={() => setOpen(false)}
        filterJson={filterJson}
        q={q}
        resultCount={resultCount}
        isLoggedIn={isLoggedIn}
      />
    </>
  );
}
