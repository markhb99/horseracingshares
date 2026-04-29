/**
 * /sell/success — Post-payment confirmation page.
 * Server component. Shown after returning from Stripe Checkout.
 */

import Link from 'next/link';
import type { Metadata } from 'next';
import { Button } from '@/components/ui/button';
import { H1, Body, Caption } from '@/components/typography';

export const metadata: Metadata = {
  title: 'Payment received | Horse Racing Shares',
  description: 'Your listing credit is ready. Submit your horse now.',
};

export default function SellSuccessPage() {
  return (
    <main className="min-h-svh bg-paper flex items-center justify-center px-6 py-16">
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
          Payment received
        </H1>

        <Body className="text-charcoal-soft">
          Your listing credit is ready. Submit your horse now and our team will review it within 24 hours on business days. You&rsquo;ll receive an email when your listing goes live.
        </Body>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button
            asChild
            size="lg"
            className="rounded-full bg-midnight text-paper hover:bg-midnight/90 px-8"
          >
            <Link href="/list/submit">Submit your horse</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-full px-8">
            <Link href="/list/dashboard">Go to dashboard</Link>
          </Button>
        </div>

        <Caption className="text-charcoal-soft pt-2">
          Questions? Email us at{' '}
          <a
            href="mailto:listings@horseracingshares.com"
            className="underline underline-offset-2 text-midnight"
          >
            listings@horseracingshares.com
          </a>
        </Caption>

      </div>
    </main>
  );
}
