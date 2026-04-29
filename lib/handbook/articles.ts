import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import type { ArticleFrontmatter, ArticleCategory } from './types';

const CONTENT_DIR = path.join(process.cwd(), 'content', 'handbook');

function readMdxFile(filePath: string): { frontmatter: ArticleFrontmatter; content: string } | null {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const { data, content } = matter(raw);
    return {
      frontmatter: data as ArticleFrontmatter,
      content,
    };
  } catch {
    return null;
  }
}

export async function getAllArticles(): Promise<ArticleFrontmatter[]> {
  const articles: ArticleFrontmatter[] = [];

  const categories = fs.readdirSync(CONTENT_DIR).filter((entry) => {
    const fullPath = path.join(CONTENT_DIR, entry);
    return fs.statSync(fullPath).isDirectory() && entry !== '__pycache__';
  });

  for (const category of categories) {
    const categoryDir = path.join(CONTENT_DIR, category);
    const files = fs.readdirSync(categoryDir).filter((f) => f.endsWith('.mdx'));

    for (const file of files) {
      const result = readMdxFile(path.join(categoryDir, file));
      if (result) {
        articles.push(result.frontmatter);
      }
    }
  }

  return articles.sort((a, b) =>
    new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
  );
}

export async function getArticlesByCategory(
  category: ArticleCategory,
): Promise<ArticleFrontmatter[]> {
  const all = await getAllArticles();
  return all.filter((a) => a.category === category);
}

export async function getArticle(
  category: string,
  slug: string,
): Promise<{ frontmatter: ArticleFrontmatter; content: string } | null> {
  const filePath = path.join(CONTENT_DIR, category, `${slug}.mdx`);
  return readMdxFile(filePath);
}

export async function getAllArticleSlugs(): Promise<
  Array<{ category: string; slug: string }>
> {
  const slugs: Array<{ category: string; slug: string }> = [];

  const categories = fs.readdirSync(CONTENT_DIR).filter((entry) => {
    const fullPath = path.join(CONTENT_DIR, entry);
    return fs.statSync(fullPath).isDirectory();
  });

  for (const category of categories) {
    const categoryDir = path.join(CONTENT_DIR, category);
    const files = fs.readdirSync(categoryDir).filter((f) => f.endsWith('.mdx'));

    for (const file of files) {
      slugs.push({ category, slug: file.replace(/\.mdx$/, '') });
    }
  }

  return slugs;
}
