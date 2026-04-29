/**
 * /syndicators/[slug] — Syndicator detail page.
 * Server component. Shows syndicator profile + their active horse listings.
 */

import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { searchHorses } from '@/lib/search/typesense-client';
import type { HorseHit } from '@/lib/search/typesense-client';
import { H1, H2, Small, Caption, Mono } from '@/components/typography';
import { HorseCard } from '@/components/horse/HorseCard';
import { AfslShield } from '@/components/icons';

// ─── generateStaticParams ─────────────────────────────────────────

export async function generateStaticParams() {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('syndicator')
    .select('slug')
    .not('afsl_verified_at', 'is', null)
    .is('deleted_at', null);

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
    .from('syndicator')
    .select('name, about')
    .eq('slug', slug)
    .is('deleted_at', null)
    .single();

  if (!data) return { title: 'Syndicator | Horse Racing Shares' };

  return {
    title: `${data.name} | Horse Racing Shares`,
    description:
      data.about ??
      `Browse racehorse syndication shares listed by ${data.name} on Horse Racing Shares.`,
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

function formatVerifiedDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-AU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// ─── SyndicatorDetail ─────────────────────────────────────────────

interface SyndicatorDetailProps {
  params: Promise<{ slug: string }>;
}

export default async function SyndicatorDetailPage({
  params,
}: SyndicatorDetailProps) {
  const { slug } = await params;
  const supabase = await createServerClient();

  const { data: syndicator } = await supabase
    .from('syndicator')
    .select('*')
    .eq('slug', slug)
    .is('deleted_at', null)
    .single();

  if (!syndicator) notFound();

  // Fetch this syndicator's active horses via Typesense using syndicator_id filter
  let horses: HorseHit[] = [];
  try {
    const result = await searchHorses({
      q: '*',
      rawFilterBy: `syndicator_id:=${syndicator.id}`,
      perPage: 24,
    });
    horses = result.hits;
  } catch {
    // Typesense unavailable — degrade gracefully, horses stays empty
  }

  const isVerified =
    syndicator.afsl_number != null && syndicator.afsl_verified_at != null;

  return (
    <main className="min-h-svh bg-paper pb-24">
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="border-b border-fog bg-white px-[var(--container-pad)] py-3"
      >
        <div className="mx-auto flex max-w-[var(--container-max)] items-center gap-2">
          <Link
            href="/syndicators"
            className="text-small-type font-medium text-charcoal-soft hover:text-midnight transition-colors"
          >
            Syndicators
          </Link>
          <span className="text-small-type text-charcoal-soft" aria-hidden="true">
            ›
          </span>
          <span className="text-small-type font-medium text-charcoal">
            {syndicator.name}
          </span>
        </div>
      </nav>

      <div className="mx-auto max-w-[var(--container-max)] px-[var(--container-pad)]">
        {/* Hero panel */}
        <section className="flex flex-col gap-6 py-10 sm:flex-row sm:items-start sm:gap-8">
          {/* Logo / initials */}
          <div className="shrink-0">
            {syndicator.logo_url ? (
              <div className="h-24 w-24 overflow-hidden rounded-full border border-fog">
                <Image
                  src={syndicator.logo_url}
                  alt={`${syndicator.name} logo`}
                  width={96}
                  height={96}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-midnight">
                <span className="text-h3 font-serif font-bold text-paper">
                  {syndicator.name
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((w: string) => w[0]?.toUpperCase() ?? '')
                    .join('')}
                </span>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 space-y-3">
            <H1 className="text-midnight">{syndicator.name}</H1>

            {/* AFSL + verified badge */}
            {isVerified && (
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <AfslShield
                    size={16}
                    className="text-success"
                    aria-hidden="true"
                  />
                  <Mono className="text-charcoal-soft">
                    AFSL {syndicator.afsl_number}
                  </Mono>
                </div>
                <span className="inline-flex items-center rounded-full bg-success/10 px-2.5 py-0.5">
                  <Caption className="font-medium text-success">
                    Verified
                  </Caption>
                </span>
              </div>
            )}

            {syndicator.location_state && (
              <Small>{syndicator.location_state}</Small>
            )}

            {syndicator.about && (
              <p className="text-body-type max-w-2xl text-charcoal-soft">
                {syndicator.about}
              </p>
            )}
          </div>
        </section>

        {/* Compliance panel */}
        {isVerified && (
          <div className="mb-10 rounded-lg bg-paper-dim p-4">
            <Caption className="text-charcoal">
              <span className="font-medium">
                AFSL {syndicator.afsl_number}
              </span>{' '}
              &middot; Verified {formatVerifiedDate(syndicator.afsl_verified_at!)}
              . Shares issued under {syndicator.name}&apos;s own Product
              Disclosure Statement.
            </Caption>
          </div>
        )}

        {/* Horse grid */}
        <section>
          <H2 className="mb-6 text-midnight">
            Horses listed by {syndicator.name}
          </H2>

          {horses.length === 0 ? (
            <div className="flex flex-col items-center py-20 text-center">
              <Small>No active listings from {syndicator.name} at this time.</Small>
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
