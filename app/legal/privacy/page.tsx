import type { Metadata } from 'next';
import Link from 'next/link';
import { H1, H2, H3, Body, Lead, Caption } from '@/components/typography';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Horse Racing Shares collects, uses, and protects your personal information.',
};

const LAST_UPDATED = '26 April 2026';
const CONTACT_EMAIL = 'privacy@horseracingshares.com';
const SITE_URL = 'https://horseracingshares.com';

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

export default function PrivacyPolicyPage() {
  return (
    <main className="bg-paper px-6 pb-20">
      <div className="mx-auto max-w-2xl">

        {/* Header */}
        <div className="border-b border-fog py-16">
          <H1 className="mb-3">Privacy Policy</H1>
          <Lead className="text-charcoal-soft">
            How we collect, use, and protect your personal information.
          </Lead>
          <Caption className="mt-3 text-charcoal-soft">Last updated: {LAST_UPDATED}</Caption>
          <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3">
            <Caption className="text-yellow-800">
              <strong>Pre-launch note:</strong> This policy is a working draft and has not yet
              been reviewed by legal counsel. It will be finalised before public launch.
            </Caption>
          </div>
        </div>

        {/* Overview */}
        <section className="space-y-4 border-b border-fog py-10">
          <Body>
            Horse Racing Shares is operated by <strong>Regal Bloodstock Pty Ltd</strong>{' '}
            ABN [TO BE INSERTED] (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;). We are
            committed to protecting your privacy in accordance with the{' '}
            <em>Privacy Act 1988 (Cth)</em> and the Australian Privacy Principles (APPs).
          </Body>
          <Body>
            This policy explains what personal information we collect, why we collect it, how
            we use and disclose it, and your rights in relation to it. By using our website at{' '}
            <a href={SITE_URL} className="underline underline-offset-2 hover:text-midnight">
              {SITE_URL}
            </a>
            , you agree to the collection and use of information in accordance with this policy.
          </Body>
        </section>

        <PolicySection id="collection" heading="1. What we collect">
          <H3 className="text-base">Information you provide directly</H3>
          <Body>When you register an account, we collect your name and email address. When you submit an enquiry about a horse listing, we collect your name, email address, and mobile number. When you fill out your account profile, we may collect additional information such as your state of residence, ownership experience, and investment preferences.</Body>

          <H3 className="text-base mt-6">Information collected automatically</H3>
          <Body>
            We collect standard web analytics data including IP address, browser type, pages
            visited, time spent on pages, and referring URLs. This data is collected via
            PostHog (analytics), and standard web server logs. We use cookies — see our{' '}
            <Link href="/legal/cookies" className="underline underline-offset-2 hover:text-midnight">
              Cookie Policy
            </Link>
            {' '}for details.
          </Body>

          <H3 className="text-base mt-6">Information from syndicators</H3>
          <Body>If you are a syndicator, we collect your business name, ABN, AFSL number, and contact details as part of the listing process.</Body>
        </PolicySection>

        <PolicySection id="use" heading="2. How we use your information">
          <Body>We use your personal information to:</Body>
          <ul className="mt-2 space-y-2 pl-4">
            {[
              'Operate and maintain your account and the platform',
              'Process and forward your enquiries to the relevant syndicator',
              'Send transactional emails (account, enquiry confirmations, listing notifications)',
              'Send marketing emails if you have consented — including our weekly shortlist newsletter and new-listing alerts matching your saved searches',
              'Contact you about Regal Bloodstock syndication opportunities if you have consented to Regal communications specifically',
              'Score and segment buyer intent profiles for internal analytics (this data is never sold)',
              'Comply with our legal obligations',
              'Improve the platform through usage analytics',
            ].map((item) => (
              <li key={item} className="flex gap-2 text-body-type text-charcoal">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brass" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </PolicySection>

        <PolicySection id="disclosure" heading="3. Who we share your information with">
          <H3 className="text-base">Syndicators</H3>
          <Body>
            When you submit an enquiry about a horse listing, your name, email, mobile number,
            and enquiry details are forwarded to the syndicator who listed that horse. You consent
            to this forwarding by submitting an enquiry. We tick a checkbox during the enquiry
            form confirming this.
          </Body>

          <H3 className="text-base mt-6">Regal Bloodstock</H3>
          <Body>
            Because Regal Bloodstock owns and operates this platform, Regal has access to
            aggregate platform data and to enquiries about Regal&rsquo;s own listings. Regal does
            not automatically receive your data about enquiries made to other syndicators. If you
            tick the consent box for &ldquo;Regal Bloodstock communications&rdquo;, Regal&rsquo;s
            sales team may contact you directly about Regal syndication opportunities.
          </Body>

          <H3 className="text-base mt-6">Service providers</H3>
          <Body>
            We use the following third-party service providers who may process your data on our
            behalf: Supabase (database hosting, authentication), Resend (transactional email),
            Loops (marketing email), PostHog (analytics), Vercel (web hosting), Stripe (payment
            processing for syndicator listing fees only). All providers are contractually bound
            to process your data only as directed by us.
          </Body>

          <H3 className="text-base mt-6">Legal requirements</H3>
          <Body>We may disclose your information if required by law, court order, or regulatory authority.</Body>

          <H3 className="text-base mt-6">We do not sell your data</H3>
          <Body>We do not sell, rent, or trade your personal information to third parties for their own marketing purposes.</Body>
        </PolicySection>

        <PolicySection id="consent" heading="4. Consent and marketing">
          <Body>
            We collect marketing consent through granular opt-in checkboxes. You can choose
            separately whether to receive: (a) our weekly new-listing newsletter; (b) email
            alerts when new horses match your saved searches; (c) communications from Regal
            Bloodstock about their own syndication opportunities; (d) sharing of your contact
            details with the syndicator whose horse you enquire about (required for enquiries
            to function).
          </Body>
          <Body>
            You can withdraw any of these consents at any time from your{' '}
            <Link href="/account?tab=preferences" className="underline underline-offset-2 hover:text-midnight">
              account preferences
            </Link>
            {' '}or by emailing{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-2 hover:text-midnight">
              {CONTACT_EMAIL}
            </a>
            . Withdrawal does not affect the lawfulness of any processing already carried out.
          </Body>
        </PolicySection>

        <PolicySection id="retention" heading="5. Data retention">
          <Body>
            We retain your account data for as long as your account is active. If you request
            deletion of your account, we will delete or anonymise your personal information
            within 30 days, except where we are required by law to retain it (e.g., financial
            records relating to payment transactions).
          </Body>
          <Body>
            Enquiry records are retained for [TO BE DETERMINED — subject to legal review] to
            allow syndicators to reference past interactions and for us to resolve disputes.
          </Body>
        </PolicySection>

        <PolicySection id="rights" heading="6. Your rights">
          <Body>Under the Australian Privacy Act, you have the right to:</Body>
          <ul className="mt-2 space-y-2 pl-4">
            {[
              'Access the personal information we hold about you',
              'Request correction of inaccurate or incomplete information',
              'Request deletion of your personal information (subject to legal obligations)',
              'Make a complaint about how we handle your information',
            ].map((item) => (
              <li key={item} className="flex gap-2 text-body-type text-charcoal">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brass" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
          <Body className="mt-4">
            To exercise these rights, email us at{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-2 hover:text-midnight">
              {CONTACT_EMAIL}
            </a>
            . We will respond within 30 days.
          </Body>
        </PolicySection>

        <PolicySection id="security" heading="7. Security">
          <Body>
            We implement industry-standard security measures including encrypted data storage,
            HTTPS, row-level security on our database, and access controls. We do not store
            payment card details — all payments are processed by Stripe.
          </Body>
          <Body>
            Despite our best efforts, no method of transmission over the internet is 100% secure.
            If you suspect a security incident affecting your account, contact us immediately
            at{' '}
            <a href="mailto:security@horseracingshares.com" className="underline underline-offset-2 hover:text-midnight">
              security@horseracingshares.com
            </a>
            .
          </Body>
        </PolicySection>

        <PolicySection id="complaints" heading="8. Complaints">
          <Body>
            If you believe we have breached the Australian Privacy Principles, you may make a
            complaint by emailing{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-2 hover:text-midnight">
              {CONTACT_EMAIL}
            </a>
            . We will investigate and respond within 30 days.
          </Body>
          <Body>
            If you are unsatisfied with our response, you may lodge a complaint with the{' '}
            <a
              href="https://www.oaic.gov.au"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-midnight"
            >
              Office of the Australian Information Commissioner (OAIC)
            </a>
            .
          </Body>
        </PolicySection>

        <PolicySection id="changes" heading="9. Changes to this policy">
          <Body>
            We may update this policy from time to time. We will notify registered users of
            material changes by email. Continued use of the platform after the effective date
            of any change constitutes acceptance of the updated policy.
          </Body>
        </PolicySection>

        {/* Footer */}
        <div className="pt-10 space-y-3">
          <Caption className="text-charcoal-soft">
            Last updated: {LAST_UPDATED} · Regal Bloodstock Pty Ltd, Melbourne, Victoria, Australia
          </Caption>
          <Caption className="text-charcoal-soft">
            <Link href="/legal/terms" className="underline underline-offset-2">Terms of Use</Link>
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
