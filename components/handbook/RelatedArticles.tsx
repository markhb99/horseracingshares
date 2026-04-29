import type { ArticleFrontmatter } from '@/lib/handbook/types';
import { ArticleCard } from '@/components/handbook/ArticleCard';

interface RelatedArticlesProps {
  slugs: string[];
  allArticles: ArticleFrontmatter[];
}

export function RelatedArticles({ slugs, allArticles }: RelatedArticlesProps) {
  const related = slugs
    .map((slug) => allArticles.find((a) => a.slug === slug))
    .filter((a): a is ArticleFrontmatter => a !== undefined)
    .slice(0, 3);

  if (!related.length) return null;

  return (
    <section className="mt-12">
      <h2 className="text-h3 font-serif text-midnight mb-6">Related articles</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {related.map((article) => (
          <ArticleCard key={article.slug} frontmatter={article} />
        ))}
      </div>
    </section>
  );
}
