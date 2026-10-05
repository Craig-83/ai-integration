/**
 * Single source of truth for Insights (blog) content.
 *
 * Each post lives in content/insights/<slug>.json (metadata + article HTML).
 * The shared article stylesheet is app/(site)/(dark-nav)/insights/[slug]/post.css.
 *
 * Adding a post: drop a new JSON file in content/insights/, import it below,
 * and add it to the array. The [slug] route, the /insights index, and
 * sitemap.xml all derive from this list - nothing else to update.
 */

import { withExternalLinkTargets } from "@/lib/external-links";
import blog01 from "@/content/insights/blog-01-why-ai-fails.json";
import blog02 from "@/content/insights/blog-02-ai-costs-returns.json";
import blog03 from "@/content/insights/blog-03-change-management.json";
import blog04 from "@/content/insights/blog-04-ai-accounting-firms.json";
import blog05 from "@/content/insights/blog-05-what-is-ai-agent.json";
import blog06 from "@/content/insights/blog-06-behind-support-build.json";
import blog21 from "@/content/insights/blog-21-ai-ndis.json";
import blog28 from "@/content/insights/blog-28-ai-aged-care.json";
import blog25 from "@/content/insights/blog-25-ai-manufacturing.json";
import blog29 from "@/content/insights/blog-29-ai-agriculture.json";
import blog15 from "@/content/insights/blog-15-ai-law-firms.json";
import blog13 from "@/content/insights/blog-13-ai-financial-advisers.json";
import blog34 from "@/content/insights/blog-34-ai-healthcare.json";
import blog26 from "@/content/insights/blog-26-ai-property-management.json";
import blog19 from "@/content/insights/blog-19-ai-hospitality.json";
import blog27 from "@/content/insights/blog-27-ai-insurance.json";
import blog30 from "@/content/insights/blog-30-ai-transport-logistics.json";
import blog24 from "@/content/insights/blog-24-ai-retail.json";

export interface InsightPost {
  slug: string;
  num: number;
  /** Full SEO title, as used in the <title> tag. */
  title: string;
  description: string;
  category: string;
  readTime: string;
  /** ISO date (YYYY-MM-DD) the article was first published. */
  datePublished: string;
  /** ISO date (YYYY-MM-DD) of the last substantive edit. */
  dateModified: string;
  /** Pre-rendered article body HTML. */
  html: string;
}

export const posts: InsightPost[] = (
  [blog01, blog02, blog03, blog04, blog05, blog06, blog21, blog28, blog25, blog29, blog15, blog13, blog34, blog26, blog19, blog27, blog30, blog24] as InsightPost[]
)
  // External links in post bodies open in a new tab (see lib/external-links).
  .map((p) => ({ ...p, html: withExternalLinkTargets(p.html) }))
  .sort((a, b) => a.num - b.num);

export function postBySlug(slug: string): InsightPost | undefined {
  return posts.find((p) => p.slug === slug);
}

/**
 * Human-facing title for cards and headings: strips the "| Creative Milk"
 * / "| Creative Milk Insights" SEO suffix and any "Blog Article NN:"
 * working prefix.
 */
export function displayTitle(post: InsightPost): string {
  return post.title
    .replace(/\s*\|\s*Creative Milk( Insights)?\s*$/i, "")
    .replace(/^Blog Article \d+:\s*/i, "")
    .trim();
}
