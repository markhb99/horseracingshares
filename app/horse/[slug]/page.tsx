/**
 * Horse detail page.
 *
 * Server component. Fetches horse + syndicator + trainer via
 * createServerClient (uses session cookies for RLS).
 *
 * Structure (desktop 2-col):
 *   Left: hero placeholder, pedigree headline, meta, AFSL strip,
 *         PDS button, description, tabs (Overview | Pedigree).
 *   Right (sticky): share availability + EnquiryForm.
 */

import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import { H1, H3, Body, Small, Caption } from '@/components/typography';
import { SireDam } from '@/components/typography';
import { AfslShield } from '@/components/icons';
import { EnquiryForm } from '@/components/horse/EnquiryForm';
import { HorseDetailTabs } from '@/app/horse/[slug]/HorseDetailTabs';
import type { PedigreeJson } from '@/types/pedigree';

// ─── Types ────────────────────────────────────────────────────────────────────

interface HorseRow {
  id: string;
  slug: string;
  syndicator_id: string;
  primary_trainer_id: string | null;
  status: string;
  name: string | null;
  sire: string;
  dam: string;
  dam_sire: string | null;
  pedigree_json: PedigreeJson | null;
  foal_date: string | null;
  sex: string;
  colour: string | null;
  location_state: string;
  location_postcode: string | null;
  ongoing_cost_cents_per_pct_per_week: number | null;
  total_shares_available: number;
  total_shares_remaining: number;
  pds_url: string | null;
  pds_dated: string | null;
  vet_xray_clear: boolean | null;
  vet_scope_clear: boolean | null;
  vet_checked_at: string | null;
  description: string | null;
  bonus_schemes: string[];
  view_count: number;
  enquiry_count: number;
  wishlist_count: number;
  created_at: string;
  deleted_at: string | null;
  syndicator: SyndicatorRow | null;
  trainer: TrainerRow | null;
}

interface SyndicatorRow {
  id: string;
  slug: string;
  name: string;
  afsl_number: string | null;
  afsl_verified_at: string | null;
  contact_email: string;
  contact_name: string;
}

interface TrainerRow {
  id: string;
  slug: string;
  name: string;
  stable_name: string | null;
  state: string | null;
}

interface ShareTierRow {
  share_pct: number;
  price_cents: number;
  available: boolean;
}

