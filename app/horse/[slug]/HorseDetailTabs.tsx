'use client';

/**
 * HorseDetailTabs — client wrapper for the Overview / Pedigree tab switcher.
 * Kept as a thin shell so the parent RSC page stays a server component.
 */

import { useState } from 'react';
import Link from 'next/link';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
import { PedigreeTree } from '@/components/horse/PedigreeTree';
import { Caption, H3, Small } from '@/components/typography';
import type { PedigreeJson } from '@/types/pedigree';

// ─── VetStatus badge ──────────────────────────────────────────────────────────

function VetStatusBadge({
  cleared,
  label,
}: {
  cleared: boolean | null;
  label: string;
}) {
  const colour =
    cleared === true
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : cleared === false
      ? 'bg-red-50 text-red-700 border-red-200'
      : 'bg-fog text-charcoal-soft border-fog';
  const text =
    cleared === true ? 'Clear' : cleared === false ? 'Not clear' : 'Unknown';

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${colour}`}
    >
      <span
        className={`inline-block w-1.5 h-1.5 rounded-full ${
          cleared === true
            ? 'bg-emerald-500'
            : cleared === false
            ? 'bg-red-500'
            : 'bg-charcoal/30'
        }`}
        aria-hidden="true"
      />
      {label}: {text}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface HorseDetailTabsProps {
  horse: {
    id: string;
    sire: string;
    dam: string;
    vet_xray_clear: boolean | null;
    vet_scope_clear: boolean | null;
    vet_checked_at: string | null;
    bonus_schemes: string[];
    ongoing_cost_cents_per_pct_per_week: number | null;
  };
  pedigreeJson: PedigreeJson;
  horseName: string;
  sharePctsAvailable: number[];
  priceMinCents: number;
}

// ─── InlineCostCalc ───────────────────────────────────────────────────────────

function fmtAud(cents: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function InlineCostCalc({
  sharePctsAvailable,
  priceMinCents,
  ongoingCentsPerPctPerWeek,
}: {
  sharePctsAvailable: number[];
  priceMinCents: number;
  ongoingCentsPerPctPerWeek: number | null;
}) {
  const defaultPct =
    sharePctsAvailable.length > 0 ? sharePctsAvailable[0] : 5;
  const [selectedPct, setSelectedPct] = useState<number>(defaultPct);
  const [customPct, setCustomPct] = useState<string>(String(defaultPct));

  const activePct =
    sharePctsAvailable.length > 0
      ? selectedPct
      : Math.max(0.5, Math.min(25, parseFloat(customPct) || 5));

  const upfrontCents = Math.round(priceMinCents * (activePct / 100));
  const weeklyOngoingCents = ongoingCentsPerPctPerWeek
    ? Math.round(ongoingCentsPerPctPerWeek * activePct)
    : null;
  const yearlyOngoingCents = weeklyOngoingCents
    ? weeklyOngoingCents * 52
    : null;
  const threeYearTotalCents =
    upfrontCents > 0 && yearlyOngoingCents !== null
      ? upfrontCents + yearlyOngoingCents * 3
      : null;

  return (
    <div className="rounded-lg border border-fog bg-white p-4 space-y-4">
      <H3 className="text-midnight">Cost calculator</H3>

      {/* Share selector */}
      <div className="space-y-2">
        <Small className="text-charcoal-soft">Select your share percentage</Small>
        {sharePctsAvailable.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {sharePctsAvailable.map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => setSelectedPct(pct)}
                className={[
                  'rounded-full border px-3 py-1 text-sm font-medium transition-colors',
                  selectedPct === pct
                    ? 'border-midnight bg-midnight text-paper'
                    : 'border-fog bg-white text-charcoal hover:border-midnight/40',
                ].join(' ')}
              >
                {pct}%
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0.5"
              max="25"
              step="0.5"
              value={customPct}
              onChange={(e) => setCustomPct(e.target.value)}
              className="w-20 rounded-lg border border-fog bg-white px-3 py-2 text-sm text-charcoal outline-none focus:ring-2 focus:ring-midnight/30 focus:border-midnight"
            />
            <span className="text-sm text-charcoal-soft">%</span>
          </div>
        )}
      </div>

      {/* Projection table */}
      <div className="divide-y divide-fog rounded-lg border border-fog overflow-hidden">
        {priceMinCents > 0 && (
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-sm text-charcoal">Upfront cost ({activePct}% share)</span>
            <span className="text-sm font-semibold text-charcoal">{fmtAud(upfrontCents)}</span>
          </div>
        )}
        {weeklyOngoingCents !== null && (
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-sm text-charcoal">Weekly ongoing</span>
            <span className="text-sm font-semibold text-charcoal">{fmtAud(weeklyOngoingCents)}</span>
          </div>
        )}
        {yearlyOngoingCents !== null && (
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-sm text-charcoal">Yearly ongoing</span>
            <span className="text-sm font-semibold text-charcoal">{fmtAud(yearlyOngoingCents)}</span>
          </div>
        )}
        {threeYearTotalCents !== null && (
          <div className="flex items-center justify-between px-4 py-2.5 bg-midnight/5">
            <span className="text-sm font-semibold text-midnight">3-year total estimate</span>
            <span className="text-sm font-bold text-midnight">{fmtAud(threeYearTotalCents)}</span>
          </div>
        )}
        {priceMinCents === 0 && weeklyOngoingCents === null && (
          <div className="px-4 py-3">
            <Small className="text-charcoal-soft">Pricing not yet available. Contact the syndicator for details.</Small>
          </div>
        )}
      </div>

      {/* Caveat */}
      <Caption className="text-charcoal-soft">
        Estimates only — actual costs vary. Training, farrier, vet, and nomination fees may apply.
      </Caption>

      <Link
        href="/handbook/the-numbers"
        className="text-sm text-midnight underline underline-offset-2 hover:text-midnight/70 transition-colors"
      >
        See the full calculator &rarr;
      </Link>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function HorseDetailTabs({
  horse,
  pedigreeJson,
  horseName,
  sharePctsAvailable,
  priceMinCents,
}: HorseDetailTabsProps) {
  const hasVetData =
    horse.vet_xray_clear !== null ||
    horse.vet_scope_clear !== null ||
    horse.vet_checked_at !== null;

  const hasBonusSchemes = horse.bonus_schemes.length > 0;
  const weeklyCost = horse.ongoing_cost_cents_per_pct_per_week;

  function fmtDate(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-AU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  function formatCents(cents: number): string {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      maximumFractionDigits: 0,
    }).format(cents / 100);
  }

  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList variant="line" className="mb-6">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="pedigree">Pedigree</TabsTrigger>
      </TabsList>

      {/* ── Overview tab ──────────────────────────────────────────── */}
      <TabsContent value="overview" className="space-y-6">

        {/* Vet checks */}
        {hasVetData && (
          <div className="space-y-3">
            <H3 className="text-midnight">Veterinary checks</H3>
            <div className="flex flex-wrap gap-3">
              <VetStatusBadge cleared={horse.vet_xray_clear} label="X-ray" />
              <VetStatusBadge cleared={horse.vet_scope_clear} label="Scope" />
            </div>
            {horse.vet_checked_at && (
              <Caption className="text-charcoal-soft">
                Checked {fmtDate(horse.vet_checked_at)}
              </Caption>
            )}
          </div>
        )}

        {/* Bonus schemes */}
        {hasBonusSchemes && (
          <div className="space-y-3">
            <H3 className="text-midnight">Bonus schemes</H3>
            <div className="flex flex-wrap gap-2">
              {horse.bonus_schemes.map((scheme) => (
                <span
                  key={scheme}
                  className="inline-flex items-center rounded-full bg-midnight/10 px-3 py-1 text-xs font-medium text-midnight"
                >
                  {scheme}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Weekly cost */}
        {weeklyCost && (
          <div className="space-y-2 rounded-lg border border-fog bg-white p-4">
            <H3 className="text-midnight">Estimated ongoing costs</H3>
            <p className="text-h4 font-heading font-semibold text-charcoal">
              {formatCents(weeklyCost)}{' '}
              <span className="text-sm font-normal text-charcoal-soft">
                per week per 1% share
              </span>
            </p>
            <Caption className="text-charcoal-soft">
              Estimates only — actual costs vary. Training, farrier, vet, and
              nomination fees may apply.
            </Caption>
          </div>
        )}

        {/* Inline cost calculator */}
        <InlineCostCalc
          sharePctsAvailable={sharePctsAvailable}
          priceMinCents={priceMinCents}
          ongoingCentsPerPctPerWeek={weeklyCost}
        />

        {!hasVetData && !hasBonusSchemes && !weeklyCost && (
          <Small className="text-charcoal-soft">
            No additional overview information recorded. Contact the syndicator for details.
          </Small>
        )}
      </TabsContent>

      {/* ── Pedigree tab ──────────────────────────────────────────── */}
      <TabsContent value="pedigree">
        <PedigreeTree pedigreeJson={pedigreeJson} horseName={horseName} />
      </TabsContent>
    </Tabs>
  );
}
