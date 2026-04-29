/**
 * /list — Pricing page for syndicators.
 * Server component.
 */

import Link from 'next/link';
import type { Metadata } from 'next';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { H1, H2, H3, Lead, Body, Caption } from '@/components/typography';
import { ListingTierTable } from '@/components/list/ListingTierTable';

export const metadata: Metadata = {
  title: 'List a horse | Horse Racing Shares',
  description:
    'Reach 800+ qualified buyers. List your racehorse syndication shares on Australia\'s dedicated marketplace.',
};

// ─── FAQ content ─────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    q: 'Do I need an AFSL to list?',
    a: 'Yes. Every syndicator must hold an Australian Financial Services Licence (AFSL) or be an Authorised Representative of an AFSL holder. We verify your AFSL against the ASIC register within 24 hours of submission.',
  },
  {
    q: 'What is a Product Disclosure Statement (PDS)?',
    a: 'A PDS is a legal document required by ASIC that describes the terms of a racehorse syndication. You must provide a current PDS for each horse before your listing goes live.',
  },
  {
    q: 'How long does moderation take?',
    a: 'We aim to approve compliant listings within 24 hours on business days. You\'ll receive an email when your listing is live.',
  },
  {
    q: 'Can I edit a listing after it goes live?',
    a: 'Yes, from your dashboard. Material changes (price, share sizes, PDS update) require re-moderation.',
  },
  {
    q: 'What happens when a listing expires?',
    a: 'Your listing moves to Expired status after 90 days. You can renew from the dashboard.',
  },
  {
    q: 'Can I list a horse that is already partly sold?',
    a: 'Yes. Update the available share percentages in your listing to reflect what\'s still available.',
  },
  {
    q: 'What is your refund policy?',
    a: 'We offer a full refund if your listing is rejected by our moderation team. No refunds for listings that go live and then expire.',
  },
];

// ─── Stat cards ───────────────────────────────────────────────────────────────

const STATS = [
  { value: '800+', label: 'Registered buyers' },
  { value: '150+', label: 'Qualified enquiries' },
  { value: '24h', label: 'AFSL verification' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ListPage() {
  return (
    <main className="min-h-svh bg-background">

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="bg-midnight py-20 px-6 text-center">
        <div className="mx-auto max-w-3xl flex flex-col items-center gap-6">
          <H1 className="text-paper">
            List a horse on Horse Racing Shares
          </H1>
          <Lead className="text-paper/80 max-w-xl">
            Connect with Australia&rsquo;s most engaged community of prospective racehorse owners. Reach qualified buyers, capture leads, and grow your syndicate.
          </Lead>
          <Button
            asChild
            size="lg"
            className="rounded-full bg-brass text-midnight hover:bg-brass/90 px-8"
          >
            <Link href="/list/submit">Start a listing</Link>
          </Button>
        </div>
      </section>

      {/* ── Stats strip ─────────────────────────────────────────────────── */}
      <section className="border-b border-fog bg-paper-dim py-10 px-6">
        <div className="mx-auto max-w-4xl">
          <div className="grid grid-cols-3 gap-6 text-center">
            {STATS.map(({ value, label }) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <span className="font-serif text-4xl font-bold text-midnight">
                  {value}
                </span>
                <Caption className="text-charcoal-soft">{label}</Caption>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Launch offer ────────────────────────────────────────────────── */}
      <section className="bg-brass px-6 py-4 text-center">
        <Body className="font-semibold text-midnight">
          Launch offer: first 90 days free for any listing. Offer ends 30 June 2026.
        </Body>
      </section>

      {/* ── Tier table ──────────────────────────────────────────────────── */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-5xl flex flex-col gap-10">
          <div className="text-center">
            <H2>Choose your listing tier</H2>
            <Lead className="mt-2 text-charcoal-soft max-w-xl mx-auto">
              All tiers include enquiry capture, buyer lead data, and AFSL compliance display.
            </Lead>
          </div>

          <ListingTierTable showCta />
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────── */}
      <section className="bg-paper-dim px-6 py-16">
        <div className="mx-auto max-w-2xl flex flex-col gap-8">
          <H3 className="text-center">Frequently asked questions</H3>

          <Accordion type="single" collapsible className="w-full divide-y divide-fog">
            {FAQ_ITEMS.map(({ q, a }) => (
              <AccordionItem key={q} value={q} className="border-none">
                <AccordionTrigger className="py-4 text-[15px] font-medium text-midnight hover:no-underline">
                  {q}
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-charcoal-soft leading-relaxed">{a}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ── Secondary CTA ───────────────────────────────────────────────── */}
      <section className="px-6 py-16 text-center">
        <div className="mx-auto max-w-xl flex flex-col items-center gap-4">
          <H3>Ready to list your horse?</H3>
          <Body className="text-charcoal-soft">
            Create your listing in minutes. Our team verifies your AFSL and has your horse live within 24 hours.
          </Body>
          <Button
            asChild
            size="lg"
            className="rounded-full bg-midnight text-paper hover:bg-midnight/90 px-8"
          >
            <Link href="/list/submit">Get started</Link>
          </Button>
        </div>
      </section>

    </main>
  );
}
