import Link from 'next/link';
import { SilksQuadrant } from '@/components/icons';

// ─── Footer link groups ───────────────────────────────────────────

const LINK_GROUPS = [
  {
    heading: 'Browse',
    links: [
      { label: 'Horses for sale', href: '/browse' },
      { label: 'By sire', href: '/sires' },
      { label: 'By trainer', href: '/trainers' },
      { label: 'By state', href: '/browse?sort=state' },
      { label: 'Recently sold', href: '/browse?filters=%7B%22status%22%3A%22sold%22%7D' },
    ],
  },
  {
    heading: 'Sell',
    links: [
      { label: 'List a horse', href: '/sell' },
      { label: 'Pricing', href: '/sell/pricing' },
      { label: 'How it works', href: '/sell/how-it-works' },
      { label: 'Syndicator login', href: '/sign-in' },
    ],
  },
  {
    heading: 'The Handbook',
    links: [
      { label: 'Getting started', href: '/handbook/getting-started' },
      { label: 'The real cost', href: '/handbook/the-numbers' },
      { label: 'Bonus schemes', href: '/handbook/bonus-schemes' },
      { label: 'Glossary', href: '/handbook/glossary' },
      { label: 'All articles', href: '/handbook' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Contact', href: '/contact' },
      { label: 'Careers', href: '/careers' },
      { label: 'Press', href: '/press' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Privacy policy', href: '/legal/privacy' },
      { label: 'Terms of use', href: '/legal/terms' },
      { label: 'Cookie settings', href: '/legal/cookies' },
      { label: 'Compliance', href: '/legal/compliance' },
    ],
  },
] as const;

// ─── Footer ───────────────────────────────────────────────────────

export function Footer() {
  return (
    <footer className="bg-paper-dim border-t border-fog">
      {/* Main link columns */}
      <div className="mx-auto max-w-[var(--container-max)] px-[var(--container-pad)] py-12">
        {/* Brand + columns row */}
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-6">
          {/* Brand column */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-1 flex flex-col gap-4">
            <Link
              href="/"
              className="flex items-center gap-2.5 w-fit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
              aria-label="Horse Racing Shares — home"
            >
              <SilksQuadrant size={28} className="rounded-sm shrink-0" />
              <span className="font-serif font-semibold text-midnight text-[0.9375rem] leading-none">
                Horse Racing Shares
              </span>
            </Link>
            <p className="text-caption-type text-charcoal-soft max-w-[200px]">
              The Australian home of racehorse shares.
            </p>
          </div>

          {/* Link groups */}
          {LINK_GROUPS.map((group) => (
            <div key={group.heading} className="flex flex-col gap-3">
              <p className="text-caption-type font-semibold uppercase tracking-wider text-midnight">
                {group.heading}
              </p>
              <ul className="flex flex-col gap-2">
                {group.links.map(({ label, href }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-caption-type text-charcoal-soft hover:text-midnight transition-colors duration-[120ms]"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Compliance strip */}
      <div className="bg-fog-dark">
        <div className="mx-auto max-w-[var(--container-max)] px-[var(--container-pad)] py-4">
          <p className="text-caption-type text-charcoal text-center leading-relaxed">
            Shares are issued by the listed syndicator under their own Product
            Disclosure Statement and Australian Financial Services Licence. Horse
            Racing Shares is an advertising platform and is not an issuer of
            financial products. We do not provide personal financial advice.
          </p>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="bg-midnight-dark">
        <div className="mx-auto max-w-[var(--container-max)] px-[var(--container-pad)] py-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
          <p className="text-caption-type text-paper/60 text-center">
            &copy; 2026 Horse Racing Shares, operated by Regal Bloodstock Pty
            Ltd &middot; AFSL [NUMBER]
          </p>
        </div>
      </div>
    </footer>
  );
}
