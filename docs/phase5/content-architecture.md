# Content architecture — Phase 5 spec

> **Status:** v1 (Phase 5).
> **Audience:** builder implementing the handbook hub, blog infrastructure, and glossary.

---

## 1. URL structure

```
/handbook                          — hub page
/handbook/[category]/[slug]        — individual article
/handbook/glossary                 — glossary (all terms, anchor-linked)
/handbook/the-numbers              — cost calculator (separate spec)
```

**Categories (URL segment → display name):**
| Segment | Display |
|---|---|
| `getting-started` | Getting started |
| `costs-returns` | Costs & returns |
| `bonus-schemes` | Bonus schemes |
| `trainers-syndicators` | Trainers & syndicators |
| `legal-tax` | Legal & tax |
| `raceday` | Raceday |

---

## 2. Article storage — MDX files

**Recommendation: MDX files in `content/handbook/[category]/[slug].mdx`.**

Justification:
- Mark is the only author at v1; a CMS adds complexity with no benefit yet.
- MDX is git-versioned — diffs are readable, rollback is trivial.
- Next.js 16 has first-class MDX support via `@next/mdx` or `next-mdx-remote`.
- When a non-dev author is needed, migrate to Supabase rows — the frontmatter schema maps 1:1 to a table row.

Use `next-mdx-remote` (already supports RSC) with gray-matter for frontmatter parsing.

---

## 3. Frontmatter schema

```ts
// lib/handbook/types.ts
export interface ArticleFrontmatter {
  slug: string;
  title: string;
  category: ArticleCategory;
  description: string;          // SEO meta description, max 160 chars
  published_at: string;         // ISO 8601 date, e.g. '2026-04-25'
  updated_at: string;           // ISO 8601 date
  reading_time_minutes: number;
  schema_type: 'Article' | 'HowTo' | 'FAQPage';
  /** Typesense rawFilterBy string — used to pull related HorseCards at end of article */
  related_horse_filter: string | null;
  /** 2–3 slugs of other articles to link at the bottom */
  related_article_slugs: string[];
}

export type ArticleCategory =
  | 'getting-started'
  | 'costs-returns'
  | 'bonus-schemes'
  | 'trainers-syndicators'
  | 'legal-tax'
  | 'raceday';
```

---

## 4. The 15 articles

| # | Slug | Title | Category | schema_type | related_horse_filter |
|---|---|---|---|---|---|
| 1 | `how-racehorse-ownership-works` | How racehorse ownership works in Australia | `getting-started` | HowTo | `null` |
| 2 | `what-is-a-syndicate` | What is a racehorse syndicate? | `getting-started` | Article | `null` |
| 3 | `understanding-share-sizes` | Understanding share sizes: from 1% to 10% | `getting-started` | Article | `null` |
| 4 | `real-cost-of-ownership` | The real cost of owning a racehorse share | `costs-returns` | Article | `null` |
| 5 | `prizemoney-explained` | How prizemoney is paid to racehorse owners | `costs-returns` | Article | `null` |
| 6 | `tax-treatment` | Tax treatment of racehorse ownership in Australia | `legal-tax` | Article | `null` |
| 7 | `what-is-a-pds` | What is a Product Disclosure Statement (PDS)? | `legal-tax` | HowTo | `null` |
| 8 | `bobs-explained` | BOBS explained: the NSW bonus scheme | `bonus-schemes` | Article | `bonus_schemes:=BOBS` |
| 9 | `vobis-explained` | VOBIS explained: the Victorian bonus scheme | `bonus-schemes` | Article | `bonus_schemes:=VOBIS` |
| 10 | `qtis-explained` | QTIS explained: the Queensland bonus scheme | `bonus-schemes` | Article | `bonus_schemes:=QTIS` |
| 11 | `mmrs-explained` | Magic Millions Race Series (MMRS) explained | `bonus-schemes` | Article | `bonus_schemes:=MMRS` |
| 12 | `picking-a-trainer` | Picking a trainer: 12 questions to ask | `trainers-syndicators` | HowTo | `null` |
| 13 | `questions-to-ask-syndicator` | 10 questions to ask your syndicator before signing | `trainers-syndicators` | HowTo | `null` |
| 14 | `your-first-raceday` | Your first raceday as an owner — what to expect | `raceday` | Article | `null` |
| 15 | `racing-australia-registration` | Racing Australia owner registration: a step-by-step guide | `getting-started` | HowTo | `null` |

**File layout:**
```
content/handbook/
  getting-started/
    how-racehorse-ownership-works.mdx
    what-is-a-syndicate.mdx
    understanding-share-sizes.mdx
    racing-australia-registration.mdx
  costs-returns/
    real-cost-of-ownership.mdx
    prizemoney-explained.mdx
  bonus-schemes/
    bobs-explained.mdx
    vobis-explained.mdx
    qtis-explained.mdx
    mmrs-explained.mdx
  trainers-syndicators/
    picking-a-trainer.mdx
    questions-to-ask-syndicator.mdx
  legal-tax/
    tax-treatment.mdx
    what-is-a-pds.mdx
  raceday/
    your-first-raceday.mdx
```

