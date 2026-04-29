# Cost calculator — implementation spec

> **Status:** v1 (Phase 5).
> **Audience:** builder implementing `/handbook/the-numbers`.
> **Route:** `app/handbook/the-numbers/page.tsx` (client component wrapper inside RSC shell).

---

## 1. TypeScript types — `lib/calculator/types.ts`

```ts
export interface CalculatorInputs {
  sharePct: number;                        // e.g. 5 (means 5%)
  upfrontCents: number;                    // purchase price for the share
  ongoingCentsPerPctPerWeek: number;       // weekly training cost per 1% share
  racesPerYear: number;                    // estimated race starts
  raceStartCostCents: number;              // cost per start per 1% share
  yearsHorizon: 1 | 2 | 3;
}

export interface CalculatorOutputs {
  ongoingCentsPerWeek: number;
  ongoingCentsPerYear: number;
  raceStartCostPerYear: number;
  totalYearlyCost: number;
  totalProjectedCost: number;
  breakEvenPrizemoney: number;             // gross horse prizemoney needed to break even
  monthlyCommitment: number;
  weeklyCost: number;
}

export interface CalculatorSeed {
  /** From the highest-view-count active horse with shares available */
  sharePct: number;
  upfrontCents: number;
  ongoingCentsPerPctPerWeek: number;
  horseName: string | null;
  horseSlug: string;
}
```

---

## 2. Calculation formula — `lib/calculator/compute.ts`

Pure function, no side-effects, no imports beyond types:

```ts
import type { CalculatorInputs, CalculatorOutputs } from './types';

export function computeCalculator(inputs: CalculatorInputs): CalculatorOutputs {
  const {
    sharePct,
    upfrontCents,
    ongoingCentsPerPctPerWeek,
    racesPerYear,
    raceStartCostCents,
    yearsHorizon,
  } = inputs;

  const ongoingCentsPerWeek = Math.round(ongoingCentsPerPctPerWeek * sharePct);
  const ongoingCentsPerYear = Math.round(ongoingCentsPerWeek * 52);
  // raceStartCostCents is per 1% share per start
  const raceStartCostPerYear = Math.round(raceStartCostCents * (sharePct / 100) * racesPerYear);
  const totalYearlyCost = ongoingCentsPerYear + raceStartCostPerYear;
  const totalProjectedCost = upfrontCents + totalYearlyCost * yearsHorizon;
  const breakEvenPrizemoney = Math.round(totalProjectedCost / (sharePct / 100));
  const monthlyCommitment = Math.round(totalYearlyCost / 12);
  const weeklyCost = Math.round(
    ongoingCentsPerWeek + (raceStartCostCents * (sharePct / 100) * racesPerYear) / 52
  );

  return {
    ongoingCentsPerWeek,
    ongoingCentsPerYear,
    raceStartCostPerYear,
    totalYearlyCost,
    totalProjectedCost,
    breakEvenPrizemoney,
    monthlyCommitment,
    weeklyCost,
  };
}
```

---

## 3. Default inputs

```ts
export const DEFAULT_INPUTS: CalculatorInputs = {
  sharePct: 5,
  upfrontCents: 500_000,           // $5,000
  ongoingCentsPerPctPerWeek: 4_000, // $40/wk per 1% → $200/wk for 5%
  racesPerYear: 10,
  raceStartCostCents: 50_000,       // $500/start per 1%
  yearsHorizon: 3,
};
```

---

## 4. Slider ranges and steps

| Field | Min | Max | Step | Display unit |
|---|---|---|---|---|
| `sharePct` | 0.5 | 25 | 0.5 | `%` |
| `upfrontCents` | 100_000 | 5_000_000 | 100_000 | `$` (divide by 100) |
| `ongoingCentsPerPctPerWeek` | 1_000 | 10_000 | 500 | `$/wk per 1%` |
| `racesPerYear` | 0 | 20 | 1 | `starts/yr` |
| `raceStartCostCents` | 10_000 | 200_000 | 10_000 | `$/start per 1%` |
| `yearsHorizon` | — | — | — | segmented control: 1yr / 2yr / 3yr |

---

## 5. "From a horse on the market" mode — `/api/calculator-seed`

A lightweight GET route that returns one horse's data to pre-populate the calculator.

```ts
// app/api/calculator-seed/route.ts
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
      ongoingCentsPerPctPerWeek: 4_000,   // horse_search_doc doesn't carry this field; use default
      horseName: hit.name ?? null,
      horseSlug: hit.slug,
    };
    return NextResponse.json(seed);
  } catch {
    return NextResponse.json(null);
  }
}
```

