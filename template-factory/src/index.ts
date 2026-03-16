#!/usr/bin/env node

/**
 * Template Factory — Multi-Agent Pipeline
 *
 * Three-agent system for discovering, building, and distributing
 * developer starter templates to generate residual income.
 *
 * Usage:
 *   npm run scout                    # Find trending template opportunities
 *   npm run build-template           # Generate template from scout report
 *   npm run distribute               # Create marketplace listings
 *   npm run pipeline                 # Run all three agents end-to-end
 *
 *   npm start -- scout --focus "AI"  # Scout with a focus area
 *   npm start -- build --index 2     # Build the 3rd idea from scout report
 *   npm start -- pipeline --focus "Next.js SaaS"
 */

import { program } from "commander";
import chalk from "chalk";
import { runScout } from "./agents/scout.js";
import { runBuilder } from "./agents/builder.js";
import { runDistributor } from "./agents/distributor.js";

const banner = `
${chalk.bold.cyan("╔══════════════════════════════════════════╗")}
${chalk.bold.cyan("║")}  ${chalk.bold("🏭 Template Factory")}                     ${chalk.bold.cyan("║")}
${chalk.bold.cyan("║")}  ${chalk.gray("Multi-Agent Income Generator")}             ${chalk.bold.cyan("║")}
${chalk.bold.cyan("╚══════════════════════════════════════════╝")}
`;

program
  .name("template-factory")
  .description("Multi-agent system for generating and selling starter templates")
  .version("1.0.0");

program
  .command("scout")
  .description("Scout trending template opportunities")
  .option("-f, --focus <area>", "Focus on a specific area (e.g., 'AI tools', 'SaaS')")
  .action(async (opts) => {
    console.log(banner);
    await runScout(opts.focus);
  });

program
  .command("build")
  .description("Build a template from the scout report")
  .option("-i, --index <number>", "Index of the idea to build (default: 0)", "0")
  .action(async (opts) => {
    console.log(banner);
    await runBuilder(parseInt(opts.index));
  });

program
  .command("distribute")
  .description("Generate marketplace listings for a built template")
  .option("-i, --index <number>", "Index of the idea to distribute (default: 0)", "0")
  .action(async (opts) => {
    console.log(banner);
    await runDistributor(parseInt(opts.index));
  });

program
  .command("pipeline")
  .description("Run the full pipeline: scout → build → distribute")
  .option("-f, --focus <area>", "Focus on a specific area")
  .option("-i, --index <number>", "Which idea to build after scouting (default: 0)", "0")
  .action(async (opts) => {
    console.log(banner);
    const idx = parseInt(opts.index);

    console.log(chalk.bold("\n━━━ PHASE 1/3: SCOUTING ━━━"));
    const report = await runScout(opts.focus);

    if (!report.ideas.length) {
      console.log(chalk.red("No ideas found. Aborting pipeline."));
      return;
    }

    console.log(chalk.bold("\n━━━ PHASE 2/3: BUILDING ━━━"));
    const manifest = await runBuilder(idx);

    if (!manifest) {
      console.log(chalk.red("Build failed. Aborting pipeline."));
      return;
    }

    console.log(chalk.bold("\n━━━ PHASE 3/3: DISTRIBUTING ━━━"));
    await runDistributor(idx);

    // Final summary
    const idea = report.ideas[idx];
    console.log(chalk.bold.cyan("\n╔══════════════════════════════════════════╗"));
    console.log(chalk.bold.cyan("║  ✅ PIPELINE COMPLETE                     ║"));
    console.log(chalk.bold.cyan("╚══════════════════════════════════════════╝\n"));
    console.log(`  Template: ${chalk.bold(idea.name)}`);
    console.log(`  Files:    ${manifest.files.length}`);
    console.log(`  Zip:      ${manifest.zipPath}`);
    console.log(`  Price:    $${idea.estimatedPrice}`);
    console.log(`  Sell on:  ${idea.marketplaces.join(", ")}`);
    console.log(
      `\n  ${chalk.gray("Next steps:")}`,
    );
    console.log(`  1. Review the generated template in output/${idea.slug}/`);
    console.log(`  2. Test it locally and polish any rough edges`);
    console.log(`  3. Upload ${idea.slug}.zip to ${idea.marketplaces[0]}`);
    console.log(`  4. Post the social media content from distribution-plan.json`);
    console.log(`  5. Repeat for the next template idea!\n`);
  });

program.parse();
