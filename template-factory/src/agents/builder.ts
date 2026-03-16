/**
 * Builder Agent — Template Generation
 *
 * Takes a TemplateIdea from the Scout Agent and generates a complete,
 * production-ready starter template with all necessary files.
 */

import { ask, askJson } from "../utils/claude.js";
import { writeTemplateFile, zipTemplate, saveJson } from "../utils/files.js";
import { loadScoutReport, type TemplateIdea } from "./scout.js";
import chalk from "chalk";

interface FileSpec {
  path: string;
  description: string;
}

interface BuildManifest {
  templateSlug: string;
  files: string[];
  builtAt: string;
  zipPath: string;
}

const SYSTEM_PROMPT = `You are an expert full-stack developer who creates high-quality starter templates.

Your templates must be:
- Production-ready with clean, well-organized code
- Self-contained with clear setup instructions
- Following current best practices for the tech stack
- Including proper TypeScript types where applicable
- Including a comprehensive README with setup, customization, and deployment guides
- Including proper .gitignore, .env.example, and config files
- Designed to save developers 10+ hours of setup time

The template should feel premium and worth paying for. Include thoughtful defaults,
helpful comments, and a polished developer experience.`;

async function planFiles(idea: TemplateIdea): Promise<FileSpec[]> {
  console.log(chalk.yellow(`  📐 Planning file structure...`));

  const files = await askJson<FileSpec[]>(
    SYSTEM_PROMPT,
    `Plan the file structure for a starter template called "${idea.name}".

    Description: ${idea.description}
    Tech stack: ${idea.techStack.join(", ")}
    Target audience: ${idea.targetAudience}

    List ALL files needed as a JSON array of objects with "path" and "description" fields.
    Include: source code, config files, README.md, .env.example, .gitignore, package.json, etc.

    Aim for 12-25 files that create a complete, usable starter.
    Return ONLY the JSON array.`,
  );

  return files;
}

async function generateFile(
  idea: TemplateIdea,
  file: FileSpec,
  allFiles: FileSpec[],
): Promise<string> {
  const fileList = allFiles.map((f) => f.path).join("\n");

  const content = await ask(
    SYSTEM_PROMPT,
    `Generate the content for the file "${file.path}" in the "${idea.name}" template.

    Template description: ${idea.description}
    Tech stack: ${idea.techStack.join(", ")}
    File purpose: ${file.description}

    All files in the project:
    ${fileList}

    Generate ONLY the raw file content. No markdown fences, no explanation.
    Make it production-quality, well-commented where helpful, and consistent with the rest of the project.`,
  );

  return content;
}

export async function runBuilder(
  ideaIndex?: number,
): Promise<BuildManifest | null> {
  console.log(chalk.magenta("\n🔨 Builder Agent: Generating template...\n"));

  const report = await loadScoutReport();
  if (!report) {
    console.log(
      chalk.red("  ❌ No scout report found. Run 'scout' first.\n"),
    );
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

  console.log(chalk.magenta(`  Building: ${chalk.bold(idea.name)}`));
  console.log(chalk.magenta(`  Stack: ${idea.techStack.join(", ")}\n`));

  // Step 1: Plan the file structure
  const files = await planFiles(idea);
  console.log(chalk.yellow(`  📝 Planned ${files.length} files\n`));

  // Step 2: Generate each file (batched for speed)
  const BATCH_SIZE = 3;
  const generatedFiles: string[] = [];

  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map((file) => generateFile(idea, file, files)),
    );

    for (let j = 0; j < batch.length; j++) {
      const file = batch[j];
      await writeTemplateFile(idea.slug, file.path, results[j]);
      generatedFiles.push(file.path);
      console.log(chalk.gray(`    ✓ ${file.path}`));
    }
  }

  // Step 3: Zip it up
  console.log(chalk.yellow(`\n  📦 Creating zip archive...`));
  const zipPath = await zipTemplate(idea.slug);

  const manifest: BuildManifest = {
    templateSlug: idea.slug,
    files: generatedFiles,
    builtAt: new Date().toISOString(),
    zipPath,
  };

  await saveJson(`${idea.slug}/build-manifest.json`, manifest);

  console.log(
    chalk.magenta(`\n✅ Template built: ${generatedFiles.length} files → ${zipPath}\n`),
  );

  return manifest;
}
