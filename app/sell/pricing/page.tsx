/**
 * /sell/pricing — Listing tier pricing page.
 * Server component. Fetches active tiers from Supabase, renders 3-column card grid.
 */

import Link from 'next/link';
import { Check } from 'lucide-react';
import type { Metadata } from 'next';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { H1, H2, Lead, Body, Caption } from '@/components/typography';
import { createServerClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Listing prices | Horse Racing Shares',
  description:
    'Choose a listing tier and reach Australia\'s most engaged community of prospective racehorse owners.',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface ListingTierRow {
  id: string;
  code: string;
  name: string;
  price_cents_per_listing: number | null;
  stripe_price_id: string | null;
  features_json: Record<string, unknown>;
}

// ─── Static feature labels (ordered) ─────────────────────────────────────────

function buildFeatureList(code: string): string[] {
  if (code === 'basic') {
    return [
      '90-day listing',
      '1 photo',
      'Standard placement',
      'Enquiry capture + forwarding',
      'AFSL badge displayed',
      'Buyer lead data',
    ];
  }
  if (code === 'premium') {
    return [
      '90-day listing',
      '10 photos',
      'Featured badge',
      'Priority placement on browse',
      'Enquiry capture + forwarding',
      'AFSL badge displayed',
      'Buyer lead data',
    ];
  }
  if (code === 'elite') {
    return [
      '90-day listing',
      'Unlimited photos',
      'Homepage feature slot',
      'Matched-buyer email campaign',
      'Featured badge',
      'Enquiry capture + forwarding',
      'AFSL badge displayed',
      'Dedicated listing analytics',
    ];
  }
  return [];
}

function formatPrice(cents: number | null): string {
  if (cents === null || cents === 0) return 'Free';
  return `$${(cents / 100).toFixed(0)}`;
}

// ─── Tier card ────────────────────────────────────────────────────────────────

function TierCard({
  tier,
  isPopular,
}: {
  tier: ListingTierRow;
  isPopular: boolean;
}) {
  const features = buildFeatureList(tier.code);
  const price = formatPrice(tier.price_cents_per_listing);
  const hasCta = tier.code !== 'partner' && tier.stripe_price_id;

  return (
    <div
      className={cn(
        'relative flex flex-col rounded-2xl border p-7 transition-shadow duration-200',
        isPopular
          ? 'border-brass shadow-lg bg-paper'
          : 'border-fog bg-paper hover:shadow-md',
      )}
    >
      {/* Most popular badge */}
      {isPopular && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <Badge className="bg-brass text-midnight px-4 py-1 text-xs font-semibold uppercase tracking-wide shadow-sm">
            Most popular
          </Badge>
        </div>
      )}

      {/* Header */}
      <div className={cn('space-y-2', isPopular && 'mt-3')}>
        <p className="text-xs font-semibold uppercase tracking-widest text-charcoal-soft">
          {tier.name}
        </p>

        <div className="flex items-baseline gap-1.5">
          <span className="font-serif text-4xl font-bold text-midnight">
            {price}
          </span>
          {tier.price_cents_per_listing && tier.price_cents_per_listing > 0 && (
            <span className="text-sm text-charcoal-soft">per listing</span>
          )}
        </div>

        <Caption className="text-charcoal-soft">90-day listing period</Caption>
      </div>

      {/* Divider */}
      <div className="my-5 h-px bg-fog" />

      {/* Features */}
      <ul className="flex flex-col gap-2.5 flex-1">
        {features.map((feat) => (
          <li key={feat} className="flex items-start gap-2.5 text-sm text-charcoal">
            <Check
              size={14}
              className="mt-0.5 shrink-0 text-brass"
              aria-hidden
            />
            {feat}
          </li>
        ))}
      </ul>

      {/* CTA */}
      <div className="mt-7">
        {hasCta ? (
          <Button
            asChild
            className={cn(
              'w-full rounded-full',
              isPopular
                ? 'bg-brass text-midnight hover:bg-brass/90'
                : 'bg-midnight text-paper hover:bg-midnight/90',
            )}
          >
            <Link href={`/list/submit?tier=${tier.code}`}>Get started</Link>
          </Button>
        ) : (
          <p className="text-center text-sm text-charcoal-soft italic">
            Internal use only
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PricingPage() {
  const supabase = await createServerClient();

  // listing_tier is not in the generated Database type — cast to any
  const { data: rawTiers } = await (supabase as any)
    .from('listing_tier')
    .select('id, code, name, price_cents_per_listing, stripe_price_id, features_json')
    .eq('is_active', true)
    .order('price_cents_per_listing', { ascending: true, nullsFirst: false });

  // Filter to the three paid tiers for the card grid; show partner note separately
  const paidCodes = ['basic', 'premium', 'elite'];
  const tiers: ListingTierRow[] = (
    (rawTiers ?? []) as ListingTierRow[]
  ).filter((t) => paidCodes.includes(t.code));

  return (
    <main className="min-h-svh bg-paper">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="bg-midnight py-20 px-6 text-center">
        <div className="mx-auto max-w-3xl flex flex-col items-center gap-6">
          <H1 className="text-paper">
            Reach Australia&rsquo;s most engaged racing buyers
          </H1>
          <Lead className="text-paper/80 max-w-xl">
            Every listing tier includes enquiry capture, lead data, and AFSL compliance display. Choose the level of exposure that fits your horse.
          </Lead>
        </div>
      </section>

      {/* ── Pricing cards ─────────────────────────────────────────────────── */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-5xl">

          {tiers.length === 0 ? (
            /* Fallback when DB is empty or tiers haven't been seeded yet */
            <StaticPricingGrid />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              {tiers.map((tier) => (
                <TierCard
                  key={tier.code}
                  tier={tier}
                  isPopular={tier.code === 'premium'}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Partner note ──────────────────────────────────────────────────── */}
      <section className="px-6 pb-16">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-xl border border-fog bg-fog/30 px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1">
              <p className="text-sm font-semibold text-midnight">Regal Bloodstock — Partner listings</p>
              <p className="mt-1 text-sm text-charcoal-soft">
                Regal Bloodstock&rsquo;s own horses appear on the marketplace at no listing fee as a disclosed platform operator.
                This relationship is fully disclosed on{' '}
                <Link href="/about" className="underline underline-offset-2 text-midnight">
                  /about
                </Link>{' '}
                and{' '}
                <Link href="/legal" className="underline underline-offset-2 text-midnight">
                  /legal
                </Link>.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ strip ─────────────────────────────────────────────────────── */}
      <section className="bg-midnight/5 px-6 py-12 border-t border-fog">
        <div className="mx-auto max-w-3xl">
          <H2 className="text-center mb-8">Questions</H2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {FAQ.map(({ q, a }) => (
              <div key={q}>
                <p className="font-semibold text-sm text-midnight mb-1">{q}</p>
                <p className="text-sm text-charcoal-soft leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Secondary CTA ─────────────────────────────────────────────────── */}
      <section className="px-6 py-16 text-center">
        <div className="mx-auto max-w-md flex flex-col items-center gap-4">
          <Body className="text-charcoal-soft">
            Need help choosing a tier? Our team is happy to advise.
          </Body>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              asChild
              size="lg"
              className="rounded-full bg-midnight text-paper hover:bg-midnight/90 px-8"
            >
              <Link href="/list/submit">Start a listing</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="rounded-full px-8"
            >
              <Link href="/contact">Contact us</Link>
            </Button>
          </div>
        </div>
      </section>

    </main>
  );
}

// ─── Static fallback grid (when DB tiers not yet seeded) ─────────────────────

function StaticPricingGrid() {
  const staticTiers = [
    {
      code: 'basic',
      name: 'Basic',
      price: '$149',
      features: [
        '90-day listing',
        '1 photo',
        'Standard placement',
        'Enquiry capture + forwarding',
        'AFSL badge displayed',
      ],
      popular: false,
    },
    {
      code: 'premium',
      name: 'Premium',
      price: '$299',
      features: [
        '90-day listing',
        '10 photos',
        'Featured badge',
        'Priority placement on browse',
        'Enquiry capture + forwarding',
        'AFSL badge displayed',
      ],
      popular: true,
    },
    {
      code: 'elite',
      name: 'Elite',
      price: '$499',
      features: [
        '90-day listing',
        'Unlimited photos',
        'Homepage feature slot',
        'Matched-buyer email campaign',
        'Featured badge',
        'Enquiry capture + forwarding',
        'Dedicated listing analytics',
      ],
      popular: false,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
      {staticTiers.map((tier) => (
        <div
          key={tier.code}
          className={cn(
            'relative flex flex-col rounded-2xl border p-7',
            tier.popular ? 'border-brass shadow-lg' : 'border-fog',
            'bg-paper',
          )}
        >
          {tier.popular && (
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <Badge className="bg-brass text-midnight px-4 py-1 text-xs font-semibold uppercase tracking-wide shadow-sm">
                Most popular
              </Badge>
            </div>
          )}
          <div className={cn('space-y-2', tier.popular && 'mt-3')}>
            <p className="text-xs font-semibold uppercase tracking-widest text-charcoal-soft">{tier.name}</p>
            <div className="flex items-baseline gap-1.5">
              <span className="font-serif text-4xl font-bold text-midnight">{tier.price}</span>
              <span className="text-sm text-charcoal-soft">per listing</span>
            </div>
            <Caption className="text-charcoal-soft">90-day listing period</Caption>
          </div>
          <div className="my-5 h-px bg-fog" />
          <ul className="flex flex-col gap-2.5 flex-1">
            {tier.features.map((feat) => (
              <li key={feat} className="flex items-start gap-2.5 text-sm text-charcoal">
                <Check size={14} className="mt-0.5 shrink-0 text-brass" aria-hidden />
                {feat}
              </li>
            ))}
          </ul>
          <div className="mt-7">
            <Button
              asChild
              className={cn(
                'w-full rounded-full',
                tier.popular
                  ? 'bg-brass text-midnight hover:bg-brass/90'
                  : 'bg-midnight text-paper hover:bg-midnight/90',
              )}
            >
              <Link href={`/list/submit?tier=${tier.code}`}>Get started</Link>
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────

const FAQ = [
  {
    q: 'How does payment work?',
    a: 'You pay once per listing via Stripe. Your listing credit is applied immediately after payment and you can submit your horse straight away.',
  },
  {
    q: 'What happens after 90 days?',
    a: 'Your listing moves to Expired status. You can renew with a new payment from your dashboard.',
  },
  {
    q: 'Do I need an AFSL?',
    a: 'Yes. Every syndicator must hold an AFSL or be an Authorised Representative. We verify against the ASIC register within 24 hours.',
  },
  {
    q: 'What is your refund policy?',
    a: 'Full refund if your listing is rejected by our moderation team. No refunds once a listing goes live.',
  },
];
