import { searchHorses } from '@/lib/search/typesense-client';
import type { HorseHit } from '@/lib/search/typesense-client';
import { HorseCard } from '@/components/horse/HorseCard';
import type { HorseCardHorse } from '@/components/horse/HorseCard';

interface RelatedHorsesProps {
  filter: string | null;
  limit?: number;
}

function hitToCard(hit: HorseHit): HorseCardHorse {
  return {
    slug: hit.slug,
    name: hit.name,
    sire: hit.sire,
    dam: hit.dam,
    damSire: hit.dam_sire,
    sex: hit.sex,
    foalYear: hit.foal_year,
    locationState: hit.location_state,
    primaryTrainerName: hit.primary_trainer_name,
    primaryTrainerSlug: hit.primary_trainer_slug,
    priceMinCents: hit.price_min_cents,
    sharePctsAvailable: hit.share_pcts_available ?? [],
    totalSharesRemaining: hit.total_shares_remaining,
    hasFinalShares: hit.has_final_shares,
    bonusSchemes: hit.bonus_schemes ?? [],
    heroImagePath: hit.hero_image_path,
  };
}

export async function RelatedHorses({ filter, limit = 3 }: RelatedHorsesProps) {
  try {
    const result = await searchHorses({
      q: '*',
      rawFilterBy: filter ?? undefined,
      perPage: limit,
      sortBy: 'view_count:desc',
    });

    if (!result.hits.length) return null;

    return (
      <section className="mt-12">
        <h2 className="text-h3 font-serif text-midnight mb-6">
          Horses currently available
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {result.hits.map((hit) => (
            <HorseCard key={hit.id} horse={hitToCard(hit)} />
          ))}
        </div>
      </section>
    );
  } catch {
    return null;
  }
}