Note: `ongoing_cost_cents_per_pct_per_week` is not currently in the Typesense index hit type. The seed route returns the default value for that field; real values come from a future indexer update. The UI should show a note "Ongoing costs are estimates — check the listing for exact figures."

When the user selects "From a horse on the market", the client:
1. Fetches `/api/calculator-seed`
2. If successful, updates `sharePct` and `upfrontCents` from the seed and shows a link: "Based on [horseName] — view listing →"
3. If null/error, stays on manual defaults silently

---

## 6. Page layout — `app/handbook/the-numbers/page.tsx`

The RSC shell fetches nothing (all data is client-side). It exports metadata and renders `<CostCalculator />`.

```
Page structure (mobile, top-to-bottom):
1. Breadcrumb: Handbook > The Numbers
2. H1 "The Numbers"  (Fraunces)
3. Lead: "What does a 2.5% share in a racehorse really cost over three years? Play with the sliders."
4. Scenario toggle: "From a horse on the market" | "Enter my own numbers"  (segmented control)
5. Controls stack:
   - Share size slider
   - Upfront price slider (hidden in "from market" mode; shown in "own numbers" mode)
   - Weekly ongoing cost slider
   - Races per year slider
   - Race start cost slider
   - Time horizon: 1yr / 2yr / 3yr segmented control
6. Output card (sticky on desktop):
   - Large animated total (3-year projected cost)
   - Breakdown bar (upfront vs ongoing vs race starts — 3 segments, colour-coded)
   - Three summary lines: Weekly commitment / Monthly commitment / Break-even prizemoney
   - Permanent compliance caveat (see §7)
7. Email capture CTA: "Email me this calculation" — inline form, posts to /api/newsletter
8. Methodology accordion (closed by default):
   - 400-word explanation of the formula
   - Note on what's not included (vet fees beyond race starts, potential float costs, prizemoney tax)
9. Related horses (3 HorseCards from Typesense, most viewed)
10. Footer

Desktop: two-column layout — controls left (40%), output card right (60%, sticky top-24).
```

---

## 7. Compliance caveat (mandatory, always visible)

Render this text in `Caption` (charcoal-soft) directly beneath the output total, always visible regardless of scroll:

> "Estimates only — actual costs vary. Racing is unpredictable; horses may be injured, retired early, or race fewer times than projected. This is not financial advice. Shares are issued by the listed syndicator under their own Product Disclosure Statement."

---

## 8. Number tick-up animation

When any input changes, the headline 3-year total number animates from the previous value to the new value over **320ms** using `--ease-emphasis`.

Implementation — use a `useCountUp` hook with `requestAnimationFrame` (no Framer Motion required):

```ts
// lib/calculator/useCountUp.ts
import { useEffect, useRef, useState } from 'react';

export function useCountUp(target: number, duration = 320): number {
  const [displayed, setDisplayed] = useState(target);
  const prevRef = useRef(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const start = prevRef.current;
    const end = target;
    if (start === end) return;

    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-emphasis cubic: cubic-bezier(0.2, 0, 0.2, 1)
      const eased = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      setDisplayed(Math.round(start + (end - start) * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        prevRef.current = end;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);

  return displayed;
}
```

Use `useCountUp(outputs.totalProjectedCost)` to drive the displayed headline number. Format the result as AUD dollars: `new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(cents / 100)`.

---

## 9. Email capture

On "Email me this calculation" submit:

```ts
await fetch('/api/newsletter', {
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
```

The `/api/newsletter` route already exists and accepts this shape. On success, replace the form with: "Calculation sent to [email]. Check your inbox."

---

## 10. Breakdown bar

Three segments, left-to-right:
1. **Upfront** — `bg-midnight`, width = `upfrontCents / totalProjectedCost * 100%`
2. **Ongoing** — `bg-brass`, width = `(ongoingCentsPerYear * yearsHorizon) / totalProjectedCost * 100%`
3. **Race starts** — `bg-fog border border-charcoal/20`, width = remainder

Add a legend beneath: three coloured dots + labels. Transition widths over 320ms.

---

## 11. Files to create

| Path | Purpose |
|---|---|
| `lib/calculator/types.ts` | `CalculatorInputs`, `CalculatorOutputs`, `CalculatorSeed` types |
| `lib/calculator/compute.ts` | Pure `computeCalculator()` function |
| `lib/calculator/useCountUp.ts` | `requestAnimationFrame` count-up hook |
| `app/api/calculator-seed/route.ts` | GET — returns one seed horse |
| `app/handbook/the-numbers/page.tsx` | RSC shell — metadata + renders `<CostCalculator />` |
| `components/handbook/CostCalculator.tsx` | `'use client'` — all calculator UI and state |

---

*— spec v1, 2026-04-25*
