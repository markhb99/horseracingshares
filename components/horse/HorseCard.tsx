'use client';

/**
 * HorseCard — the workhorse component.
 *
 * Four variants (standard / editorial / compact / sold) per
 * docs/design-system.md §3.2.1.
 *
 * Image placeholder: bg-muted aspect box with caption text.
 * TODO: Wire heroImagePath to Supabase Storage signed URLs in Phase 4.
 */

import Link from 'next/link';
import { Flag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HorseshoeU } from '@/components/icons';
import { SireDam, Caption, Small } from '@/components/typography';
import { Button } from '@/components/ui/button';
import { ShareStatusLine } from '@/components/horse/ShareStatusLine';
import { WishlistButton } from '@/components/account/WishlistButton';

// ─── Types ───────────────────────────────────────────────────────

export interface HorseCardHorse {
  slug: string;
  name: string | null;
  sire: string;
  dam: string;
  damSire: string | null;
  sex: 'colt' | 'filly' | 'gelding' | 'mare' | 'stallion';
  foalYear: number | null;
  locationState: string;
  primaryTrainerName: string | null;
  primaryTrainerSlug: string | null;
  priceMinCents: number;
  sharePctsAvailable: number[];
  totalSharesRemaining: number;
  hasFinalShares: boolean;
  bonusSchemes: string[];
  heroImagePath: string | null;
  formUrl?: string;
}

export interface HorseCardProps {
  variant?: 'standard' | 'editorial' | 'compact' | 'sold';
  horse: HorseCardHorse;
  /** Horse UUID — enables the WishlistButton overlay when provided */
  horseId?: string;
  initialWishlisted?: boolean;
  /** Legacy save toggle (used when horseId is not provided) */
  isSaved?: boolean;
  onToggleSave?: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function capitaliseSex(sex: HorseCardHorse['sex']): string {
  return sex.charAt(0).toUpperCase() + sex.slice(1);
}

// ─── IncentiveBadges ─────────────────────────────────────────────

function IncentiveBadges({ schemes }: { schemes: string[] }) {
  if (!schemes.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {schemes.map((scheme) => (
        <span
          key={scheme}
          className="inline-flex items-center gap-1 rounded bg-charcoal/10 px-1.5 py-0.5"
        >
          <Flag size={10} className="text-charcoal" aria-hidden="true" />
          <span className="text-caption-type font-medium text-charcoal">
            {scheme}
          </span>
        </span>
      ))}
    </div>
  );
}

// ─── ImagePlaceholder ────────────────────────────────────────────

function storagePathToUrl(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  return `${base}/storage/v1/object/public/horse-photos/${path}`;
}

function ImagePlaceholder({
  heroImagePath,
  aspectClass,
  grayscale = false,
}: {
  heroImagePath: string | null;
  aspectClass: string;
  grayscale?: boolean;
}) {
  const imageUrl = storagePathToUrl(heroImagePath);
  return (
    <div
      className={cn(
        'overflow-hidden bg-muted',
        aspectClass,
        grayscale && 'grayscale',
      )}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <Caption className="text-muted-foreground px-4 text-center">
            No photo yet
          </Caption>
        </div>
      )}
    </div>
  );
}

// ─── SaveButton ──────────────────────────────────────────────────

function SaveButton({
  isSaved,
  onToggleSave,
}: {
  isSaved: boolean;
  onToggleSave?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={isSaved ? 'Remove from saved' : 'Save this horse'}
      aria-pressed={isSaved}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggleSave?.();
      }}
      className={cn(
        // 44×44 tap target on mobile (design-system.md §3.2.1)
        'flex h-11 w-11 items-center justify-center rounded-full',
        'bg-paper/80 backdrop-blur-sm transition-colors',
        'hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
    >
      <HorseshoeU
        size={20}
        className={cn(
          'transition-colors',
          isSaved ? 'fill-brass text-brass' : 'fill-none text-charcoal',
        )}
      />
    </button>
  );
}

// ─── Pedigree block (shared by standard / editorial / sold) ──────

