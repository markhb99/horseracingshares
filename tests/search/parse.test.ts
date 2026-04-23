/**
 * Unit tests for lib/search/parse.ts.
 * Covers the relational query rewrite patterns plus passthrough behaviour.
 *
 * Source of truth: docs/search/typesense-schema.md §5.2.
 */

import { describe, it, expect } from 'vitest';
import { parseSearchQuery } from '@/lib/search/parse';

describe('parseSearchQuery', () => {
  it('"Snitzel sons" → sire filter, empty q', () => {
    expect(parseSearchQuery('Snitzel sons')).toEqual({
      q: '',
      filterOverrides: { sire: ['Snitzel'] },
    });
  });

  it('"Snitzel sons NSW" → sire filter, NSW stays in q', () => {
    expect(parseSearchQuery('Snitzel sons NSW')).toEqual({
      q: 'NSW',
      filterOverrides: { sire: ['Snitzel'] },
    });
  });

  it('"Zoustar daughters" → sire filter + filly sex', () => {
    expect(parseSearchQuery('Zoustar daughters')).toEqual({
      q: '',
      filterOverrides: { sire: ['Zoustar'], sex: ['filly'] },
    });
  });

  it('"by Frankel" → sire filter, empty q', () => {
    expect(parseSearchQuery('by Frankel')).toEqual({
      q: '',
      filterOverrides: { sire: ['Frankel'] },
    });
  });

  it('"out of Roman Belle" → dam filter, empty q', () => {
    expect(parseSearchQuery('out of Roman Belle')).toEqual({
      q: '',
      filterOverrides: { dam: ['Roman Belle'] },
    });
  });

  it('"Capitalist" (no pattern) → passthrough to q', () => {
    expect(parseSearchQuery('Capitalist')).toEqual({
      q: 'Capitalist',
      filterOverrides: {},
    });
  });

  it('empty string → empty q, no overrides', () => {
    expect(parseSearchQuery('')).toEqual({
      q: '',
      filterOverrides: {},
    });
  });

  it('case-insensitive: "SNITZEL SONS" same as lowercase', () => {
    expect(parseSearchQuery('SNITZEL SONS')).toEqual({
      q: '',
      filterOverrides: { sire: ['SNITZEL'] },
    });
  });

  it('"sons of Snitzel" → sire filter, empty q', () => {
    expect(parseSearchQuery('sons of Snitzel')).toEqual({
      q: '',
      filterOverrides: { sire: ['Snitzel'] },
    });
  });

  it('"daughters of Zoustar" → sire filter + filly sex', () => {
    expect(parseSearchQuery('daughters of Zoustar')).toEqual({
      q: '',
      filterOverrides: { sire: ['Zoustar'], sex: ['filly'] },
    });
  });

  it('"I Am Invincible colts" → sire filter + colt sex', () => {
    expect(parseSearchQuery('I Am Invincible colts')).toEqual({
      q: '',
      filterOverrides: { sire: ['I Am Invincible'], sex: ['colt'] },
    });
  });

  it('"by I Am Invincible" → sire filter', () => {
    expect(parseSearchQuery('by I Am Invincible')).toEqual({
      q: '',
      filterOverrides: { sire: ['I Am Invincible'] },
    });
  });

  it('preserves capitalisation as typed', () => {
    const result = parseSearchQuery("Redoute's Choice sons");
    expect(result.filterOverrides.sire).toEqual(["Redoute's Choice"]);
  });

  it('whitespace-only input → empty q', () => {
    expect(parseSearchQuery('   ')).toEqual({
      q: '',
      filterOverrides: {},
    });
  });
});
