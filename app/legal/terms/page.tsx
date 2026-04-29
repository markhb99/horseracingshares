import type { Metadata } from 'next';
import Link from 'next/link';
import { H1, H2, Body, Lead, Caption } from '@/components/typography';

export const metadata: Metadata = {
  title: 'Terms of Use',
  description: 'The terms governing your use of Horse Racing Shares.',
};

const LAST_UPDATED = '26 April 2026';
const CONTACT_EMAIL = 'hello@horseracingshares.com';

function PolicySection({
  id,
  heading,
  children,
}: {
  id: string;
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 space-y-4 border-b border-fog py-10">
      <H2 className="text-midnight">{heading}</H2>
      {children}
    </section>
  );
}

export default function TermsPage() {
  return (
    <main className="bg-paper px-6 pb-20">
      <div className="mx-auto max-w-2xl">

        {/* Header */}
        <div className="border-b border-fog py-16">
          <H1 className="mb-3">Terms of Use</H1>
          <Lead className="text-charcoal-soft">
            The rules for using Horse Racing Shares. Please read them.
          </Lead>
          <Caption className="mt-3 text-charcoal-soft">Last updated: {LAST_UPDATED}</Caption>
          <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3">
            <Caption className="text-yellow-800">
              <strong>Pre-launch note:</strong> These terms are a working draft and have not yet
              been reviewed by legal counsel. They will be finalised before public launch.
            </Caption>
          </div>
        </div>

        <section className="space-y-4 border-b border-fog py-10">
          <Body>
            These Terms of Use (&ldquo;Terms&rdquo;) govern your access to and use of the
            Horse Racing Shares website at horseracingshares.com (&ldquo;the Platform&rdquo;),
            operated by <strong>Regal Bloodstock Pty Ltd</strong> ABN [TO BE INSERTED]
            (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;).
          </Body>
          <Body>
            By accessing the Platform, you agree to be bound by these Terms. If you do not
            agree, do not use the Platform. These Terms are governed by the laws of Victoria,
            Australia.
          </Body>
        </section>

        <PolicySection id="platform" heading="1. The Platform">
          <Body>
            Horse Racing Shares is an advertising platform. We connect prospective racehorse
            owners (&ldquo;Buyers&rdquo;) with licensed syndicators who list shares for sale
            (&ldquo;Syndicators&rdquo;). We are not a financial product issuer, financial adviser,
            or party to any syndication agreement.
          </Body>
          <Body>
            Regal Bloodstock is a Syndicator that also owns and operates the Platform. Regal
            Bloodstock&rsquo;s own horses are listed alongside those of other Syndicators.
            This relationship is disclosed on our{' '}
            <Link href="/about" className="underline underline-offset-2 hover:text-midnight">
              About
            </Link>
            {' '}page.
          </Body>
        </PolicySection>

        <PolicySection id="no-advice" heading="2. No financial advice">
          <Body>
            <strong>
              Nothing on this Platform constitutes financial product advice, investment advice,
              or a recommendation to acquire any financial product.
            </strong>
          </Body>
          <Body>
            Racehorse syndication shares are financial products. Before acquiring any share, you
            should read the relevant Product Disclosure Statement (PDS) in full and consider
            whether the product is appropriate for your circumstances. You should obtain
            independent financial advice if you are uncertain.
          </Body>
          <Body>
            We display listings to help you find and compare opportunities. Any decision to
            enquire about or acquire a share is yours alone.
          </Body>
        </PolicySection>

        <PolicySection id="buyer-obligations" heading="3. Buyer obligations">
          <Body>As a Buyer, you agree to:</Body>
          <ul className="mt-2 space-y-2 pl-4">
            {[
              'Provide accurate information when registering and submitting enquiries',
              'Use the Platform only for lawful purposes',
              'Not submit frivolous or misleading enquiries',
              'Deal with Syndicators in good faith',
              'Not attempt to circumvent the Platform to avoid paying enquiry fees (there are none — but if we introduce such fees in future, this clause applies)',
              'Not scrape, index, or copy listings in bulk without our written permission',
            ].map((item) => (
              <li key={item} className="flex gap-2 text-body-type text-charcoal">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brass" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </PolicySection>

        <PolicySection id="syndicator-obligations" heading="4. Syndicator obligations">
          <Body>As a Syndicator listing on the Platform, you agree to:</Body>
          <ul className="mt-2 space-y-2 pl-4">
            {[
              'Hold a valid AFSL or operate as an Authorised Representative of an AFSL holder at the time of listing and throughout the listing period',
              'Provide a current, publicly accessible Product Disclosure Statement for each listed horse',
              'Ensure all listing information is accurate and not misleading',
              'Respond to enquiries forwarded by the Platform in a timely manner',
              'Not offer shares to buyers who you have reason to believe are not wholesale or retail clients as defined under the Corporations Act',
              'Notify us promptly if your AFSL status changes',
              'Pay listing fees as set out in your selected tier at the time of submission',
            ].map((item) => (
              <li key={item} className="flex gap-2 text-body-type text-charcoal">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brass" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </PolicySection>

        <PolicySection id="listings" heading="5. Listings and moderation">
          <Body>
            We review all listings before they go live. We may refuse, suspend, or remove any
            listing at our discretion, including where a listing is inaccurate, misleading,
            non-compliant, or where the Syndicator&rsquo;s AFSL status is not verified.
          </Body>
          <Body>
            Listing fees are non-refundable once a listing has been approved and activated,
            except where we remove a listing due to our own error. If we reject a listing at
            the moderation stage, we will refund the listing fee in full.
          </Body>
          <Body>
            Listings run for the duration of the selected tier. We do not guarantee any
            minimum number of enquiries or views.
          </Body>
        </PolicySection>

        <PolicySection id="enquiries" heading="6. Enquiries">
          <Body>
            When you submit an enquiry, we capture your details and forward them to the
            Syndicator. We retain a record of the enquiry. You acknowledge that your contact
            information will be shared with the Syndicator for the purpose of responding to
            your enquiry.
          </Body>
          <Body>
            We do not mediate, guarantee, or take responsibility for the outcome of any
            enquiry. Any subsequent dealings between you and a Syndicator are between you
            and them. We are not a party to any sale or syndication agreement.
          </Body>
        </PolicySection>

        <PolicySection id="intellectual-property" heading="7. Intellectual property">
          <Body>
            All Platform content that is original to us (design, copy, code, brand) is owned
            by Regal Bloodstock or licensed to us. You may not reproduce, distribute, or create
            derivative works from it without our written permission.
          </Body>
          <Body>
            Syndicators retain ownership of the content they upload (listing descriptions,
            photos, PDS documents). By uploading content, you grant us a non-exclusive licence
            to display it on the Platform and in promotional materials related to the Platform.
          </Body>
        </PolicySection>

        <PolicySection id="liability" heading="8. Limitation of liability">
          <Body>
            To the maximum extent permitted by law, we exclude all liability for any loss or
            damage arising from your use of the Platform, including any reliance on listings or
            information displayed. This includes direct, indirect, consequential, incidental,
            or special damages.
          </Body>
          <Body>
            Nothing in these Terms excludes any consumer guarantees under the{' '}
            <em>Australian Consumer Law</em> that cannot be lawfully excluded.
          </Body>
        </PolicySection>

        <PolicySection id="termination" heading="9. Termination">
          <Body>
            We may suspend or terminate your access to the Platform at any time for breach of
            these Terms or for any other reason at our discretion. You may close your account
            at any time from your account settings.
          </Body>
        </PolicySection>

        <PolicySection id="changes" heading="10. Changes to these Terms">
          <Body>
            We may update these Terms from time to time. We will notify registered users of
            material changes by email at least 14 days before they take effect. Continued use
            of the Platform after the effective date constitutes acceptance of the updated Terms.
          </Body>
        </PolicySection>

        <PolicySection id="contact" heading="11. Contact">
          <Body>
            Questions about these Terms:{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-2 hover:text-midnight">
              {CONTACT_EMAIL}
            </a>
          </Body>
          <Body className="text-charcoal-soft">
            Regal Bloodstock Pty Ltd · Melbourne, Victoria, Australia
          </Body>
        </PolicySection>

        {/* Footer */}
        <div className="pt-10 space-y-3">
          <Caption className="text-charcoal-soft">
            Last updated: {LAST_UPDATED} · Subject to change prior to public launch
          </Caption>
          <Caption className="text-charcoal-soft">
            <Link href="/legal/privacy" className="underline underline-offset-2">Privacy Policy</Link>
            {' · '}
            <Link href="/legal/cookies" className="underline underline-offset-2">Cookie Policy</Link>
            {' · '}
            <Link href="/about" className="underline underline-offset-2">About this platform</Link>
          </Caption>
        </div>

      </div>
    </main>
  );
}
