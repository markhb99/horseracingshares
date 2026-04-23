/**
 * ShareStatusLine — atom component.
 *
 * Displays share availability status:
 *  - If hasFinalShares: brass-coloured "Final shares available — contact
 *    the syndicator" (per design-system.md §3.2.1 v2 reconciliation §P0.3).
 *  - Otherwise: "{available} of {total} shares available" in charcoal-soft.
 *
 * No animations, no pulsing. Status lines do not shout (design-system.md §3.2.1).
 *
 * Arithmetic:
 *  - availableCount = sharePctsAvailable.length
 *  - totalCount     = Math.round(100 / smallestSharePct)
 *  The smallest pct is the denomination of the syndicate (e.g. 2.5% → 40 shares).
 */

import { cn } from '@/lib/utils';

interface ShareStatusLineProps {
  hasFinalShares: boolean;
  sharePctsAvailable: number[];
  className?: string;
}

export function ShareStatusLine({
  hasFinalShares,
  sharePctsAvailable,
  className,
}: ShareStatusLineProps) {
  if (hasFinalShares) {
    return (
      <p
        className={cn(
          'text-small-type font-medium text-brass',
          className,
        )}
      >
        Final shares available — contact the syndicator
      </p>
    );
  }

  const availableCount = sharePctsAvailable.length;

  // Smallest pct is the share denomination; divides into 100% to get total count.
  const smallestPct =
    availableCount > 0 ? Math.min(...sharePctsAvailable) : null;
  const totalCount =
    smallestPct != null ? Math.round(100 / smallestPct) : null;

  if (totalCount == null) {
    return null;
  }

  return (
    <p
      className={cn(
        'text-small-type font-medium text-charcoal-soft',
        className,
      )}
    >
      {availableCount} of {totalCount} shares available
    </p>
  );
}
