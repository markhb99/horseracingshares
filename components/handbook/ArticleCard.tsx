import Link from 'next/link';
import type { ArticleFrontmatter } from '@/lib/handbook/types';
import { CATEGORY_DISPLAY } from '@/lib/handbook/types';
import { H5, Caption, Small } from '@/components/typography';

interface ArticleCardProps {
  frontmatter: ArticleFrontmatter;
}

export function ArticleCard({ frontmatter }: ArticleCardProps) {
  const href = `/handbook/${frontmatter.category}/${frontmatter.slug}`;
  const categoryLabel = CATEGORY_DISPLAY[frontmatter.category];

  return (
    <Link
      href={href}
      className="group flex flex-col bg-white rounded-lg border border-fog p-5 shadow-sm hover:shadow-md transition-shadow duration-[320ms]"
    >
      {/* Category badge */}
      <span className="inline-flex w-fit items-center rounded-full bg-fog px-2.5 py-0.5 mb-3">
        <Caption className="text-charcoal font-medium">{categoryLabel}</Caption>
      </span>

      {/* Title */}
      <H5 className="font-serif text-midnight group-hover:text-brass transition-colors duration-[120ms] mb-1.5">
        {frontmatter.title}
      </H5>

      {/* Reading time */}
      <Caption className="mb-2">
        {frontmatter.reading_time_minutes} min read
      </Caption>

      {/* Description */}
      <Small className="text-charcoal-soft line-clamp-3 mt-auto">
        {frontmatter.description}
      </Small>
    </Link>
  );
}
