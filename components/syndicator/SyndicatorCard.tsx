/**
 * SyndicatorCard — directory grid card for a licensed syndicator.
 * Used on /syndicators and any list context.
 */

import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { AfslShield } from '@/components/icons';
import { H4, Small, Caption } from '@/components/typography';

// ─── Types ────────────────────────────────────────────────────────

export interface SyndicatorCardProps {
  id: string;
  slug: string;
  name: string;
  tier: string;
  logo_url: string | null;
  afsl_number: string | null;
  afsl_verified_at: string | null;
  location_state: string | null;
  horse_count: number;
}

// ─── LogoOrInitials ───────────────────────────────────────────────

function LogoOrInitials({
  name,
  logo_url,
}: {
  name: string;
  logo_url: string | null;
}) {
  if (logo_url) {
    return (
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border border-fog">
        <Image
          src={logo_url}
          alt={`${name} logo`}
          width={64}
          height={64}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  // Initials fallback — take up to 2 words
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <div
      className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-midnight"
      aria-hidden="true"
    >
      <span className="text-h5 font-serif font-bold text-paper">{initials}</span>
    </div>
  );
}

// ─── SyndicatorCard ───────────────────────────────────────────────

export function SyndicatorCard({
  slug,
  name,
  logo_url,
  afsl_number,
  afsl_verified_at,
  location_state,
  horse_count,
}: SyndicatorCardProps) {
  return (
    <article
      className={cn(
        'flex flex-col gap-4 rounded-lg bg-paper p-6',
        'shadow-sm transition-shadow duration-[var(--duration-base)]',
        'hover:shadow-md',
      )}
    >
      {/* Logo + name row */}
      <div className="flex items-center gap-4">
        <LogoOrInitials name={name} logo_url={logo_url} />

        <div className="min-w-0 flex-1">
          <H4>
            <Link
              href={`/syndicators/${slug}`}
              className="text-midnight hover:text-midnight-light transition-colors focus-visible:outline-none focus-visible:underline"
            >
              {name}
            </Link>
          </H4>

          {location_state && (
            <Small className="mt-0.5">{location_state}</Small>
          )}
        </div>
      </div>

      {/* AFSL line */}
      {afsl_number && (
        <div className="flex items-center gap-1.5">
          <AfslShield
            size={14}
            className="shrink-0 text-success"
            aria-hidden="true"
          />
          <Caption className="font-mono text-charcoal-soft">
            AFSL {afsl_number}
          </Caption>
          {afsl_verified_at && (
            <Caption className="text-success font-medium">Verified</Caption>
          )}
        </div>
      )}

      {/* Horse count + CTA */}
      <div className="flex items-center justify-between">
        <Small>
          {horse_count === 1
            ? '1 horse listed'
            : `${horse_count} horses listed`}
        </Small>
        <Link
          href={`/syndicators/${slug}`}
          className="text-small-type font-medium text-midnight hover:text-midnight-light transition-colors"
          aria-label={`View horses listed by ${name}`}
        >
          View horses →
        </Link>
      </div>
    </article>
  );
}
