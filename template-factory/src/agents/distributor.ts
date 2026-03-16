/**
 * Distributor Agent — Marketplace Listing Preparation
 *
 * Takes a built template and generates everything needed to list it
 * on marketplaces: product descriptions, feature lists, SEO keywords,
 * pricing strategy, and social media launch posts.
 */

import { askJson } from "../utils/claude.js";
import { loadScoutReport, type TemplateIdea } from "./scout.js";
import { loadJson, saveJson } from "../utils/files.js";
import chalk from "chalk";

interface ListingContent {
  productTitle: string;
  tagline: string;
  description: string;
  features: string[];
  faq: Array<{ question: string; answer: string }>;
  seoKeywords: string[];
  pricingStrategy: {
    launchPrice: number;
    regularPrice: number;
    reasoning: string;
  };
  gumroadListing: {
    title: string;
    description: string;
    tags: string[];
  };
  socialPosts: {
    twitter: string;
    reddit: string;
    hackernews: string;
  };
  emailTemplate: string;
}

interface DistributionPlan {
  templateSlug: string;
  listing: ListingContent;
  createdAt: string;
}

const SYSTEM_PROMPT = `You are a digital product marketing expert who specializes in developer tools and templates.

You create compelling marketplace listings that convert browsers into buyers.

Your copy should:
- Lead with the pain point the template solves
- Emphasize time saved and value delivered
- Use specific, concrete benefits (not vague claims)
- Include social proof hooks (even if hypothetical for launch)
- Be optimized for search/discovery on marketplaces
- Sound professional but approachable

Price anchoring: Frame the price against the hours of dev time saved.
Example: "Save 20+ hours of setup. That's $2,000+ of dev time for just $29."`;

export async function runDistributor(
  ideaIndex?: number,
): Promise<DistributionPlan | null> {
  console.log(chalk.green("\n📢 Distributor Agent: Preparing marketplace listings...\n"));

  const report = await loadScoutReport();
  if (!report) {
    console.log(chalk.red("  ❌ No scout report found. Run 'scout' first.\n"));
    return null;
  }

  const idx = ideaIndex ?? 0;
  const idea = report.ideas[idx];
  if (!idea) {
    console.log(
      chalk.red(`  ❌ No idea at index ${idx}. Report has ${report.ideas.length} ideas.\n`),
    );
    return null;
  }

  // Check if template was built
  const manifest = await loadJson<{ files: string[] }>(
    `${idea.slug}/build-manifest.json`,
  );

  console.log(chalk.green(`  Preparing listing for: ${chalk.bold(idea.name)}`));
  console.log(
    chalk.green(`  Target price: $${idea.estimatedPrice} | Marketplaces: ${idea.marketplaces.join(", ")}\n`),
  );

  const listing = await askJson<ListingContent>(
    SYSTEM_PROMPT,
    `Create a complete marketplace listing for this developer template:

    Name: ${idea.name}
    Description: ${idea.description}
    Tech Stack: ${idea.techStack.join(", ")}
    Target Audience: ${idea.targetAudience}
    Suggested Price: $${idea.estimatedPrice}
    Target Marketplaces: ${idea.marketplaces.join(", ")}
    ${manifest ? `Files included: ${manifest.files.length} files` : "Template not yet built"}
    Demand Signals: ${idea.demandSignals.join("; ")}

    Generate a JSON object with:
    - productTitle: catchy product name
    - tagline: one-line hook (under 80 chars)
    - description: 2-3 paragraph product description (markdown)
    - features: array of 6-8 bullet point features
    - faq: array of 4 {question, answer} objects
    - seoKeywords: array of 10-15 search keywords
    - pricingStrategy: { launchPrice, regularPrice, reasoning }
    - gumroadListing: { title, description (markdown), tags }
    - socialPosts: { twitter (under 280 chars), reddit (title + body), hackernews (title only) }
    - emailTemplate: a launch announcement email (markdown)`,
  );

  const plan: DistributionPlan = {
    templateSlug: idea.slug,
    listing,
    createdAt: new Date().toISOString(),
  };

  await saveJson(`${idea.slug}/distribution-plan.json`, plan);

  // Print summary
  console.log(chalk.bold(`\n  📋 "${listing.productTitle}"`));
  console.log(`  ${listing.tagline}\n`);
  console.log(chalk.underline("  Features:"));
  for (const f of listing.features) {
    console.log(`    • ${f}`);
  }
  console.log(
    `\n  💰 Launch: $${listing.pricingStrategy.launchPrice} → Regular: $${listing.pricingStrategy.regularPrice}`,
  );
  console.log(`  ${listing.pricingStrategy.reasoning}\n`);

  console.log(chalk.underline("  SEO Keywords:"));
  console.log(`    ${listing.seoKeywords.join(", ")}\n`);

  console.log(chalk.underline("  Twitter Launch Post:"));
  console.log(`    ${listing.socialPosts.twitter}\n`);

  console.log(
    chalk.green(`✅ Distribution plan saved to output/${idea.slug}/distribution-plan.json\n`),
  );

  return plan;
}
