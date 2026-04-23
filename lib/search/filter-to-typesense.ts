/**
 * Converts a FilterJson object into a Typesense filter_by string.
 *
 * Used by:
 *  - /browse page query builder
 *  - saved-search alert worker (with sinceUnix option)
 *
 * See docs/search/saved-search.md §4.
 */

import type { FilterJson } from '@/lib/search/filter-schema';

/**
 * Wrap a string value in Typesense backtick quoting.
 * Embedded backticks are escaped with a backslash.
 */
function q(value: string): string {
  return '`' + value.replace(/`/g, '\\`') + '`';
}

export interface FilterToTypesenseOptions {
  /** If set, appends created_at_unix:>{sinceUnix} to the filter string. */
  sinceUnix?: number;
}

/**
 * Convert a FilterJson to a Typesense filter_by string.
 *
 * The default status clause is always `status:=active` unless the filter
 * explicitly specifies a status array.
 */
export function filterToTypesense(
  filter: FilterJson,
  options: FilterToTypesenseOptions = {},
): string {
  const clauses: string[] = [];

  // Status: use the filter value when provided; otherwise default to active.
  if (filter.status?.length) {
    clauses.push(`status:=[${filter.status.join(',')}]`);
  } else {
    clauses.push('status:=active');
  }

  // Pedigree — string arrays use backtick quoting
  if (filter.sire?.length) {
    clauses.push(`sire:=[${filter.sire.map(q).join(',')}]`);
  }
  if (filter.dam?.length) {
    clauses.push(`dam:=[${filter.dam.map(q).join(',')}]`);
  }
  if (filter.dam_sire?.length) {
    clauses.push(`dam_sire:=[${filter.dam_sire.map(q).join(',')}]`);
  }

  // Physical attributes — enum values do not need backtick quoting
  if (filter.sex?.length) {
    clauses.push(`sex:=[${filter.sex.join(',')}]`);
  }
  if (filter.colour?.length) {
    clauses.push(`colour:=[${filter.colour.join(',')}]`);
  }
  if (filter.age_category?.length) {
    clauses.push(`age_category:=[${filter.age_category.join(',')}]`);
  }

  // Location
  if (filter.location_state?.length) {
    clauses.push(`location_state:=[${filter.location_state.join(',')}]`);
  }

  // Bonus schemes — string values use backtick quoting
  if (filter.bonus_schemes?.length) {
    clauses.push(`bonus_schemes:=[${filter.bonus_schemes.map(q).join(',')}]`);
  }

  // Share sizes — numeric array, no quoting needed
  if (filter.share_pcts?.length) {
    clauses.push(`share_pcts_available:=[${filter.share_pcts.join(',')}]`);
  }

  // Trainer — string value uses backtick quoting
  if (filter.trainer?.length) {
    clauses.push(`primary_trainer_name:=[${filter.trainer.map(q).join(',')}]`);
  }

  // Price range — both bounds filter against price_min_cents per spec
  if (filter.price_min_cents != null) {
    clauses.push(`price_min_cents:>=${filter.price_min_cents}`);
  }
  if (filter.price_max_cents != null) {
    clauses.push(`price_min_cents:<=${filter.price_max_cents}`);
  }

  // Freshness clause appended by the saved-search worker
  if (options.sinceUnix != null) {
    clauses.push(`created_at_unix:>${options.sinceUnix}`);
  }

  return clauses.join(' && ');
}
