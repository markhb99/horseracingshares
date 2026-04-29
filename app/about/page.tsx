import type { Metadata } from 'next';
import Link from 'next/link';
import { H1, H2, H3, Body, Lead, Small, Caption } from '@/components/typography';

export const metadata: Metadata = {
  title: 'About',
  description:
    'Horse Racing Shares is an Australian marketplace for racehorse syndication shares. Owned and operated by Regal Bloodstock — we disclose that relationship openly.',
};

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`border-b border-fog py-12 md:py-16 ${className}`}>
      <div className="mx-auto max-w-2xl">{children}</div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AboutPage() {
  return (
    <main className="bg-paper px-6">
      {/* Hero */}
      <div className="border-b border-fog py-16 md:py-20">
        <div className="mx-auto max-w-2xl">
          <H1 className="mb-4">About Horse Racing Shares</H1>
          <Lead className="text-charcoal-soft">
            Australia&rsquo;s dedicated marketplace for racehorse syndication shares.
            Every listing is backed by a licensed syndicator and a Product Disclosure Statement.
          </Lead>
        </div>
      </div>

      {/* What we are */}
      <Section>
        <H2 className="mb-5">What we are</H2>
        <div className="space-y-4">
          <Body>
            Horse Racing Shares is an advertising platform that connects prospective racehorse
            owners with licensed syndicators who offer shares in Australian thoroughbreds. We are
            not a financial product issuer. We do not sell shares, manage syndicates, or hold
            money. We are a classifieds platform — closer to a specialised real estate portal
            than to a fund manager.
          </Body>
          <Body>
            Every syndicator who lists on our platform holds an Australian Financial Services
            Licence (AFSL) or operates as an Authorised Representative of an AFSL holder. We
            verify this before activating any listing. Buyers deal directly with the syndicator;
            we facilitate the introduction and keep a record of your enquiry on your behalf.
          </Body>
        </div>
      </Section>

      {/* The Regal Bloodstock relationship — disclosed clearly */}
      <Section className="bg-paper-dim -mx-6 px-6">
        <div className="mx-auto max-w-2xl">
          <div className="mb-2 inline-flex items-center rounded-full bg-midnight/10 px-3 py-1">
            <Small className="font-semibold text-midnight">Ownership disclosure</Small>
          </div>
          <H2 className="mb-5">Who owns this platform</H2>
          <div className="space-y-4">
            <Body>
              Horse Racing Shares is owned and operated by{' '}
              <strong>Regal Bloodstock Pty Ltd</strong>, a Melbourne-based racehorse syndicator
              holding an Australian Financial Services Licence. Regal Bloodstock is itself a
              syndicator and lists its own horses on this marketplace.
            </Body>
            <Body>
              We are telling you this because you deserve to know. Regal&rsquo;s horses appear
              in search results alongside those from other syndicators. We do not artificially
              hide or suppress competitor listings. The marketplace is only useful — and only
              worth building — if buyers trust that the listings are genuine and fairly presented.
            </Body>
            <Body>
              What does Regal get from operating this platform? Two things: listing-fee revenue
              from other syndicators (which offsets operating costs), and access to a consented
              database of prospective owners who have explicitly agreed to receive information
              about racing syndication opportunities. If you enquire about a Regal horse, or if
              you tick the box consenting to hear about Regal offerings, Regal&rsquo;s team
              will follow up. If you don&rsquo;t tick that box, they won&rsquo;t.
            </Body>
            <Body>
              This arrangement is not hidden. It is disclosed in our{' '}
              <Link href="/legal/privacy" className="underline underline-offset-2 hover:text-midnight">
                Privacy Policy
              </Link>
              {' '}and{' '}
              <Link href="/legal/terms" className="underline underline-offset-2 hover:text-midnight">
                Terms of Use
              </Link>
              . You can manage your marketing preferences at any time from your{' '}
              <Link href="/account?tab=preferences" className="underline underline-offset-2 hover:text-midnight">
                account settings
              </Link>
              .
            </Body>
          </div>
        </div>
      </Section>

      {/* How it works */}
      <Section>
        <H2 className="mb-8">How it works</H2>
        <div className="space-y-8">
          {[
            {
              number: '01',
              heading: 'For buyers',
              body: 'Browse listings from verified syndicators. Save searches, build a wishlist, and enquire directly. Your enquiry is captured on our platform and forwarded to the syndicator within 60 seconds. We keep a record so you always have a trail.',
            },
            {
              number: '02',
              heading: 'For syndicators',
              body: 'Submit a listing with your PDS URL, share structure, and pricing. Pay a one-time listing fee. We review your AFSL status before activating your listing. You receive enquiries via email and can track performance from your dashboard.',
            },
            {
              number: '03',
              heading: 'Our role',
              body: 'We are the introduction layer, nothing more. We do not advise on which shares to buy, we do not take any part of the share price, and we do not guarantee any outcome. All financial product decisions are between the buyer and the syndicator.',
            },
          ].map(({ number, heading, body }) => (
            <div key={number} className="flex gap-6">
              <span className="mt-1 shrink-0 font-serif text-h3 font-bold text-brass/60 leading-none">
                {number}
              </span>
              <div>
                <H3 className="mb-2">{heading}</H3>
                <Body className="text-charcoal-soft">{body}</Body>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Compliance position */}
      <Section>
        <H2 className="mb-5">Our compliance position</H2>
        <div className="space-y-4">
          <Body>
            Horse Racing Shares does not issue financial products. Syndication shares in
            racehorses are financial products under the{' '}
            <em>Corporations Act 2001 (Cth)</em> when offered as managed investment schemes.
            Each syndicator listed on our platform is responsible for their own AFSL obligations,
            including the preparation and distribution of a Product Disclosure Statement.
          </Body>
          <Body>
            We verify that a syndicator holds a current AFSL (or is an Authorised Representative)
            and that a PDS URL is provided before any listing goes live. We do not verify the
            contents of the PDS, and we do not provide any form of financial advice to buyers.
          </Body>
          <Body>
            If you have concerns about a listing, contact us at{' '}
            <a
              href="mailto:compliance@horseracingshares.com"
              className="underline underline-offset-2 hover:text-midnight"
            >
              compliance@horseracingshares.com
            </a>
            . ASIC can be contacted at{' '}
            <a
              href="https://asic.gov.au"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-midnight"
            >
              asic.gov.au
            </a>
            .
          </Body>
        </div>
      </Section>

      {/* Contact */}
      <Section>
        <H2 className="mb-5">Contact us</H2>
        <div className="space-y-3">
          <Body>
            <strong>General enquiries:</strong>{' '}
            <a href="mailto:hello@horseracingshares.com" className="underline underline-offset-2 hover:text-midnight">
              hello@horseracingshares.com
            </a>
          </Body>
          <Body>
            <strong>Listing enquiries:</strong>{' '}
            <a href="mailto:listings@horseracingshares.com" className="underline underline-offset-2 hover:text-midnight">
              listings@horseracingshares.com
            </a>
          </Body>
          <Body>
            <strong>Compliance:</strong>{' '}
            <a href="mailto:compliance@horseracingshares.com" className="underline underline-offset-2 hover:text-midnight">
              compliance@horseracingshares.com
            </a>
          </Body>
          <Body className="text-charcoal-soft">
            Regal Bloodstock Pty Ltd · Melbourne, Victoria, Australia
          </Body>
        </div>
      </Section>

      {/* Compliance footer strip */}
      <div className="mx-auto max-w-2xl py-10">
        <Caption className="text-charcoal-soft leading-relaxed">
          Shares are issued by the listed syndicator under their own Product Disclosure Statement
          and Australian Financial Services Licence. Horse Racing Shares is an advertising platform
          and is not an issuer of financial products. We do not provide personal financial advice.
          Past racing performance of any horse is not a reliable indicator of future performance.{' '}
          <Link href="/legal/terms" className="underline underline-offset-2">
            Terms of Use
          </Link>
          {' · '}
          <Link href="/legal/privacy" className="underline underline-offset-2">
            Privacy Policy
          </Link>
        </Caption>
      </div>
    </main>
  );
}
