import { notFound } from 'next/navigation';

import { createServiceClient } from '@/lib/supabase/service';
import { Display, H3, Body, Caption } from '@/components/typography';
import { HorseCard } from '@/components/horse/HorseCard';

/**
 * Dev-only showcase route for the four HorseCard variants.
 * Hidden in production — returns 404.
 *
 * Uses service-role fetch (no RLS) — safe because this page is
 * gated behind NODE_ENV !== 'development'.
 */
export default async function CardsShowcasePage() {
  if (process.env.NODE_ENV !== 'development') {
    notFound();
  }

  const supabase = createServiceClient();

  // Three seed horses cover the variants. Use real pedigrees so the layout
  // exercises italic sire × dam, long names, and the share-status line.
  const slugs = [
    'regal-captain-flyer',
    'regal-star-of-rome',
    'regal-gold-verdict',
  ] as const;

  const { data: rows } = await supabase
    .from('horse')
    .select(
      `
      slug, name, sire, dam, dam_sire, sex, foal_date, location_state,
      total_shares_remaining, bonus_schemes,
      primary_trainer:trainer!horse_primary_trainer_id_fkey ( slug, name ),
      share_tier ( share_pct, price_cents, available ),
      horse_image ( storage_path, is_hero )
      `,
    )
    .in('slug', slugs);

  const horses = (rows ?? []).map(projectRow);
  // Stable order: match the `slugs` array.
  horses.sort((a, b) => slugs.indexOf(a.slug as typeof slugs[number]) - slugs.indexOf(b.slug as typeof slugs[number]));

  const standard  = horses[0];
  const editorial = horses[1];
  const sold      = horses[2] ? { ...horses[2], hasFinalShares: false } : null;
  const compact   = horses[0];

  return (
    <main className="min-h-svh bg-background px-6 py-16">
      <div className="mx-auto w-full max-w-5xl flex flex-col gap-12">
        <header className="flex flex-col gap-3">
          <Caption className="uppercase tracking-[0.2em]">Dev showcase</Caption>
          <Display>HorseCard variants</Display>
          <Body className="max-w-xl text-charcoal-soft">
            Four variants from design-system.md §3.2.1, rendered with live seed data.
            Hidden in production via <code>notFound()</code>.
          </Body>
        </header>

        {standard && (
          <section className="flex flex-col gap-4">
            <H3>Standard</H3>
            <div className="max-w-sm">
              <HorseCard horse={standard} />
            </div>
          </section>
        )}

        {editorial && (
          <section className="flex flex-col gap-4">
            <H3>Editorial (Horse of the Week)</H3>
            <div className="max-w-3xl">
              <HorseCard variant="editorial" horse={editorial} />
            </div>
          </section>
        )}

        {compact && (
          <section className="flex flex-col gap-4">
            <H3>Compact (email, also-listed strip)</H3>
            <div className="max-w-md">
              <HorseCard variant="compact" horse={compact} />
            </div>
          </section>
        )}

        {sold && (
          <section className="flex flex-col gap-4">
            <H3>Sold</H3>
            <div className="max-w-sm">
              <HorseCard variant="sold" horse={sold} />
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

// ─── row projection ───────────────────────────────────────────
type SupabaseHorseRow = {
  slug: string;
  name: string | null;
  sire: string;
  dam: string;
  dam_sire: string | null;
  sex: 'colt' | 'filly' | 'gelding' | 'mare' | 'stallion';
  foal_date: string | null;
  location_state: string;
  total_shares_remaining: number;
  bonus_schemes: string[] | null;
  primary_trainer: { slug: string; name: string } | { slug: string; name: string }[] | null;
  share_tier: Array<{ share_pct: number; price_cents: number; available: boolean }> | null;
  horse_image: Array<{ storage_path: string; is_hero: boolean }> | null;
};

function projectRow(row: SupabaseHorseRow) {
  const availableTiers = (row.share_tier ?? []).filter((t) => t.available);
  const sharePctsAvailable = availableTiers.map((t) => t.share_pct).sort((a, b) => a - b);
  const priceMinCents = availableTiers.length
    ? Math.min(...availableTiers.map((t) => t.price_cents))
    : 0;
  const hero = (row.horse_image ?? []).find((i) => i.is_hero);
  const trainer = Array.isArray(row.primary_trainer)
    ? row.primary_trainer[0] ?? null
    : row.primary_trainer;

  return {
    slug: row.slug,
    name: row.name,
    sire: row.sire,
    dam: row.dam,
    damSire: row.dam_sire,
    sex: row.sex,
    foalYear: row.foal_date ? new Date(row.foal_date).getFullYear() : null,
    locationState: row.location_state,
    primaryTrainerName: trainer?.name ?? null,
    primaryTrainerSlug: trainer?.slug ?? null,
    priceMinCents,
    sharePctsAvailable,
    totalSharesRemaining: row.total_shares_remaining,
    hasFinalShares: row.total_shares_remaining <= 2,
    bonusSchemes: row.bonus_schemes ?? [],
    heroImagePath: hero?.storage_path ?? null,
  };
}
