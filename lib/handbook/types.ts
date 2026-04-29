export interface ArticleFrontmatter {
  slug: string;
  title: string;
  category: ArticleCategory;
  description: string;
  published_at: string;
  updated_at: string;
  reading_time_minutes: number;
  schema_type: 'Article' | 'HowTo' | 'FAQPage';
  related_horse_filter: string | null;
  related_article_slugs: string[];
}

export type ArticleCategory =
  | 'getting-started'
  | 'costs-returns'
  | 'bonus-schemes'
  | 'trainers-syndicators'
  | 'legal-tax'
  | 'raceday';

export const CATEGORY_DISPLAY: Record<ArticleCategory, string> = {
  'getting-started': 'Getting started',
  'costs-returns': 'Costs & returns',
  'bonus-schemes': 'Bonus schemes',
  'trainers-syndicators': 'Trainers & syndicators',
  'legal-tax': 'Legal & tax',
  'raceday': 'Raceday',
};
