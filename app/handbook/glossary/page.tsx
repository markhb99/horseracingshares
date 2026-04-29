import type { Metadata } from 'next';
import Link from 'next/link';
import { glossaryTerms } from '@/content/handbook/glossary';
import { JsonLd } from '@/components/handbook/JsonLd';
import { H1, H5, Body, Lead, Caption } from '@/components/typography';

export const metadata: Metadata = {
  title: 'Racing glossary | Horse Racing Shares',
  description:
    'Plain-English definitions of every term you\'ll encounter as a racehorse owner in Australia.',
};

// ─── Group terms by first letter ─────────────────────────────────

function groupByLetter(terms: typeof glossaryTerms) {
  const map = new Map<string, typeof glossaryTerms>();
  const sorted = [...terms].sort((a, b) => a.term.localeCompare(b.term));

  for (const term of sorted) {
    const letter = term.term[0].toUpperCase();
    if (!map.has(letter)) map.set(letter, []);
    map.get(letter)!.push(term);
  }

  return map;
}

export default function GlossaryPage() {
  const grouped = groupByLetter(glossaryTerms);
  const letters = Array.from(grouped.keys()).sort();

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: glossaryTerms.map((t) => ({
      '@type': 'Question',
      name: t.term,
      acceptedAnswer: {
        '@type': 'Answer',
        text: t.definition,
      },
    })),
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://horseracingshares.com' },
        { '@type': 'ListItem', position: 2, name: 'Handbook', item: 'https://horseracingshares.com/handbook' },
        { '@type': 'ListItem', position: 3, name: 'Glossary', item: 'https://horseracingshares.com/handbook/glossary' },
      ],
    },
  };

  return (
    <main className="min-h-svh bg-paper pb-24">
      <JsonLd data={faqJsonLd} />

      {/* Header band */}
      <div className="bg-midnight text-paper py-14">
        <div className="mx-auto max-w-[var(--container-max)] px-[var(--container-pad)]">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-6">
            <ol className="flex items-center gap-2 text-small-type text-paper/60">
              <li><Link href="/" className="hover:text-paper transition-colors">Home</Link></li>
              <li aria-hidden="true">/</li>
              <li><Link href="/handbook" className="hover:text-paper transition-colors">Handbook</Link></li>
              <li aria-hidden="true">/</li>
              <li className="text-paper/80" aria-current="page">Glossary</li>
            </ol>
          </nav>

          <H1 className="font-serif text-paper mb-4">Racing Glossary</H1>
          <Lead className="text-paper/80 max-w-xl">
            Plain-English definitions of every term you&apos;ll encounter as a racehorse
            owner in Australia.
          </Lead>
        </div>
      </div>

      <div className="mx-auto max-w-[var(--container-max)] px-[var(--container-pad)] py-12">
        {/* Alphabet jump links */}
        <nav aria-label="Alphabet jump links" className="mb-10">
          <div className="flex flex-wrap gap-2">
            {letters.map((letter) => (
              <a
                key={letter}
                href={`#letter-${letter}`}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-fog bg-white text-small-type font-semibold text-midnight hover:bg-midnight hover:text-paper transition-colors"
              >
                {letter}
              </a>
            ))}
          </div>
        </nav>

        {/* Terms by letter */}
        <div className="space-y-16">
          {letters.map((letter) => {
            const terms = grouped.get(letter) ?? [];
            return (
              <section key={letter} id={`letter-${letter}`}>
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-display font-serif text-brass leading-none">
                    {letter}
                  </span>
                  <div className="flex-1 border-t border-fog" />
                </div>

                <dl className="space-y-8">
                  {terms.map((term) => (
                    <div key={term.anchor} id={term.anchor}>
                      <H5 className="font-serif text-midnight mb-1.5">{term.term}</H5>
                      <Body className="text-charcoal mb-2">{term.definition}</Body>
                      {term.seeAlso && term.seeAlso.length > 0 && (
                        <Caption>
                          See also:{' '}
                          {term.seeAlso.map((anchor, i) => {
                            const related = glossaryTerms.find((t) => t.anchor === anchor);
                            return (
                              <span key={anchor}>
                                {i > 0 && ', '}
                                <a
                                  href={`#${anchor}`}
                                  className="text-midnight underline hover:text-brass"
                                >
                                  {related?.term ?? anchor}
                                </a>
                              </span>
                            );
                          })}
                        </Caption>
                      )}
                    </div>
                  ))}
                </dl>
              </section>
            );
          })}
        </div>

        {/* Back to handbook */}
        <div className="mt-16 border-t border-fog pt-8">
          <Link
            href="/handbook"
            className="text-small-type font-medium text-midnight underline hover:text-brass transition-colors"
          >
            ← Back to The Handbook
          </Link>
        </div>
      </div>
    </main>
  );
}
