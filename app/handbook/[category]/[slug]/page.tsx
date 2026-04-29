import type React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { compileMDX } from 'next-mdx-remote/rsc';
import { getAllArticleSlugs, getArticle, getAllArticles } from '@/lib/handbook/articles';
import { CATEGORY_DISPLAY } from '@/lib/handbook/types';
import type { ArticleFrontmatter } from '@/lib/handbook/types';
import { RelatedHorses } from '@/components/handbook/RelatedHorses';
import { RelatedArticles } from '@/components/handbook/RelatedArticles';
import { JsonLd } from '@/components/handbook/JsonLd';
import { H1, H2, Body } from '@/components/typography';

// ─── MDX components ───────────────────────────────────────────────

const MDX_COMPONENTS = {
  h2: H2,
  p: Body,
  a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...props} className="text-midnight underline hover:text-brass" />
  ),
};

// ─── Static params ────────────────────────────────────────────────

export async function generateStaticParams() {
  return getAllArticleSlugs();
}

// ─── Metadata ─────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}): Promise<Metadata> {
  const { category, slug } = await params;
  const result = await getArticle(category, slug);
  if (!result) return {};

  const { frontmatter } = result;
  return {
    title: `${frontmatter.title} | Horse Racing Shares`,
    description: frontmatter.description,
  };
}

// ─── JSON-LD helpers ──────────────────────────────────────────────

function buildJsonLd(
  frontmatter: ArticleFrontmatter,
  url: string,
) {
  const breadcrumb = {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://horseracingshares.com' },
      { '@type': 'ListItem', position: 2, name: 'Handbook', item: 'https://horseracingshares.com/handbook' },
      {
        '@type': 'ListItem',
        position: 3,
        name: CATEGORY_DISPLAY[frontmatter.category],
        item: `https://horseracingshares.com/handbook/${frontmatter.category}`,
      },
      { '@type': 'ListItem', position: 4, name: frontmatter.title, item: url },
    ],
  };

  if (frontmatter.schema_type === 'HowTo') {
    return {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: frontmatter.title,
      description: frontmatter.description,
      url,
      breadcrumb,
    };
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: frontmatter.title,
    description: frontmatter.description,
    datePublished: frontmatter.published_at,
    dateModified: frontmatter.updated_at,
    url,
    breadcrumb,
    publisher: {
      '@type': 'Organization',
      name: 'Horse Racing Shares',
      url: 'https://horseracingshares.com',
    },
  };
}

// ─── Page ─────────────────────────────────────────────────────────

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category, slug } = await params;
  const result = await getArticle(category, slug);
  if (!result) notFound();

  const { frontmatter, content: rawContent } = result;
  const allArticles = await getAllArticles();

  const { content } = await compileMDX({
    source: rawContent,
    options: { parseFrontmatter: false },
    components: MDX_COMPONENTS,
  });

  const categoryLabel = CATEGORY_DISPLAY[frontmatter.category] ?? frontmatter.category;
  const articleUrl = `https://horseracingshares.com/handbook/${category}/${slug}`;
  const jsonLd = buildJsonLd(frontmatter, articleUrl);

  // Format dates DD/MM/YYYY
  function fmtDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  return (
    <main className="min-h-svh bg-paper pb-24">
      <JsonLd data={jsonLd} />

      {/* Header band */}
      <div className="bg-fog border-b border-fog">
        <div className="mx-auto max-w-[var(--container-max)] px-[var(--container-pad)] py-4">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-2 text-small-type text-charcoal-soft">
              <li><Link href="/" className="hover:text-midnight transition-colors">Home</Link></li>
              <li aria-hidden="true">/</li>
              <li><Link href="/handbook" className="hover:text-midnight transition-colors">Handbook</Link></li>
              <li aria-hidden="true">/</li>
              <li className="text-charcoal" aria-current="page">{frontmatter.title}</li>
            </ol>
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-[var(--container-max)] px-[var(--container-pad)] py-12">
        <div className="max-w-2xl">
          {/* Category badge */}
          <span className="inline-flex items-center rounded-full bg-fog px-3 py-1 mb-4">
            <span className="text-caption-type font-medium text-charcoal">{categoryLabel}</span>
          </span>

          {/* Title */}
          <H1 className="font-serif text-midnight mb-4">{frontmatter.title}</H1>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-4 mb-10 text-caption-type text-charcoal-soft">
            <span>{frontmatter.reading_time_minutes} min read</span>
            <span>Published {fmtDate(frontmatter.published_at)}</span>
            {frontmatter.updated_at !== frontmatter.published_at && (
              <span>Updated {fmtDate(frontmatter.updated_at)}</span>
            )}
          </div>

          {/* MDX content */}
          <article className="prose-article">
            {content}
          </article>

          {/* Costs-returns: inline calculator CTA */}
          {frontmatter.category === 'costs-returns' && (
            <div className="mt-10 rounded-lg bg-midnight text-paper p-6">
              <H2 className="text-h4 font-serif text-paper mb-2">
                Run the numbers for your situation
              </H2>
              <p className="text-small-type text-paper/80 mb-4">
                Our cost calculator lets you model the real 3-year cost of a specific
                share size and upfront price.
              </p>
              <Link
                href="/handbook/the-numbers"
                className="inline-block rounded-lg bg-brass text-midnight px-5 py-2.5 text-small-type font-semibold hover:opacity-90 transition-opacity"
              >
                Open the calculator →
              </Link>
            </div>
          )}
        </div>

        {/* Related horses */}
        <div className="max-w-4xl">
          <RelatedHorses filter={frontmatter.related_horse_filter} />

          {/* Related articles */}
          <RelatedArticles
            slugs={frontmatter.related_article_slugs}
            allArticles={allArticles}
          />
        </div>
      </div>
    </main>
  );
}
