/**
 * /trainers/[slug] — Trainer detail page.
 * Server component. Shows trainer profile + their active horse listings.
 */

import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { searchHorses } from '@/lib/search/typesense-client';
import type { HorseHit } from '@/lib/search/typesense-client';
import { H1, H2, Small } from '@/components/typography';
import { HorseCard } from '@/components/horse/HorseCard';

// ─── generateStaticParams ─────────────────────────────────────────

export async function generateStaticParams() {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('trainer')
    .select('slug');

  return (data ?? []).map((row) => ({ slug: row.slug }));
}

// ─── generateMetadata ─────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createServerClient();
  const { data } = await supabase
    .from('trainer')
    .select('name, stable_name, about')
    .eq('slug', slug)
    .single();

  if (!data) return { title: 'Trainer | Horse Racing Shares' };

  const displayName = data.stable_name ?? data.name;
  return {
    title: `${displayName} | Horse Racing Shares`,
    description:
      data.about ??
      `Browse racehorse syndication shares trained by ${displayName} on Horse Racing Shares.`,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────

function horseHitToCard(hit: HorseHit) {
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

// ─── TrainerDetailPage ────────────────────────────────────────────

interface TrainerDetailProps {
  params: Promise<{ slug: string }>;
}

export default async function TrainerDetailPage({
  params,
}: TrainerDetailProps) {
  const { slug } = await params;
  const supabase = await createServerClient();

  const { data: trainer } = await supabase
    .from('trainer')
    .select('id, slug, name, stable_name, state, location, website_url, about')
    .eq('slug', slug)
    .single();

  if (!trainer) notFound();

  let horses: HorseHit[] = [];
  try {
    const result = await searchHorses({
      q: '*',
      rawFilterBy: `primary_trainer_id:=${trainer.id}`,
      perPage: 24,
    });
    horses = result.hits;
  } catch {
    // Typesense unavailable — degrade gracefully
  }

  const displayName = trainer.stable_name ?? trainer.name;
  const locationDisplay = trainer.location ?? trainer.state ?? null;

  return (
    <main className="min-h-svh bg-paper pb-24">
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="border-b border-fog bg-white px-[var(--container-pad)] py-3"
      >
        <div className="mx-auto flex max-w-[var(--container-max)] items-center gap-2">
          <Link
            href="/trainers"
            className="text-small-type font-medium text-charcoal-soft hover:text-midnight transition-colors"
          >
            Trainers
          </Link>
          <span className="text-small-type text-charcoal-soft" aria-hidden="true">
            ›
          </span>
          <span className="text-small-type font-medium text-charcoal">
            {displayName}
          </span>
        </div>
      </nav>

      <div className="mx-auto max-w-[var(--container-max)] px-[var(--container-pad)]">
        {/* Profile header */}
        <section className="flex flex-col gap-4 py-10">
          {/* Initials avatar */}
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-midnight">
            <span className="text-h3 font-serif font-bold text-paper">
              {displayName
                .split(/\s+/)
                .slice(0, 2)
                .map((w: string) => w[0]?.toUpperCase() ?? '')
                .join('')}
            </span>
          </div>

          <div className="space-y-2">
            <H1 className="text-midnight">{displayName}</H1>

            {/* Stable name subtitle when it differs from trainer name */}
            {trainer.stable_name && trainer.stable_name !== trainer.name && (
              <Small className="font-medium text-charcoal">
                Trainer: {trainer.name}
              </Small>
            )}

            {locationDisplay && (
              <Small className="text-charcoal-soft">{locationDisplay}</Small>
            )}

            {trainer.website_url && (
              <a
                href={trainer.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-small-type font-medium text-midnight hover:text-midnight-light transition-colors"
              >
                {trainer.website_url.replace(/^https?:\/\//, '')} ↗
              </a>
            )}

            {trainer.about && (
              <p className="max-w-2xl text-body-type text-charcoal-soft">
                {trainer.about}
              </p>
            )}
          </div>
        </section>

        {/* Horse grid */}
        <section>
          <H2 className="mb-6 text-midnight">
            Horses trained by {displayName}
          </H2>

          {horses.length === 0 ? (
            <div className="flex flex-col items-center py-20 text-center">
              <Small>No active listings for {displayName} at this time.</Small>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {horses.map((hit) => (
                <HorseCard key={hit.id} horse={horseHitToCard(hit)} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
