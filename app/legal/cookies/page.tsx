import type { Metadata } from 'next';
import Link from 'next/link';
import { H1, H2, H3, Body, Lead, Caption } from '@/components/typography';

export const metadata: Metadata = {
  title: 'Cookie Policy',
  description: 'How Horse Racing Shares uses cookies and similar technologies.',
};

const LAST_UPDATED = '26 April 2026';
const CONTACT_EMAIL = 'privacy@horseracingshares.com';

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

interface CookieRow {
  name: string;
  provider: string;
  purpose: string;
  duration: string;
}

function CookieTable({ cookies }: { cookies: CookieRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-small-type">
        <thead>
          <tr className="border-b border-fog">
            <th className="py-2 pr-4 text-left font-semibold text-charcoal">Name</th>
            <th className="py-2 pr-4 text-left font-semibold text-charcoal">Provider</th>
            <th className="py-2 pr-4 text-left font-semibold text-charcoal">Purpose</th>
            <th className="py-2 text-left font-semibold text-charcoal">Duration</th>
          </tr>
        </thead>
        <tbody>
          {cookies.map((row) => (
            <tr key={row.name} className="border-b border-fog/50">
              <td className="py-2.5 pr-4 font-mono text-caption-type text-midnight">{row.name}</td>
              <td className="py-2.5 pr-4 text-charcoal-soft">{row.provider}</td>
              <td className="py-2.5 pr-4 text-charcoal-soft">{row.purpose}</td>
              <td className="py-2.5 text-charcoal-soft">{row.duration}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const ESSENTIAL_COOKIES: CookieRow[] = [
  {
    name: 'sb-*',
    provider: 'Supabase',
    purpose: 'Authentication session tokens — keeps you logged in',
    duration: 'Session / 1 week',
  },
  {
    name: '__Host-next-auth.*',
    provider: 'Next.js',
    purpose: 'CSRF protection and Next.js routing state',
    duration: 'Session',
  },
];

const ANALYTICS_COOKIES: CookieRow[] = [
  {
    name: 'ph_*',
    provider: 'PostHog',
    purpose: 'Anonymous usage analytics — page views, feature events, session replay',
    duration: '1 year',
  },
  {
    name: 'posthog_*',
    provider: 'PostHog',
    purpose: 'PostHog session identification',
    duration: '1 year',
  },
];

export default function CookiePolicyPage() {
  return (
    <main className="bg-paper px-6 pb-20">
      <div className="mx-auto max-w-2xl">

        {/* Header */}
        <div className="border-b border-fog py-16">
          <H1 className="mb-3">Cookie Policy</H1>
          <Lead className="text-charcoal-soft">
            How we use cookies and similar tracking technologies on this website.
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
            ABN [TO BE INSERTED]. This Cookie Policy explains what cookies we use, why we use
            them, and how you can control them. For broader privacy information, see our{' '}
            <Link href="/legal/privacy" className="underline underline-offset-2 hover:text-midnight">
              Privacy Policy
            </Link>
            .
          </Body>
          <Body>
            A cookie is a small text file placed on your device by a website when you visit it.
            Cookies allow the site to remember information about your visit — such as your login
            session — and help us understand how the site is being used.
          </Body>
        </section>

        <PolicySection id="essential" heading="1. Strictly necessary cookies">
          <Body>
            These cookies are required for the website to function. They cannot be disabled
            without breaking core features such as logging in and staying logged in.
          </Body>
          <Body>
            We do not require your consent to set these cookies because we have a legitimate
            interest in operating a secure, functional service.
          </Body>
          <CookieTable cookies={ESSENTIAL_COOKIES} />
        </PolicySection>

        <PolicySection id="analytics" heading="2. Analytics cookies">
          <Body>
            We use <strong>PostHog</strong> to collect anonymous usage data — which pages are
            visited, how long visitors spend on them, and which features are used most. This
            data helps us improve the platform. PostHog stores data on servers located in the
            European Union (EU).
          </Body>
          <Body>
            Session replay is enabled for registered users to help us diagnose usability issues.
            Sensitive form fields (password inputs, payment fields) are automatically masked and
            never captured.
          </Body>
          <Body>
            We do not use analytics cookies for advertising and do not share this data with
            advertising networks.
          </Body>
          <CookieTable cookies={ANALYTICS_COOKIES} />
        </PolicySection>

        <PolicySection id="no-advertising" heading="3. Advertising and third-party cookies">
          <Body>
            We do not use advertising cookies, retargeting pixels, or social media tracking
            cookies on this website. We do not share your browsing behaviour with advertising
            networks.
          </Body>
          <Body>
            If this changes in future, we will update this policy and obtain your consent before
            placing any advertising cookies.
          </Body>
        </PolicySection>

        <PolicySection id="local-storage" heading="4. Local storage">
          <Body>
            In addition to cookies, we use browser local storage to save your filter preferences
            on the{' '}
            <Link href="/browse" className="underline underline-offset-2 hover:text-midnight">
              Browse
            </Link>
            {' '}page between sessions. This data stays on your device and is never transmitted
            to our servers.
          </Body>
        </PolicySection>

        <PolicySection id="manage" heading="5. How to manage cookies">
          <H3 className="text-base">Browser settings</H3>
          <Body>
            You can control and delete cookies through your browser settings. Most browsers
            allow you to refuse all cookies or to delete cookies that have already been set.
            Be aware that disabling essential cookies will prevent you from logging in.
          </Body>
          <ul className="mt-2 space-y-2 pl-4">
            {[
              'Chrome: Settings → Privacy and security → Cookies and other site data',
              'Firefox: Settings → Privacy & Security → Cookies and Site Data',
              'Safari: Settings → Privacy → Manage Website Data',
              'Edge: Settings → Cookies and site permissions → Cookies and data stored',
            ].map((item) => (
              <li key={item} className="flex gap-2 text-body-type text-charcoal">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brass" aria-hidden />
                {item}
              </li>
            ))}
          </ul>

          <H3 className="text-base mt-6">Opting out of PostHog analytics</H3>
          <Body>
            PostHog provides a global opt-out. You can also install the{' '}
            <a
              href="https://posthog.com/docs/privacy/gdpr"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-midnight"
            >
              PostHog opt-out
            </a>
            {' '}in your browser, or use a standard ad-blocker which will block PostHog tracking
            by default.
          </Body>
        </PolicySection>

        <PolicySection id="changes" heading="6. Changes to this policy">
          <Body>
            We may update this Cookie Policy from time to time. If we make material changes —
            such as adding new cookie types — we will update the date at the top of this page
            and notify registered users by email.
          </Body>
        </PolicySection>

        <PolicySection id="contact" heading="7. Contact">
          <Body>
            Questions about our use of cookies:{' '}
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
            <Link href="/legal/terms" className="underline underline-offset-2">Terms of Use</Link>
            {' · '}
            <Link href="/about" className="underline underline-offset-2">About this platform</Link>
          </Caption>
        </div>

      </div>
    </main>
  );
}
