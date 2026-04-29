import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllArticles } from '@/lib/handbook/articles';
import { CATEGORY_DISPLAY } from '@/lib/handbook/types';
import type { ArticleCategory } from '@/lib/handbook/types';
import { ArticleCard } from '@/components/handbook/ArticleCard';
import { JsonLd } from '@/components/handbook/JsonLd';
import { HandbookNewsletter } from '@/components/handbook/HandbookNewsletter';
import { H1, H2, Lead, Small } from '@/components/typography';

export const metadata: Metadata = {
  title: 'The Handbook | Horse Racing Shares',
  description:
    'Everything a first-time owner should know about racehorse shares in Australia. Written plainly.',
};

// Featured article slugs in order (articles 1, 4, 14 per spec)
const FEATURED_SLUGS = [
  'how-racehorse-ownership-works',
  'real-cost-of-ownership',
  'your-first-raceday',
];

const ALL_CATEGORIES: ArticleCategory[] = [
  'getting-started',
  'costs-returns',
  'bonus-schemes',
  'trainers-syndicators',
  'legal-tax',
  'raceday',
];

export default async function HandbookPage() {
  const allArticles = await getAllArticles();

  const featured = FEATURED_SLUGS.map((slug) =>
    allArticles.find((a) => a.slug === slug),
  ).filter(Boolean);

  const byCategory = ALL_CATEGORIES.map((cat) => ({
    category: cat,
    label: CATEGORY_DISPLAY[cat],
    articles: allArticles.filter((a) => a.category === cat),
  })).filter((c) => c.articles.length > 0);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'The Handbook | Horse Racing Shares',
    description:
      'Everything a first-time owner should know about racehorse shares in Australia.',
    url: 'https://horseracingshares.com/handbook',
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://horseracingshares.com' },
        { '@type': 'ListItem', position: 2, name: 'Handbook', item: 'https://horseracingshares.com/handbook' },
      ],
    },
  };

  return (
    <main className="min-h-svh bg-paper pb-24">
      <JsonLd data={jsonLd} />

      {/* Hero */}
      <section className="bg-midnight text-paper py-16">
        <div className="mx-auto max-w-[var(--container-max)] px-[var(--container-pad)]">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-6">
            <ol className="flex items-center gap-2 text-small-type text-paper/60">
              <li><Link href="/" className="hover:text-paper transition-colors">Home</Link></li>
              <li aria-hidden="true">/</li>
              <li className="text-paper/80" aria-current="page">Handbook</li>
            </ol>
          </nav>

          <H1 className="font-serif text-paper mb-4">The Handbook</H1>
          <Lead className="text-paper/80 max-w-xl">
            Everything a first-time owner should know about racehorse shares in Australia.
            Written plainly.
          </Lead>
        </div>
      </section>

      <div className="mx-auto max-w-[var(--container-max)] px-[var(--container-pad)] py-12">
        {/* Start-here row */}
        {featured.length > 0 && (
          <section className="mb-16">
            <H2 className="font-serif text-midnight mb-6">Start here</H2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {featured.map((article) =>
                article ? (
                  <ArticleCard key={article.slug} frontmatter={article} />
                ) : null,
              )}
            </div>
          </section>
        )}

        {/* Category sections */}
        {byCategory.map(({ category, label, articles }) => (
          <section key={category} className="mb-16">
            <H2 className="font-serif text-midnight mb-6">{label}</H2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
              {articles.map((article) => (
                <ArticleCard key={article.slug} frontmatter={article} />
              ))}
            </div>
          </section>
        ))}

        {/* Glossary promo */}
        <section className="mb-16">
          <Link
            href="/handbook/glossary"
            className="group flex items-center justify-between rounded-lg bg-midnight text-paper px-8 py-6 hover:bg-midnight-light transition-colors duration-[320ms]"
          >
            <div>
              <p className="text-h4 font-serif font-semibold mb-1">Racing terms, plainly defined</p>
              <Small className="text-paper/70">
                40+ terms — from AFSL to yearling, without the jargon.
              </Small>
            </div>
            <span className="text-h3 text-brass group-hover:translate-x-1 transition-transform duration-[120ms]">
              →
            </span>
          </Link>
        </section>

        {/* Newsletter CTA */}
        <section className="rounded-lg border border-fog bg-white p-8">
          <H2 className="font-serif text-midnight mb-2 text-h4">Stay in the loop</H2>
          <p className="text-small-type text-charcoal-soft mb-5">
            New articles, listings, and owner guides — delivered to your inbox.
          </p>
          <HandbookNewsletter source="handbook_hub" />
        </section>
      </div>
    </main>
  );
}
