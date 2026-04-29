'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { computeCalculator, DEFAULT_INPUTS } from '@/lib/calculator/compute';
import { useCountUp } from '@/lib/calculator/useCountUp';
import type { CalculatorInputs, CalculatorSeed } from '@/lib/calculator/types';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { H1, Lead, Caption, Small } from '@/components/typography';

// ─── Helpers ─────────────────────────────────────────────────────

function formatAUD(cents: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

// ─── SliderField ─────────────────────────────────────────────────

function SliderField({
  label,
  value,
  min,
  max,
  step,
  displayValue,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  displayValue: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-small-type font-medium text-charcoal">{label}</label>
        <span className="text-small-type font-semibold text-midnight">{displayValue}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-midnight"
      />
      <div className="flex justify-between">
        <Caption>{formatAUD(min * 100).replace('$', '').replace(/,/g, '')}...{/* just show range endpoints */}</Caption>
      </div>
    </div>
  );
}

// ─── BreakdownBar ─────────────────────────────────────────────────

function BreakdownBar({
  upfrontCents,
  ongoingTotal,
  raceStartTotal,
  totalProjectedCost,
}: {
  upfrontCents: number;
  ongoingTotal: number;
  raceStartTotal: number;
  totalProjectedCost: number;
}) {
  if (totalProjectedCost === 0) return null;

  const upfrontPct = (upfrontCents / totalProjectedCost) * 100;
  const ongoingPct = (ongoingTotal / totalProjectedCost) * 100;
  const racePct = 100 - upfrontPct - ongoingPct;

  return (
    <div className="space-y-2">
      <div className="flex h-4 w-full overflow-hidden rounded-full">
        <div
          className="bg-midnight transition-[width] duration-[320ms] ease-[var(--ease-emphasis)]"
          style={{ width: `${upfrontPct}%` }}
        />
        <div
          className="bg-brass transition-[width] duration-[320ms] ease-[var(--ease-emphasis)]"
          style={{ width: `${ongoingPct}%` }}
        />
        <div
          className="bg-fog border border-charcoal/20 transition-[width] duration-[320ms] ease-[var(--ease-emphasis)]"
          style={{ width: `${Math.max(racePct, 0)}%` }}
        />
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-midnight" />
          <Caption className="text-charcoal">Upfront</Caption>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-brass" />
          <Caption className="text-charcoal">Ongoing training</Caption>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-fog border border-charcoal/20" />
          <Caption className="text-charcoal">Race starts</Caption>
        </div>
      </div>
    </div>
  );
}

// ─── CostCalculator ───────────────────────────────────────────────

export function CostCalculator() {
  const [mode, setMode] = useState<'market' | 'manual'>('market');
  const [inputs, setInputs] = useState<CalculatorInputs>(DEFAULT_INPUTS);
  const [seed, setSeed] = useState<CalculatorSeed | null>(null);
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState('');

  // Fetch seed on mount when in market mode
  useEffect(() => {
    if (mode !== 'market') return;
    fetch('/api/calculator-seed')
      .then((r) => r.json())
      .then((data: CalculatorSeed | null) => {
        if (data) {
          setSeed(data);
          setInputs((prev) => ({
            ...prev,
            sharePct: data.sharePct,
            upfrontCents: data.upfrontCents,
          }));
        }
      })
      .catch(() => {/* silently stay on defaults */});
  }, [mode]);

  const outputs = computeCalculator(inputs);
  const animatedTotal = useCountUp(outputs.totalProjectedCost);

  function update(field: keyof CalculatorInputs, value: number | (1 | 2 | 3)) {
    setInputs((prev) => ({ ...prev, [field]: value }));
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEmailError('');
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          source: 'cost_calculator',
          metadata: {
            sharePct: inputs.sharePct,
            upfrontCents: inputs.upfrontCents,
            yearsHorizon: inputs.yearsHorizon,
            totalProjectedCost: outputs.totalProjectedCost,
          },
        }),
      });
      if (res.ok) {
        setEmailSent(true);
      } else {
        setEmailError('Please enter a valid email address.');
      }
    } catch {
      setEmailError('Something went wrong. Please try again.');
    }
  }

  return (
    <div className="mx-auto max-w-[var(--container-max)] px-[var(--container-pad)] py-12">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-8">
        <ol className="flex items-center gap-2 text-small-type text-charcoal-soft">
          <li><Link href="/" className="hover:text-midnight transition-colors">Home</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link href="/handbook" className="hover:text-midnight transition-colors">Handbook</Link></li>
          <li aria-hidden="true">/</li>
          <li className="text-charcoal" aria-current="page">The Numbers</li>
        </ol>
      </nav>

      <H1 className="font-serif text-midnight mb-3">The Numbers</H1>
      <Lead className="text-charcoal-soft mb-8 max-w-xl">
        What does a 2.5% share in a racehorse really cost over three years? Play with the sliders.
      </Lead>

      {/* Mode toggle */}
      <div className="inline-flex rounded-lg border border-fog bg-fog p-1 mb-8">
        <button
          type="button"
          onClick={() => setMode('market')}
          className={`rounded-md px-4 py-2 text-small-type font-medium transition-colors ${
            mode === 'market'
              ? 'bg-white text-midnight shadow-sm'
              : 'text-charcoal-soft hover:text-charcoal'
          }`}
        >
          From a horse on the market
        </button>
        <button
          type="button"
          onClick={() => setMode('manual')}
          className={`rounded-md px-4 py-2 text-small-type font-medium transition-colors ${
            mode === 'manual'
              ? 'bg-white text-midnight shadow-sm'
              : 'text-charcoal-soft hover:text-charcoal'
          }`}
        >
          Enter my own numbers
        </button>
      </div>

      {/* Market mode: seed horse link */}
      {mode === 'market' && seed && (
        <p className="text-small-type text-charcoal-soft mb-6">
          Based on{' '}
          <Link
            href={`/horse/${seed.horseSlug}`}
            className="text-midnight underline hover:text-brass"
          >
            {seed.horseName ?? 'a horse on the market'}
          </Link>{' '}
          — view listing →{' '}
          <span className="italic">
            Ongoing costs are estimates — check the listing for exact figures.
          </span>
        </p>
      )}

      {/* Two-column layout on desktop */}
      <div className="flex flex-col lg:flex-row gap-10">
        {/* Controls (left) */}
        <div className="lg:w-2/5 space-y-8">
          {/* Share size */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-small-type font-medium text-charcoal">Share size</label>
              <span className="text-small-type font-semibold text-midnight">{inputs.sharePct}%</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={25}
              step={0.5}
              value={inputs.sharePct}
              onChange={(e) => update('sharePct', Number(e.target.value))}
              className="w-full accent-midnight"
            />
            <div className="flex justify-between">
              <Caption>0.5%</Caption>
              <Caption>25%</Caption>
            </div>
          </div>

          {/* Upfront price — always shown */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-small-type font-medium text-charcoal">Upfront purchase price</label>
              <span className="text-small-type font-semibold text-midnight">{formatAUD(inputs.upfrontCents)}</span>
            </div>
            <input
              type="range"
              min={100_000}
              max={5_000_000}
              step={100_000}
              value={inputs.upfrontCents}
              onChange={(e) => update('upfrontCents', Number(e.target.value))}
              className="w-full accent-midnight"
            />
            <div className="flex justify-between">
              <Caption>$1,000</Caption>
              <Caption>$50,000</Caption>
            </div>
          </div>

          {/* Weekly ongoing cost */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-small-type font-medium text-charcoal">Weekly training cost (per 1% share)</label>
              <span className="text-small-type font-semibold text-midnight">
                {formatAUD(inputs.ongoingCentsPerPctPerWeek)}/wk per 1%
              </span>
            </div>
            <input
              type="range"
              min={1_000}
              max={10_000}
              step={500}
              value={inputs.ongoingCentsPerPctPerWeek}
              onChange={(e) => update('ongoingCentsPerPctPerWeek', Number(e.target.value))}
              className="w-full accent-midnight"
            />
            <div className="flex justify-between">
              <Caption>$10/wk</Caption>
              <Caption>$100/wk</Caption>
            </div>
          </div>

          {/* Races per year */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-small-type font-medium text-charcoal">Estimated race starts per year</label>
              <span className="text-small-type font-semibold text-midnight">{inputs.racesPerYear} starts/yr</span>
            </div>
            <input
              type="range"
              min={0}
              max={20}
              step={1}
              value={inputs.racesPerYear}
              onChange={(e) => update('racesPerYear', Number(e.target.value))}
              className="w-full accent-midnight"
            />
            <div className="flex justify-between">
              <Caption>0</Caption>
              <Caption>20</Caption>
            </div>
          </div>

          {/* Race start cost */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-small-type font-medium text-charcoal">Race start cost (per 1% share)</label>
              <span className="text-small-type font-semibold text-midnight">
                {formatAUD(inputs.raceStartCostCents)}/start per 1%
              </span>
            </div>
            <input
              type="range"
              min={10_000}
              max={200_000}
              step={10_000}
              value={inputs.raceStartCostCents}
              onChange={(e) => update('raceStartCostCents', Number(e.target.value))}
              className="w-full accent-midnight"
            />
            <div className="flex justify-between">
              <Caption>$100</Caption>
              <Caption>$2,000</Caption>
            </div>
          </div>

          {/* Time horizon segmented control */}
          <div className="space-y-1.5">
            <label className="text-small-type font-medium text-charcoal">Time horizon</label>
            <div className="inline-flex rounded-lg border border-fog bg-fog p-1 w-full">
              {([1, 2, 3] as const).map((yr) => (
                <button
                  key={yr}
                  type="button"
                  onClick={() => update('yearsHorizon', yr)}
                  className={`flex-1 rounded-md py-2 text-small-type font-medium transition-colors ${
                    inputs.yearsHorizon === yr
                      ? 'bg-white text-midnight shadow-sm'
                      : 'text-charcoal-soft hover:text-charcoal'
                  }`}
                >
                  {yr}yr
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Output card (right, sticky on desktop) */}
        <div className="lg:w-3/5 lg:sticky lg:top-24 self-start">
          <div className="rounded-xl border border-fog bg-white p-6 shadow-sm space-y-6">
            {/* Headline total */}
            <div>
              <Caption className="mb-1 text-charcoal">
                {inputs.yearsHorizon}-year projected cost ({inputs.sharePct}% share)
              </Caption>
              <H1 className="font-serif text-midnight tabular-nums">
                {formatAUD(animatedTotal)}
              </H1>
            </div>

            {/* Breakdown bar */}
            <BreakdownBar
              upfrontCents={inputs.upfrontCents}
              ongoingTotal={outputs.ongoingCentsPerYear * inputs.yearsHorizon}
              raceStartTotal={outputs.raceStartCostPerYear * inputs.yearsHorizon}
              totalProjectedCost={outputs.totalProjectedCost}
            />

            {/* Summary lines */}
            <div className="space-y-2 border-t border-fog pt-4">
              <div className="flex justify-between">
                <Small className="text-charcoal">Weekly commitment</Small>
                <Small className="font-semibold text-midnight">
                  {formatAUD(outputs.weeklyCost)}
                </Small>
              </div>
              <div className="flex justify-between">
                <Small className="text-charcoal">Monthly commitment</Small>
                <Small className="font-semibold text-midnight">
                  {formatAUD(outputs.monthlyCommitment)}
                </Small>
              </div>
              <div className="flex justify-between">
                <Small className="text-charcoal">Break-even prizemoney (gross horse)</Small>
                <Small className="font-semibold text-midnight">
                  {formatAUD(outputs.breakEvenPrizemoney)}
                </Small>
              </div>
            </div>

            {/* Compliance caveat — always visible */}
            <Caption className="text-charcoal-soft border-t border-fog pt-4 leading-relaxed">
              Estimates only — actual costs vary. Racing is unpredictable; horses may be
              injured, retired early, or race fewer times than projected. This is not
              financial advice. Shares are issued by the listed syndicator under their
              own Product Disclosure Statement.
            </Caption>
          </div>

          {/* Email capture */}
          <div className="mt-4 rounded-xl border border-fog bg-white p-5">
            {emailSent ? (
              <p className="text-small-type text-charcoal">
                Calculation sent to <strong>{email}</strong>. Check your inbox.
              </p>
            ) : (
              <form onSubmit={handleEmailSubmit} className="space-y-3">
                <Small className="font-medium text-charcoal">Email me this calculation</Small>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="flex-1 rounded-lg border border-fog px-3 py-2 text-small-type text-charcoal placeholder:text-charcoal-soft focus:outline-none focus:ring-2 focus:ring-midnight"
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-midnight px-4 py-2 text-small-type font-medium text-paper hover:bg-midnight-light transition-colors"
                  >
                    Send
                  </button>
                </div>
                {emailError && (
                  <Caption className="text-red-600">{emailError}</Caption>
                )}
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Methodology accordion */}
      <div className="mt-12 border-t border-fog pt-8">
        <Accordion type="single" collapsible>
          <AccordionItem value="methodology">
            <AccordionTrigger className="text-body-type font-medium text-midnight">
              How this calculator works
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 text-small-type text-charcoal leading-relaxed">
                <p>
                  This calculator estimates the total cost of owning a share in a racehorse
                  over your chosen time horizon. Here is what is included and how each figure
                  is calculated.
                </p>
                <p>
                  <strong>Upfront purchase price:</strong> The price you pay to acquire your
                  percentage share at the start of the syndicate. This is disclosed in the PDS
                  and covers the cost of the horse plus the syndicator&apos;s margin and fees.
                </p>
                <p>
                  <strong>Ongoing training costs:</strong> Calculated as weekly training cost
                  per 1% share, multiplied by your share percentage, multiplied by 52 weeks per
                  year, multiplied by your chosen time horizon. Training costs include the
                  trainer&apos;s daily fee, feed, routine farrier, and regular veterinary
                  inspections. They do not include extraordinary vet costs, surgery, or
                  prolonged rehabilitation.
                </p>
                <p>
                  <strong>Race start costs:</strong> Race day expenses — nomination, acceptance,
                  transport, and jockey fee — are estimated per 1% share per start, multiplied
                  by your share and the estimated number of starts per year. Not all horses race
                  as often as projected; this figure is an estimate only.
                </p>
                <p>
                  <strong>Break-even prizemoney:</strong> The total gross prizemoney the horse
                  would need to earn over its career for your ownership costs to be covered,
                  assuming 100% of prizemoney is distributed to connections. In practice,
                  trainer and jockey fees (approximately 15% combined) are deducted before
                  you see prizemoney, so actual break-even is higher.
                </p>
                <p>
                  <strong>What is not included:</strong> Extraordinary veterinary costs (bone
                  chips, surgery, extended rehabilitation); insurance premiums beyond what is
                  included in training fees; potential float or transport costs for interstate
                  campaigns; the Racing Australia owner registration fee; any syndication
                  management platform fees; and your own travel to attend trackwork or race days.
                </p>
                <p>
                  <strong>Prizemoney is not modelled.</strong> The calculator shows costs only.
                  Prizemoney is unpredictable — some horses win nothing; others earn far more
                  than their costs. Any prizemoney you receive reduces the net cost of ownership,
                  but you should plan your budget without it.
                </p>
                <p>
                  Estimates only — actual costs vary. This is not financial advice. Always read
                  the PDS before committing to any syndicate.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}
