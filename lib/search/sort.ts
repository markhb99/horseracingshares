export const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'price_asc', label: 'Price: low–high' },
  { value: 'price_desc', label: 'Price: high–low' },
  { value: 'newest', label: 'Newest' },
] as const;

export type SortParam = (typeof SORT_OPTIONS)[number]['value'];

export const DEFAULT_SORT_PARAM: SortParam = 'relevance';

export function sortParamToTypesense(param: string): string {
  switch (param) {
    case 'price_asc':
      return 'price_min_cents:asc';
    case 'price_desc':
      return 'price_min_cents:desc';
    case 'newest':
      return 'created_at_unix:desc';
    default:
      return '_text_match:desc,has_final_shares:desc,created_at_unix:desc';
  }
}
