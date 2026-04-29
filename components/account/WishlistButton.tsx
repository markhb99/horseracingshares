'use client';

import { useState, useEffect, useCallback } from 'react';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WishlistButtonProps {
  horseId: string;
  /** Pre-fetched state (pass from server when available). Defaults to false. */
  initialWishlisted?: boolean;
  className?: string;
  size?: number;
}

export function WishlistButton({
  horseId,
  initialWishlisted = false,
  className,
  size = 18,
}: WishlistButtonProps) {
  const [wishlisted, setWishlisted] = useState(initialWishlisted);
  const [loading, setLoading] = useState(false);

  // Hydrate from API if we don't have a pre-fetched value
  useEffect(() => {
    if (initialWishlisted) return; // already known
    fetch(`/api/wishlist?horse_id=${horseId}`)
      .then((r) => r.json())
      .then((d) => { if (typeof d.wishlisted === 'boolean') setWishlisted(d.wishlisted); })
      .catch(() => {}); // silent on error — non-auth users get false
  }, [horseId, initialWishlisted]);

  const toggle = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;

    setLoading(true);
    const next = !wishlisted;
    setWishlisted(next); // optimistic

    try {
      const res = await fetch('/api/wishlist', {
        method: next ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ horse_id: horseId }),
      });
      if (res.status === 401) {
        setWishlisted(!next); // revert
        window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
        return;
      }
      if (!res.ok) setWishlisted(!next); // revert on error
    } catch {
      setWishlisted(!next); // revert on network error
    } finally {
      setLoading(false);
    }
  }, [horseId, wishlisted, loading]);

  return (
    <button
      type="button"
      aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
      aria-pressed={wishlisted}
      onClick={toggle}
      disabled={loading}
      className={cn(
        'flex h-11 w-11 items-center justify-center rounded-full',
        'bg-paper/80 backdrop-blur-sm transition-all duration-150',
        'hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-midnight/40',
        'disabled:opacity-60',
        className,
      )}
    >
      <Heart
        size={size}
        className={cn(
          'transition-colors duration-150',
          wishlisted
            ? 'fill-brass stroke-brass'
            : 'fill-none stroke-charcoal',
        )}
        aria-hidden
      />
    </button>
  );
}
