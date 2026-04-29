/**
 * /sell/cancel — Shown when user cancels from Stripe Checkout.
 * Server component.
 */

import Link from 'next/link';
import type { Metadata } from 'next';
import { Button } from '@/components/ui/button';
import { H1, Body } from '@/components/typography';

export const metadata: Metadata = {
  title: 'Payment cancelled | Horse Racing Shares',
  description: 'No charge was made. Return to pricing whenever you are ready.',
};

export default function SellCancelPage() {
  return (
    <main className="min-h-svh bg-paper flex items-center justify-center px-6 py-16">
      <div className="mx-auto max-w-md text-center space-y-6">

        {/* X icon */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-fog">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-8 w-8 text-charcoal-soft"
            aria-hidden="true"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </div>

        <H1 className="font-serif text-midnight">
          No charge was made
        </H1>

        <Body className="text-charcoal-soft">
          You cancelled before completing payment. Your listing has not been created. Return to pricing whenever you are ready.
        </Body>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button
            asChild
            size="lg"
            className="rounded-full bg-midnight text-paper hover:bg-midnight/90 px-8"
          >
            <Link href="/sell/pricing">Back to pricing</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-full px-8">
            <Link href="/browse">Browse listings</Link>
          </Button>
        </div>

      </div>
    </main>
  );
}
