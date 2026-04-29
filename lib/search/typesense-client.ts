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
  /** Raw Typesense filter_by string appended (with &&) after the FilterJson clauses. */
  rawFilterBy?: string;
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
  '_text_match:desc,has_final_shares:desc,created_at_unix:desc';

// ─── Supabase fallback ────────────────────────────────────────────
// Used when Typesense is unreachable (dev, cold start, server down).
// Queries the horse table directly; no faceting, basic text match.

async function searchHorsesFromDb(
  params: SearchParams,
): Promise<HorseSearchResult> {
  const { createServiceClient } = await import('@/lib/supabase/service');
  const db = createServiceClient();

  const page = params.page ?? 1;
  const perPage = params.perPage ?? 24;
  const offset = (page - 1) * perPage;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query = (db as any)
    .from('horse')
    .select(
      'id,slug,name,status,sire,dam,dam_sire,sex,colour,foal_date,location_state,bonus_schemes,vet_xray_clear,vet_scope_clear,total_shares_remaining,share_listings,created_at,syndicator:syndicator_id(name),horse_image(storage_path,is_hero)',
      { count: 'exact' },
    )
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + perPage - 1);

  if (params.q) {
    query.or(`sire.ilike.%${params.q}%,dam.ilike.%${params.q}%,name.ilike.%${params.q}%`);
  }

  const { data, count } = await query;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hits: HorseHit[] = (data ?? []).map((h: any) => {
    type ShareRow = { pct: number; price_cents: number; available: boolean };
    const listings: ShareRow[] = h.share_listings ?? [];
    const avail = listings.filter((s) => s.available);
    const priceMin = avail.length ? Math.min(...avail.map((s) => s.price_cents)) : 0;
    const priceMax = avail.length ? Math.max(...avail.map((s) => s.price_cents)) : 0;
    return {
      id: h.id,
      slug: h.slug,
      name: h.name,
      status: h.status,
      sire: h.sire,
      dam: h.dam,
      dam_sire: h.dam_sire ?? null,
      sex: h.sex,
      colour: h.colour ?? null,
      foal_year: h.foal_date ? new Date(h.foal_date).getFullYear() : null,
      age_category: null,
      location_state: h.location_state,
      syndicator_name: h.syndicator?.name ?? '',
      syndicator_tier: null,
      is_regal_owned: false,
      primary_trainer_name: null,
      primary_trainer_slug: null,
      price_min_cents: priceMin,
      price_max_cents: priceMax,
      price_bucket: null,
      share_pcts_available: avail.map((s) => s.pct),
      total_shares_remaining: h.total_shares_remaining,
      has_final_shares: Number(h.total_shares_remaining) <= 2.0,
      bonus_schemes: h.bonus_schemes ?? [],
      vet_xray_clear: h.vet_xray_clear ?? null,
      vet_scope_clear: h.vet_scope_clear ?? null,
      hero_image_path: (h.horse_image as Array<{storage_path: string; is_hero: boolean}> ?? [])
        .find((i) => i.is_hero)?.storage_path
        ?? (h.horse_image as Array<{storage_path: string}> ?? [])[0]?.storage_path
        ?? null,
      view_count: 0,
      created_at_unix: Math.floor(new Date(h.created_at).getTime() / 1000),
    };
  });

  return { hits, found: count ?? hits.length, page, facet_counts: [] };
}

// ─── searchHorses ─────────────────────────────────────────────────

export async function searchHorses(
  params: SearchParams,
): Promise<HorseSearchResult> {
  const {
    q,
    filterJson,
    rawFilterBy,
    sortBy = DEFAULT_SORT,
    page = 1,
    perPage = 24,
  } = params;

  // filterToTypesense always appends status:=active unless filterJson.status is set
  const baseFilter = filterToTypesense(filterJson ?? {});
  const filterBy = rawFilterBy ? `${baseFilter} && ${rawFilterBy}` : baseFilter;

  try {
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
  } catch {
    return searchHorsesFromDb({ q, filterJson, page, perPage });
  }
}
