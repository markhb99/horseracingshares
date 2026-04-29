/**
 * TrainerCard — directory grid card for a trainer.
 * Used on /trainers.
 */

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { H5, Small } from '@/components/typography';

// ─── Types ────────────────────────────────────────────────────────

export interface TrainerCardProps {
  id: string;
  slug: string;
  name: string;
  stable_name: string | null;
  location_state: string | null;
  horse_count: number;
}

// ─── TrainerCard ──────────────────────────────────────────────────

export function TrainerCard({
  slug,
  name,
  stable_name,
  location_state,
  horse_count,
}: TrainerCardProps) {
  return (
    <article
      className={cn(
        'flex flex-col gap-3 rounded-lg bg-paper p-5',
        'shadow-sm transition-shadow duration-[var(--duration-base)]',
        'hover:shadow-md',
      )}
    >
      {/* Name */}
      <H5>
        <Link
          href={`/trainers/${slug}`}
          className="text-midnight hover:text-midnight-light transition-colors focus-visible:outline-none focus-visible:underline"
        >
          {name}
        </Link>
      </H5>

      {/* Stable name — only if different from name */}
      {stable_name && stable_name !== name && (
        <Small className="font-medium">{stable_name}</Small>
      )}

      {/* Location */}
      {location_state && (
        <Small>{location_state}</Small>
      )}

      {/* Horse count + CTA */}
      <div className="flex items-center justify-between">
        <Small>
          {horse_count === 1
            ? '1 horse listed'
            : `${horse_count} horses listed`}
        </Small>
        <Link
          href={`/trainers/${slug}`}
          className="text-small-type font-medium text-midnight hover:text-midnight-light transition-colors"
          aria-label={`View horses trained by ${name}`}
        >
          View horses →
        </Link>
      </div>
    </article>
  );
}
