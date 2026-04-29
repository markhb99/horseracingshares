/**
 * /list/submit/success — Post-payment confirmation page.
 * Server component. Shown after returning from Stripe.
 */

import Link from 'next/link';
import type { Metadata } from 'next';
import { Button } from '@/components/ui/button';
import { H1, Body, Caption } from '@/components/typography';

export const metadata: Metadata = {
  title: 'Listing submitted | Horse Racing Shares',
};

export default function SubmitSuccessPage() {
  return (
    <main className="min-h-svh bg-background flex items-center justify-center px-6 py-16">
      <div className="mx-auto max-w-lg text-center space-y-6">
        {/* Tick icon */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-midnight/10">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-8 w-8 text-midnight"
            aria-hidden="true"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>

        <H1 className="font-serif text-midnight">
          Your listing has been submitted
        </H1>

        <Body className="text-charcoal-soft">
          We&rsquo;ll review it within 24 hours on business days. You&rsquo;ll receive an email when your listing is live. In the meantime, you can track progress from your dashboard.
        </Body>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            asChild
            size="lg"
            className="rounded-full bg-midnight text-paper hover:bg-midnight/90"
          >
            <Link href="/list/dashboard">Go to dashboard →</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-full">
            <Link href="/browse">Browse listings</Link>
          </Button>
        </div>

        <Caption className="text-charcoal-soft">
          Questions? Email us at{' '}
          <a
            href="mailto:listings@horseracingshares.com"
            className="underline underline-offset-2"
          >
            listings@horseracingshares.com
          </a>
        </Caption>
      </div>
    </main>
  );
}
