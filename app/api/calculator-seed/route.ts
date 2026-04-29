import { searchHorses } from '@/lib/search/typesense-client';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const result = await searchHorses({
      q: '*',
      sortBy: 'view_count:desc',
      perPage: 1,
    });
    const hit = result.hits[0];
    if (!hit) return NextResponse.json(null);

    const seed = {
      sharePct: hit.share_pcts_available?.[0] ?? 5,
      upfrontCents: hit.price_min_cents ?? 500_000,
      ongoingCentsPerPctPerWeek: 4_000, // horse_search_doc doesn't carry this field; use default
      horseName: hit.name ?? null,
      horseSlug: hit.slug,
    };
    return NextResponse.json(seed);
  } catch {
    return NextResponse.json(null);
  }
}