---

## 5. Internal linking strategy

**Rule 1 — RelatedHorses block:** every article ends with a `<RelatedHorses filter={frontmatter.related_horse_filter} />` component. If `related_horse_filter` is null (most articles), the component pulls the 3 most-viewed active horses with no filter. The component is a server component — it calls `searchHorses` at render time.

**Rule 2 — RelatedArticles block:** every article ends with a `<RelatedArticles slugs={frontmatter.related_article_slugs} />` component showing 2–3 linked article cards.

**Rule 3 — Hub → article:** the hub page (`/handbook`) links to all 15 articles via the category tab grid. Each article card shows title, category, reading time.

**Rule 4 — Article → calculator:** articles in `costs-returns` include an inline CTA block linking to `/handbook/the-numbers`.

**Rule 5 — Article → glossary:** MDX content should link unfamiliar terms to `/handbook/glossary#[term-anchor]`.

---

## 6. Schema.org markup

| Page | JSON-LD type |
|---|---|
| `/handbook` | `WebPage` + `BreadcrumbList` |
| `/handbook/[cat]/[slug]` (Article) | `Article` + `BreadcrumbList` |
| `/handbook/[cat]/[slug]` (HowTo) | `HowTo` + `BreadcrumbList` |
| `/handbook/[cat]/[slug]` (FAQPage) | `FAQPage` + `BreadcrumbList` |
| `/handbook/glossary` | `FAQPage` (each term = Q&A pair) + `BreadcrumbList` |
| `/handbook/the-numbers` | `WebApplication` + `BreadcrumbList` |

Implementation: a `<JsonLd data={...} />` component that renders a `<script type="application/ld+json">` tag. Pass the structured data object from the page's server component.

---

## 7. SEO title + description templates

```
Handbook hub:    "The Handbook | Horse Racing Shares"
                 "Everything a first-time owner should know about racehorse shares in Australia. Written plainly."

Article:         "[title] | Horse Racing Shares"
                 "[frontmatter.description]"  (max 160 chars, author-supplied)

Glossary:        "Racing glossary | Horse Racing Shares"
                 "Plain-English definitions of every term you'll encounter as a racehorse owner in Australia."

Calculator:      "Racehorse ownership cost calculator | Horse Racing Shares"
                 "Calculate the real 3-year cost of owning a racehorse share in Australia. Enter your share size, upfront price, and weekly fees."
```

---

## 8. Glossary data

Store glossary terms in `content/handbook/glossary.ts` — a typed array, not MDX. This makes it programmatically accessible (for tooltips elsewhere in the app, if needed later).

```ts
// content/handbook/glossary.ts
export interface GlossaryTerm {
  term: string;
  anchor: string;   // kebab-case, used as #anchor and aria-label
  definition: string;  // plain text, 1–3 sentences
  seeAlso?: string[];  // other anchor strings
}

export const glossaryTerms: GlossaryTerm[] = [
  // Builder: populate with ~40 terms covering: AFSL, PDS, syndicate,
  // share, prizemoney, barrier trial, gallop, blinkers, BOBS, VOBIS,
  // QTIS, MMRS, Magic Millions, Inglis, Racing Australia, strapper,
  // trainer, syndicator, principal racing authority, Group 1/2/3,
  // Listed race, black type, dam, sire, dam sire, foal date, weanling,
  // yearling, 2yo, 3yo, race day, stewards, protest, objection,
  // benchmark, ratings race, TAB, fixed odds, tote, wet track,
  // heavy track, barrier draw.
];
```

---

## 9. Files to create

| Path | Purpose |
|---|---|
| `content/handbook/` | MDX article files (15 articles, stub content) |
| `content/handbook/glossary.ts` | Typed glossary terms array (~40 terms) |
| `lib/handbook/types.ts` | `ArticleFrontmatter`, `ArticleCategory` types |
| `lib/handbook/articles.ts` | `getAllArticles()`, `getArticle(slug)`, `getArticlesByCategory()` helpers |
| `app/handbook/page.tsx` | Hub page — H1, start-here row, category tabs, article grid, glossary promo, newsletter CTA |
| `app/handbook/[category]/[slug]/page.tsx` | Article page — breadcrumb, title, reading time, MDX content, RelatedHorses, RelatedArticles |
| `app/handbook/glossary/page.tsx` | Glossary — alphabetical sections, anchor links |
| `components/handbook/ArticleCard.tsx` | Card used in hub grid and RelatedArticles |
| `components/handbook/RelatedHorses.tsx` | Server component — fetches 3 HorseCards from Typesense |
| `components/handbook/RelatedArticles.tsx` | Renders 2–3 ArticleCards from slugs |
| `components/handbook/JsonLd.tsx` | `<script type="application/ld+json">` wrapper |

*`/handbook/the-numbers` is covered by the separate cost-calculator spec.*

---

*— spec v1, 2026-04-25*
