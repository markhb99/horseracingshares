'use client';

import Link from 'next/link';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Caption } from '@/components/typography';

// ─── Tier data ────────────────────────────────────────────────────────────────

export interface TierInfo {
  code: string;
  name: string;
  price: string;
  priceNote: string;
  duration: string;
  features: string[];
  popular?: boolean;
}

export const TIERS: TierInfo[] = [
  {
    code: 'listed',
    name: 'Listed',
    price: '$39',
    priceNote: 'per listing',
    duration: '90 days',
    features: [
      'Standard listing placement',
      'Enquiry capture + forwarding',
      'Buyer lead data',
      'AFSL badge displayed',
    ],
  },
  {
    code: 'feature',
    name: 'Feature',
    price: '$79',
    priceNote: 'per listing',
    duration: '90 days',
    popular: true,
    features: [
      'Everything in Listed',
      'Featured placement on browse page',
      'Brass "Feature" ribbon on card',
      'Priority support',
    ],
  },
  {
    code: 'headline',
    name: 'Headline',
    price: '$149',
    priceNote: 'per listing',
    duration: '90 days',
    features: [
      'Everything in Feature',
      'Homepage carousel slot',
      'Email blast to matched buyers',
      'Dedicated listing analytics',
    ],
  },
  {
    code: 'partner',
    name: 'Stable Partner',
    price: '$499',
    priceNote: '/month',
    duration: 'Unlimited listings',
    features: [
      'Everything in Headline',
      'Unlimited concurrent listings',
      'Syndicator profile page',
      'Account manager support',
    ],
  },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface ListingTierTableProps {
  /** If provided, renders a radio-style selector instead of CTA links */
  selectedCode?: string;
  onSelect?: (code: string) => void;
  /** When used on pricing page, show "Start a listing" CTA links */
  showCta?: boolean;
  /** Compact mode for stepper step 4 */
  compact?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ListingTierTable({
  selectedCode,
  onSelect,
  showCta = false,
  compact = false,
}: ListingTierTableProps) {
  const isInteractive = typeof onSelect === 'function';

  return (
    <div className={cn(
      'grid gap-4',
      compact
        ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
        : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    )}>
      {TIERS.map((tier) => {
        const isSelected = selectedCode === tier.code;

        return (
          <div
            key={tier.code}
            role={isInteractive ? 'button' : undefined}
            tabIndex={isInteractive ? 0 : undefined}
            aria-pressed={isInteractive ? isSelected : undefined}
            onClick={() => onSelect?.(tier.code)}
            onKeyDown={(e) => {
              if (isInteractive && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                onSelect?.(tier.code);
              }
            }}
            className={cn(
              'relative flex flex-col rounded-xl border p-5',
              'transition-shadow duration-200',
              tier.popular && !isSelected
                ? 'border-brass shadow-md'
                : 'border-fog',
              isSelected
                ? 'border-midnight bg-midnight/5 ring-2 ring-midnight'
                : 'bg-paper',
              isInteractive && 'cursor-pointer hover:shadow-md',
              compact && 'p-4',
            )}
          >
            {/* Popular ribbon */}
            {tier.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-brass text-midnight px-3 py-0.5 text-xs font-semibold uppercase tracking-wide shadow-sm">
                  Most popular
                </Badge>
              </div>
            )}

            {/* Tier header */}
            <div className={cn('space-y-1', tier.popular && 'mt-2')}>
              <p className="text-sm font-semibold uppercase tracking-widest text-charcoal-soft">
                {tier.name}
              </p>
              <div className="flex items-baseline gap-1">
                <span className={cn(
                  'font-serif font-bold text-midnight',
                  compact ? 'text-2xl' : 'text-3xl',
                )}>
                  {tier.price}
                </span>
                <span className="text-sm text-charcoal-soft">{tier.priceNote}</span>
              </div>
              <Caption className="text-charcoal-soft">{tier.duration}</Caption>
            </div>

            {/* Divider */}
            <div className="my-4 h-px bg-fog" />

            {/* Features */}
            <ul className="flex flex-col gap-2 flex-1">
              {tier.features.map((feat) => (
                <li key={feat} className="flex items-start gap-2 text-sm text-charcoal">
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
            {showCta && (
              <div className="mt-5">
                <Button
                  asChild
                  className={cn(
                    'w-full rounded-full',
                    tier.popular
                      ? 'bg-brass text-midnight hover:bg-brass/90'
                      : 'bg-midnight text-paper hover:bg-midnight/90',
                  )}
                >
                  <Link href={`/list/submit?tier=${tier.code}`}>
                    Start a listing
                  </Link>
                </Button>
              </div>
            )}

            {/* Selected indicator */}
            {isInteractive && isSelected && (
              <div className="mt-4 flex items-center justify-center gap-1.5 text-sm font-medium text-midnight">
                <Check size={14} aria-hidden />
                Selected
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
