import { SearchClient } from 'typesense';
import type { SearchResponse } from 'typesense/lib/Typesense/Documents';
import { filterToTypesense } from '@/lib/search/filter-to-typesense';
import type { FilterJson } from '@/lib/search/filter-schema';

// ─── Singleton ────────────────────────────────────────────────────

let _client: SearchClient | null = null;

function getClient(): SearchClient {
  if (_client) return _client;

  _client = new SearchClient({
    nodes: [
      {
        host: process.env.TYPESENSE_HOST ?? '159.13.51.164',
        port: Number(process.env.TYPESENSE_PORT ?? 8108),
        protocol: process.env.TYPESENSE_PROTOCOL ?? 'http',
      },
    ],
    apiKey: process.env.NEXT_PUBLIC_TYPESENSE_SEARCH_KEY ?? '',
    connectionTimeoutSeconds: 5,
  });

  return _client;
}

// ─── Types ────────────────────────────────────────────────────────

export interface HorseHit {
  id: string;
  slug: string;
  name: string | null;
  status: string;
  sire: string;
  dam: string;
  dam_sire: string | null;
  sex: 'colt' | 'filly' | 'gelding' | 'mare' | 'stallion';
  colour: string | null;
  foal_year: number | null;
  age_category: string | null;
  location_state: string;
  syndicator_name: string;
  syndicator_tier: string | null;
  is_regal_owned: boolean;
  primary_trainer_name: string | null;
  primary_trainer_slug: string | null;
  price_min_cents: number;
  price_max_cents: number;
  price_bucket: string | null;
  share_pcts_available: number[];
  total_shares_remaining: number;
  has_final_shares: boolean;
  bonus_schemes: string[];
  vet_xray_clear: boolean | null;
  vet_scope_clear: boolean | null;
  hero_image_path: string | null;
  view_count: number;
  created_at_unix: number;
}

export interface FacetCount {
  field_name: string;
  counts: Array<{
    count: number;
    highlighted: string;
    value: string;
  }>;
}

export interface SearchParams {
  q: string;
  filterJson?: FilterJson;
  sortBy?: string;
  page?: number;
  perPage?: number;
}

export interface HorseSearchResult {
  hits: HorseHit[];
  found: number;
  page: number;
  facet_counts: FacetCount[];
}

// ─── Facetable fields ─────────────────────────────────────────────

const FACET_FIELDS = [
  'status',
  'sire',
  'dam',
  'dam_sire',
  'sex',
  'colour',
  'foal_year',
  'age_category',
  'location_state',
  'syndicator_name',
  'syndicator_tier',
  'is_regal_owned',
  'primary_trainer_name',
  'price_bucket',
  'share_pcts_available',
  'has_final_shares',
  'bonus_schemes',
  'vet_xray_clear',
  'vet_scope_clear',
].join(',');

const DEFAULT_SORT =
  '_text_match:desc,has_final_shares:desc,view_count:desc,created_at_unix:desc';

// ─── searchHorses ─────────────────────────────────────────────────

export async function searchHorses(
  params: SearchParams,
): Promise<HorseSearchResult> {
  const {
    q,
    filterJson,
    sortBy = DEFAULT_SORT,
    page = 1,
    perPage = 24,
  } = params;

  const filterBy = filterToTypesense(filterJson ?? {});

  const response = (await getClient()
    .collections('horses')
    .documents()
    .search(
      {
        q: q || '*',
        query_by: 'name,sire,dam,dam_sire,syndicator_name,primary_trainer_name',
        query_by_weights: '3,5,5,2,2,2',
        num_typos: '1,1,1,1,0,0',
        prefix: 'true,true,true,true,false,false',
        infix: 'fallback',
        sort_by: sortBy,
        filter_by: filterBy,
        facet_by: FACET_FIELDS,
        max_facet_values: 50,
        page,
        per_page: perPage,
      },
      {},
    )) as SearchResponse<HorseHit>;

  const hits = (response.hits ?? []).map((h) => h.document);

  const facet_counts: FacetCount[] = (response.facet_counts ?? []).map((fc) => ({
    field_name: fc.field_name,
    counts: fc.counts.map((c) => ({
      count: c.count,
      highlighted: c.highlighted,
      value: c.value,
    })),
  }));

  return {
    hits,
    found: response.found,
    page: response.page,
    facet_counts,
  };
}