// ─── generateMetadata ─────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  try {
    const supabase = await createServerClient();
    const { data: horse } = await supabase
      .from('horse')
      .select('name, sire, dam, description')
      .eq('slug', slug)
      .is('deleted_at', null)
      .single();

    if (!horse) return {};

    const title = horse.name ?? `${horse.sire} × ${horse.dam}`;
    return {
      title,
      description:
        horse.description?.slice(0, 155) ??
        `${title} — racehorse share available on Horse Racing Shares.`,
    };
  } catch {
    return {};
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-AU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function foalYear(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const y = new Date(dateStr).getFullYear();
  return isNaN(y) ? null : y;
}

function capitaliseSex(sex: string): string {
  return sex.charAt(0).toUpperCase() + sex.slice(1);
}

function formatCentsWeekly(cents: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HorseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createServerClient();

  // Fetch horse + syndicator + trainer using any-cast to handle relation types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAny = supabase as any;

  const { data: horseRaw } = await supabaseAny
    .from('horse')
    .select(
      `id, slug, syndicator_id, primary_trainer_id, status, name, sire, dam,
       dam_sire, pedigree_json, foal_date, sex, colour, location_state,
       location_postcode, ongoing_cost_cents_per_pct_per_week,
       total_shares_available, total_shares_remaining,
       pds_url, pds_dated, vet_xray_clear, vet_scope_clear, vet_checked_at,
       description, bonus_schemes, view_count, enquiry_count, wishlist_count,
       created_at, deleted_at,
       syndicator:syndicator_id(id, slug, name, afsl_number, afsl_verified_at, contact_email, contact_name),
       trainer:primary_trainer_id(id, slug, name, stable_name, state)`,
    )
    .eq('slug', slug)
    .is('deleted_at', null)
    .single();

  if (!horseRaw) {
    notFound();
  }

  const horse = horseRaw as HorseRow;

  // Fetch share tiers (table may not exist yet — graceful fallback)
  let shares: ShareTierRow[] = [];
  try {
    const { data: shareData } = await supabaseAny
      .from('share_tier')
      .select('share_pct, price_cents, available')
      .eq('horse_id', horse.id)
      .eq('available', true)
      .order('share_pct', { ascending: true });
    shares = (shareData as ShareTierRow[]) ?? [];
  } catch {
    // share_tier table not yet available
  }

  // Fetch hero image
  const { data: heroImageRow } = await supabaseAny
    .from('horse_image')
    .select('storage_path')
    .eq('horse_id', horse.id)
    .eq('is_hero', true)
    .maybeSingle();
  const heroStoragePath: string | null = heroImageRow?.storage_path ?? null;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const heroImageUrl = heroStoragePath
    ? `${supabaseUrl}/storage/v1/object/public/horse-photos/${heroStoragePath}`
    : null;

  const pedigreeJson: PedigreeJson = horse.pedigree_json ?? {};
  const horseName = horse.name ?? `${horse.sire} × ${horse.dam}`;
  const syndicator = horse.syndicator;
  const trainer = horse.trainer;
  const availableSharePcts = shares.map((s) => Number(s.share_pct));

  const hasAfsl = !!(syndicator?.afsl_number && syndicator?.afsl_verified_at);
  const hasPds = !!horse.pds_url;
  const foalYr = foalYear(horse.foal_date);
  const weeklyCostCents = horse.ongoing_cost_cents_per_pct_per_week;

  return (
    <main className="min-h-svh bg-paper pb-24">
      {/* ── Breadcrumb ────────────────────────────────────────────── */}
      <nav
        aria-label="Breadcrumb"
        className="border-b border-fog bg-paper"
      >
        <div className="mx-auto max-w-[var(--container-max)] px-[var(--container-pad)] py-3">
          <ol className="flex items-center gap-2 text-sm text-charcoal-soft">
            <li>
              <Link href="/browse" className="hover:text-charcoal transition-colors">
                Browse
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-charcoal font-medium truncate max-w-[200px]">
              {horseName}
            </li>
          </ol>
        </div>
      </nav>

      <div className="mx-auto max-w-[var(--container-max)] px-[var(--container-pad)]">
        <div className="grid grid-cols-1 gap-8 py-10 lg:grid-cols-[1fr_400px]">

          {/* ── Left: main content ──────────────────────────────── */}
          <div className="min-w-0">

            {/* Hero image */}
            {heroImageUrl ? (
              <div className="w-full rounded-xl overflow-hidden bg-fog mb-8 max-h-[520px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={heroImageUrl}
                  alt={horseName}
                  className="w-full h-full object-cover object-center max-h-[520px]"
                />
              </div>
            ) : null}

            {/* Headline */}
            <div className="space-y-2 mb-6">
              <H1 className="font-serif font-bold text-midnight leading-tight">
                <SireDam sire={horse.sire} dam={horse.dam} />
              </H1>

              {horse.name && (
                <p className="text-h3 font-heading font-semibold text-charcoal">
                  {horse.name}
                </p>
              )}
            </div>

            {/* Meta row */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mb-6">
              <Small className="text-charcoal">
                {capitaliseSex(horse.sex)}
              </Small>
              <Small>
                <Link
                  href={`/sires/${horse.sire.toLowerCase().replace(/['''`]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`}
                  className="text-midnight underline underline-offset-2 hover:text-midnight/70 transition-colors"
                >
                  {horse.sire}
                </Link>
              </Small>
              {foalYr && (
                <Small className="text-charcoal">
                  {foalYr} ({new Date().getFullYear() - foalYr}yo)
                </Small>
              )}
              {horse.colour && (
                <Small className="text-charcoal">{horse.colour}</Small>
              )}
              <Small className="text-charcoal">{horse.location_state}</Small>
              {horse.dam_sire && (
                <Small className="text-charcoal-soft">
                  out of {horse.dam} ({horse.dam_sire})
                </Small>
              )}
            </div>

            {/* Trainer link */}
            {trainer && (
              <div className="mb-5">
                <Small>
                  Trained by{' '}
                  <Link
                    href={`/trainers/${trainer.slug}`}
                    className="font-semibold text-midnight underline underline-offset-2 hover:text-midnight/70 transition-colors"
                  >
                    {trainer.stable_name ?? trainer.name}
                  </Link>
                  {trainer.state && (
                    <span className="text-charcoal-soft"> · {trainer.state}</span>
                  )}
                </Small>
              </div>
            )}

            {/* Syndicator info */}
            {syndicator && (
              <div className="mb-5">
                <Small className="text-charcoal-soft">
                  Listed by{' '}
                  <Link
                    href={`/syndicators/${syndicator.slug}`}
                    className="font-semibold text-charcoal hover:text-midnight transition-colors"
                  >
                    {syndicator.name}
                  </Link>
                </Small>
              </div>
            )}

            {/* AFSL compliance strip */}
            {hasAfsl && syndicator && (
              <div className="flex items-center gap-3 rounded-lg border border-fog bg-white px-4 py-3 mb-5">
                <AfslShield
                  className="h-5 w-5 text-midnight shrink-0"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-charcoal">
                    AFSL {syndicator.afsl_number}
                  </p>
                  <Caption className="text-charcoal-soft">
                    Verified {fmtDate(syndicator.afsl_verified_at)}
                  </Caption>
                </div>
                <span className="ml-auto shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  Verified
                </span>
              </div>
            )}

            {/* PDS download button */}
            {hasPds && (
              <div className="mb-6">
                <a
                  href={horse.pds_url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-midnight px-5 py-2.5 text-sm font-medium text-midnight hover:bg-midnight hover:text-paper transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Download PDS
                  {horse.pds_dated && (
                    <span className="text-charcoal-soft text-xs">
                      (dated {fmtDate(horse.pds_dated)})
                    </span>
                  )}
                  &rarr;
                </a>
              </div>
            )}

            {/* Description */}
            {horse.description && (
              <div className="mb-8">
                <Body className="text-charcoal whitespace-pre-line">
                  {horse.description}
                </Body>
              </div>
            )}

            {/* Tabs: Overview | Pedigree */}
            <HorseDetailTabs
              horse={{
                id: horse.id,
                sire: horse.sire,
                dam: horse.dam,
                vet_xray_clear: horse.vet_xray_clear,
                vet_scope_clear: horse.vet_scope_clear,
                vet_checked_at: horse.vet_checked_at,
                bonus_schemes: horse.bonus_schemes,
                ongoing_cost_cents_per_pct_per_week: weeklyCostCents,
              }}
              pedigreeJson={pedigreeJson}
              horseName={horseName}
              sharePctsAvailable={availableSharePcts}
              priceMinCents={shares.length ? Math.min(...shares.map((s) => Number(s.price_cents))) : 0}
            />

          </div>

          {/* ── Right: enquiry sidebar ───────────────────────────── */}
          <aside className="lg:sticky lg:top-24 lg:self-start space-y-4">

            {/* Share availability summary */}
            {shares.length > 0 && (
              <div className="rounded-lg border border-fog bg-white p-4 space-y-2">
                <H3 className="text-midnight">Shares available</H3>
                <div className="flex flex-col gap-2">
                  {shares.map((s) => (
                    <div
                      key={s.share_pct}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="font-medium text-charcoal">
                        {Number(s.share_pct)}% share
                      </span>
                      <span className="text-charcoal-soft">
                        {new Intl.NumberFormat('en-AU', {
                          style: 'currency',
                          currency: 'AUD',
                          maximumFractionDigits: 0,
                        }).format(s.price_cents / 100)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Running costs */}
            {weeklyCostCents && (
              <div className="rounded-lg border border-fog bg-white p-4 space-y-1">
                <Small className="text-charcoal-soft uppercase tracking-wider">
                  Estimated ongoing cost
                </Small>
                <p className="text-h5 font-heading font-semibold text-charcoal">
                  {formatCentsWeekly(weeklyCostCents)} / week per 1%
                </p>
                <Caption className="text-charcoal-soft">
                  Estimates only — actual costs vary.
                </Caption>
              </div>
            )}

            {/* Enquiry form */}
            {syndicator && (
              <EnquiryForm
                horseId={horse.id}
                horseSlug={horse.slug}
                horseName={horseName}
                syndicatorName={syndicator.name}
                availableSharePcts={availableSharePcts}
              />
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