function PedigreeBlock({ horse }: { horse: HorseCardHorse }) {
  const smallestPct =
    horse.sharePctsAvailable.length > 0
      ? Math.min(...horse.sharePctsAvailable)
      : null;

  return (
    <div className="space-y-0.5">
      {/* Sire × dam — Fraunces italic bold, --text-h4 */}
      <div className="text-h4">
        <SireDam sire={horse.sire} dam={horse.dam} />
      </div>

      {/* Dam-sire line — Inter 500, --text-small, charcoal-soft */}
      {horse.damSire && (
        <Small className="font-medium">
          out of {horse.dam} ({horse.damSire})
        </Small>
      )}

      {/* Age + sex + state */}
      <Small>
        {horse.foalYear != null ? `${horse.foalYear}y ` : ''}
        {capitaliseSex(horse.sex)} · {horse.locationState}
      </Small>

      {/* Trainer line */}
      {horse.primaryTrainerName && (
        <Small className="font-semibold">
          {horse.primaryTrainerName}
          {horse.formUrl && (
            <>
              {' '}
              ·{' '}
              <a
                href={horse.formUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="underline underline-offset-2 hover:text-brass"
              >
                Form →
              </a>
            </>
          )}
        </Small>
      )}

      {/* Price line — Fraunces 600, --text-h5 */}
      {smallestPct != null && (
        <p className="text-h5 font-serif font-semibold">
          From {formatPrice(horse.priceMinCents)} · {smallestPct}% share
        </p>
      )}
    </div>
  );
}

// ─── HorseCard (standard + sold variants) ────────────────────────

function StandardCard({
  horse,
  horseId,
  initialWishlisted,
  isSaved,
  onToggleSave,
  isSold,
}: {
  horse: HorseCardHorse;
  horseId?: string;
  initialWishlisted?: boolean;
  isSaved: boolean;
  onToggleSave?: () => void;
  isSold: boolean;
}) {
  return (
    <Link
      href={`/horse/${horse.slug}`}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-lg border border-border bg-paper',
        'shadow-sm transition-shadow duration-[320ms] ease-[var(--ease-emphasis)]',
        'hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
    >
      {/* Hero image area */}
      <div className="relative">
        <ImagePlaceholder
          heroImagePath={horse.heroImagePath}
          aspectClass="aspect-[4/3]"
          grayscale={isSold}
        />

        {/* Image scale on hover */}
        <div
          className="absolute inset-0 transition-transform duration-[320ms] ease-[var(--ease-emphasis)] group-hover:scale-[1.02]"
          aria-hidden="true"
        />

        {/* Incentive badges — top-left of hero */}
        {horse.bonusSchemes.length > 0 && (
          <div className="absolute left-2 top-2">
            <IncentiveBadges schemes={horse.bonusSchemes} />
          </div>
        )}

        {/* SOLD ribbon — top-left, sold variant only */}
        {isSold && (
          <div className="absolute left-0 top-0 bg-charcoal px-3 py-1">
            <span className="text-caption-type font-medium uppercase tracking-wider text-paper">
              Sold
            </span>
          </div>
        )}

        {/* Save / Wishlist button — top-right */}
        <div className="absolute right-2 top-2">
          {horseId ? (
            <WishlistButton horseId={horseId} initialWishlisted={initialWishlisted} />
          ) : (
            <SaveButton isSaved={isSaved} onToggleSave={onToggleSave} />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <PedigreeBlock horse={horse} />

        <ShareStatusLine
          hasFinalShares={horse.hasFinalShares}
          sharePctsAvailable={horse.sharePctsAvailable}
        />

        {/* CTA row — omitted for sold variant */}
        {!isSold && (
          <div className="mt-auto flex items-center gap-2 pt-1">
            <Button
              size="sm"
              className="shrink-0 rounded-full bg-midnight-dark text-paper hover:bg-midnight"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // Enquiry handled by parent — no action here in the component itself.
              }}
            >
              Enquire
            </Button>
            <span className="text-small-type font-medium text-charcoal-soft hover:text-charcoal">
              View details →
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}

// ─── EditorialCard ───────────────────────────────────────────────

function EditorialCard({
  horse,
  horseId,
  initialWishlisted,
  isSaved,
  onToggleSave,
}: {
  horse: HorseCardHorse;
  horseId?: string;
  initialWishlisted?: boolean;
  isSaved: boolean;
  onToggleSave?: () => void;
}) {
  return (
    <Link
      href={`/horse/${horse.slug}`}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-lg border border-border bg-paper',
        'shadow-sm transition-shadow duration-[320ms] ease-[var(--ease-emphasis)]',
        'hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
    >
      {/* Hero image — 16:9 per editorial variant */}
      <div className="relative">
        <ImagePlaceholder
          heroImagePath={horse.heroImagePath}
          aspectClass="aspect-video"
        />

        {horse.bonusSchemes.length > 0 && (
          <div className="absolute left-2 top-2">
            <IncentiveBadges schemes={horse.bonusSchemes} />
          </div>
        )}

        <div className="absolute right-2 top-2">
          {horseId ? (
            <WishlistButton horseId={horseId} initialWishlisted={initialWishlisted} />
          ) : (
            <SaveButton isSaved={isSaved} onToggleSave={onToggleSave} />
          )}
        </div>
      </div>

      {/* Content — editorial: h3 headline, space for 2-3 sentence description */}
      <div className="flex flex-1 flex-col gap-3 p-5">
        {/* Headline — text-h3 */}
        <div className="text-h3">
          <SireDam sire={horse.sire} dam={horse.dam} />
        </div>

        {/* Description excerpt */}
        {horse.name && (
          <p className="text-body-type text-charcoal-soft line-clamp-3">
            {horse.name} — {capitaliseSex(horse.sex)} by {horse.sire} out of{' '}
            {horse.dam}
            {horse.damSire ? ` (${horse.damSire})` : ''}.
            {horse.primaryTrainerName
              ? ` Trained by ${horse.primaryTrainerName}.`
              : ''}
          </p>
        )}

        <PedigreeBlock horse={horse} />

        <ShareStatusLine
          hasFinalShares={horse.hasFinalShares}
          sharePctsAvailable={horse.sharePctsAvailable}
        />

        <div className="mt-auto flex items-center gap-2 pt-1">
          <Button
            size="sm"
            className="shrink-0 rounded-full bg-midnight-dark text-paper hover:bg-midnight"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            Enquire
          </Button>
          <span className="text-small-type font-medium text-charcoal-soft hover:text-charcoal">
            View details →
          </span>
        </div>
      </div>
    </Link>
  );
}

// ─── CompactCard ─────────────────────────────────────────────────

function CompactCard({ horse }: { horse: HorseCardHorse }) {
  return (
    <Link
      href={`/horse/${horse.slug}`}
      className={cn(
        'flex items-center gap-3 rounded-md border border-border bg-paper p-3',
        'transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
    >
      {/* Thumbnail — 96×72 */}
      <div className="h-[72px] w-24 shrink-0 overflow-hidden rounded">
        <ImagePlaceholder
          heroImagePath={horse.heroImagePath}
          aspectClass="h-full w-full"
        />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="text-h5 font-serif">
          <SireDam sire={horse.sire} dam={horse.dam} />
        </div>
        <Small className="font-medium">
          From {formatPrice(horse.priceMinCents)} · {horse.locationState}
        </Small>
        <ShareStatusLine
          hasFinalShares={horse.hasFinalShares}
          sharePctsAvailable={horse.sharePctsAvailable}
        />
      </div>
    </Link>
  );
}

// ─── HorseCard (public export) ───────────────────────────────────

export function HorseCard({
  variant = 'standard',
  horse,
  horseId,
  initialWishlisted,
  isSaved = false,
  onToggleSave,
}: HorseCardProps) {
  if (variant === 'compact') {
    return <CompactCard horse={horse} />;
  }

  if (variant === 'editorial') {
    return (
      <EditorialCard
        horse={horse}
        horseId={horseId}
        initialWishlisted={initialWishlisted}
        isSaved={isSaved}
        onToggleSave={onToggleSave}
      />
    );
  }

  // 'standard' and 'sold' share the same layout; sold adds ribbon + grayscale.
  return (
    <StandardCard
      horse={horse}
      horseId={horseId}
      initialWishlisted={initialWishlisted}
      isSaved={isSaved}
      onToggleSave={onToggleSave}
      isSold={variant === 'sold'}
    />
  );
}
