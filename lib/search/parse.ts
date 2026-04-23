/**
 * App-side query rewriter for relational pedigree expressions.
 *
 * Handles patterns like "Snitzel sons" → filter sire:=Snitzel, so that the
 * filter chip in the UI can light up and Typesense receives a precise filter
 * rather than a fuzzy text search.
 *
 * See docs/search/typesense-schema.md §5.2.
 */

import type { FilterJson } from '@/lib/search/filter-schema';

export interface ParsedSearchQuery {
  /** The text term to pass as Typesense q=. Empty string means filter-only. */
  q: string;
  /** Filter overrides derived from the pattern match. */
  filterOverrides: Partial<FilterJson>;
}

/**
 * Parse a free-text search query string into a q term and optional filter
 * overrides. Recognised patterns (case-insensitive):
 *
 *  - "{X} sons"       → sire: [X]
 *  - "sons of {X}"    → sire: [X]
 *  - "{X} daughters"  → sire: [X], sex: ['filly']
 *  - "daughters of {X}" → sire: [X], sex: ['filly']
 *  - "{X} colts"      → sire: [X], sex: ['colt']
 *  - "by {X}"         → sire: [X]
 *  - "out of {X}"     → dam: [X]
 *
 * When a pattern matches, the extracted sire/dam name preserves the
 * capitalisation as typed. Any remaining tokens that didn't form part
 * of the matched pattern stay in q.
 */
export function parseSearchQuery(input: string): ParsedSearchQuery {
  const trimmed = input.trim();

  if (!trimmed) {
    return { q: '', filterOverrides: {} };
  }

  // "sons of {X}" or "daughters of {X}"
  const sonsOf = /^sons\s+of\s+(.+)$/i.exec(trimmed);
  if (sonsOf) {
    return {
      q: '',
      filterOverrides: { sire: [sonsOf[1].trim()] },
    };
  }

  const daughtersOf = /^daughters\s+of\s+(.+)$/i.exec(trimmed);
  if (daughtersOf) {
    return {
      q: '',
      filterOverrides: { sire: [daughtersOf[1].trim()], sex: ['filly'] },
    };
  }

  // "by {X}"
  const byX = /^by\s+(.+)$/i.exec(trimmed);
  if (byX) {
    return {
      q: '',
      filterOverrides: { sire: [byX[1].trim()] },
    };
  }

  // "out of {X}"
  const outOf = /^out\s+of\s+(.+)$/i.exec(trimmed);
  if (outOf) {
    return {
      q: '',
      filterOverrides: { dam: [outOf[1].trim()] },
    };
  }

  // "{X} sons [rest]" — match first word(s) before "sons", leave rest in q
  // Strategy: split on "sons" / "daughters" / "colts" (case-insensitive),
  // first token(s) become sire, any trailing tokens become q.
  const xSons = /^(.+?)\s+sons(?:\s+(.+))?$/i.exec(trimmed);
  if (xSons) {
    const sire = xSons[1].trim();
    const remainder = xSons[2]?.trim() ?? '';
    return {
      q: remainder,
      filterOverrides: { sire: [sire] },
    };
  }

  const xDaughters = /^(.+?)\s+daughters(?:\s+(.+))?$/i.exec(trimmed);
  if (xDaughters) {
    const sire = xDaughters[1].trim();
    const remainder = xDaughters[2]?.trim() ?? '';
    return {
      q: remainder,
      filterOverrides: { sire: [sire], sex: ['filly'] },
    };
  }

  const xColts = /^(.+?)\s+colts(?:\s+(.+))?$/i.exec(trimmed);
  if (xColts) {
    const sire = xColts[1].trim();
    const remainder = xColts[2]?.trim() ?? '';
    return {
      q: remainder,
      filterOverrides: { sire: [sire], sex: ['colt'] },
    };
  }

  // No pattern matched — pass the whole string as a text query
  return { q: trimmed, filterOverrides: {} };
}
