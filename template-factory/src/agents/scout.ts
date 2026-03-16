/**
 * Scout Agent — Trend Detection & Niche Analysis
 *
 * Analyzes the current developer landscape to identify high-demand,
 * low-competition template opportunities. Outputs a ranked list of
 * template ideas with market analysis.
 */

import { askJson } from "../utils/claude.js";
import { saveJson, loadJson } from "../utils/files.js";
import chalk from "chalk";

export interface TemplateIdea {
  name: string;
  slug: string;
  description: string;
  techStack: string[];
  targetAudience: string;
  demandSignals: string[];
  competitionLevel: "low" | "medium" | "high";
  estimatedPrice: number;
  marketplaces: string[];
  monetizationNotes: string;
}

export interface ScoutReport {
  generatedAt: string;
  ideas: TemplateIdea[];
}

const SYSTEM_PROMPT = `You are a market research agent specializing in developer tools and digital products.

Your job is to identify profitable starter template / boilerplate opportunities that can be sold on marketplaces like Gumroad, Lemonsqueezy, or the Notion/Figma marketplaces.

Focus on:
- Trending frameworks and tools developers are adopting NOW
- Pain points where developers waste hours on setup/config
- Niches with demand but few quality templates available
- Templates that solve real problems (SaaS starters, landing pages, dashboards, API boilerplates)
- Price points between $9-49 for maximum volume

Avoid:
- Oversaturated markets (e.g., basic React todo apps)
- Templates requiring ongoing maintenance/support
- Anything needing proprietary APIs or paid services to function`;

export async function runScout(
  focusArea?: string,
): Promise<ScoutReport> {
  console.log(chalk.cyan("\n🔍 Scout Agent: Analyzing market trends...\n"));

  const userPrompt = focusArea
    ? `Identify 5 profitable starter template ideas focused on: "${focusArea}".

       For each idea, provide: name, slug (kebab-case), description (2-3 sentences),
       techStack (array), targetAudience, demandSignals (array of reasons this will sell),
       competitionLevel (low/medium/high), estimatedPrice (USD),
       marketplaces (where to sell), and monetizationNotes.

       Return as JSON: { "ideas": [...] }`
    : `Identify 5 profitable starter template ideas across different niches.

       Mix these categories:
       1. A Next.js/React SaaS starter
       2. A backend/API boilerplate
       3. A landing page or marketing template
       4. A developer tool or CLI template
       5. A niche-specific template (e-commerce, AI, etc.)

       For each idea, provide: name, slug (kebab-case), description (2-3 sentences),
       techStack (array), targetAudience, demandSignals (array of reasons this will sell),
       competitionLevel (low/medium/high), estimatedPrice (USD),
       marketplaces (where to sell), and monetizationNotes.

       Return as JSON: { "ideas": [...] }`;

  const result = await askJson<{ ideas: TemplateIdea[] }>(
    SYSTEM_PROMPT,
    userPrompt,
  );

  const report: ScoutReport = {
    generatedAt: new Date().toISOString(),
    ideas: result.ideas,
  };

  // Save report for downstream agents
  await saveJson("scout-report.json", report);

  // Print summary
  for (const idea of report.ideas) {
    const color =
      idea.competitionLevel === "low"
        ? chalk.green
        : idea.competitionLevel === "medium"
          ? chalk.yellow
          : chalk.red;

    console.log(
      `  ${chalk.bold(idea.name)} — $${idea.estimatedPrice}`,
    );
    console.log(
      `    ${idea.description}`,
    );
    console.log(
      `    Stack: ${idea.techStack.join(", ")} | Competition: ${color(idea.competitionLevel)}`,
    );
    console.log(
      `    Sell on: ${idea.marketplaces.join(", ")}`,
    );
    console.log();
  }

  console.log(
    chalk.cyan(`✅ Scout report saved with ${report.ideas.length} ideas\n`),
  );
  return report;
}

export async function loadScoutReport(): Promise<ScoutReport | null> {
  return loadJson<ScoutReport>("scout-report.json");
}
