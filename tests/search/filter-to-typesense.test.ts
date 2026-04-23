/**
 * Unit tests for lib/search/filter-to-typesense.ts.
 * Table-driven — each case describes an input filter + options and the
 * expected Typesense filter_by string.
 *
 * Source of truth: docs/search/saved-search.md §4.
 */

import { describe, it, expect } from 'vitest';
import { filterToTypesense } from '@/lib/search/filter-to-typesense';
import type { FilterJson } from '@/lib/search/filter-schema';

interface Case {
  label: string;
  filter: FilterJson;
  options?: { sinceUnix?: number };
  expected: string;
}

const cases: Case[] = [
  {
    label: 'empty filter defaults to status:=active',
    filter: {},
    expected: 'status:=active',
  },

  {
    label: 'sire array with multiple values — backtick-quoted',
    filter: { sire: ['Snitzel', 'Capitalist'] },
    expected: 'status:=active && sire:=[`Snitzel`,`Capitalist`]',
  },

  {
    label: 'sex: colt — enum value, no backticks',
    filter: { sex: ['colt'] },
    expected: 'status:=active && sex:=[colt]',
  },

  {
    label: 'price range uses price_min_cents for both bounds',
    filter: { price_min_cents: 500000, price_max_cents: 2000000 },
    expected:
      'status:=active && price_min_cents:>=500000 && price_min_cents:<=2000000',
  },

  {
    label: 'share_pcts maps to share_pcts_available',
    filter: { share_pcts: [2.5, 5] },
    expected: 'status:=active && share_pcts_available:=[2.5,5]',
  },

  {
    label: 'sinceUnix appends created_at_unix clause',
    filter: {},
    options: { sinceUnix: 1700000000 },
    expected: 'status:=active && created_at_unix:>1700000000',
  },

  {
    label: 'status: sold overrides the default active clause',
    filter: { status: ['sold'] },
    expected: 'status:=[sold]',
  },

  {
    label: 'status: active explicitly set — no duplication',
    filter: { status: ['active'] },
    expected: 'status:=[active]',
  },

  {
    label: 'dam with backtick in name — backtick escaped',
    filter: { sire: ["Redoute`s Choice"] },
    expected: 'status:=active && sire:=[`Redoute\\`s Choice`]',
  },

  {
    label: 'location_state array — no quoting (enum-like)',
    filter: { location_state: ['VIC', 'NSW'] },
    expected: 'status:=active && location_state:=[VIC,NSW]',
  },

  {
    label: 'bonus_schemes — backtick-quoted strings',
    filter: { bonus_schemes: ['BOBS', 'VOBIS'] },
    expected: 'status:=active && bonus_schemes:=[`BOBS`,`VOBIS`]',
  },

  {
    label: 'trainer — backtick-quoted',
    filter: { trainer: ['Ciaron Maher'] },
    expected: 'status:=active && primary_trainer_name:=[`Ciaron Maher`]',
  },

  {
    label: 'combined filter: sire + sex + location + sinceUnix',
    filter: {
      sire: ['Snitzel'],
      sex: ['colt'],
      location_state: ['VIC'],
    },
    options: { sinceUnix: 1700000000 },
    expected:
      'status:=active && sire:=[`Snitzel`] && sex:=[colt] && location_state:=[VIC] && created_at_unix:>1700000000',
  },
];

describe('filterToTypesense', () => {
  for (const { label, filter, options, expected } of cases) {
    it(label, () => {
      expect(filterToTypesense(filter, options)).toBe(expected);
    });
  }
});
