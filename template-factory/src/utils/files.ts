import fs from "fs-extra";
import path from "path";
import archiver from "archiver";
import { createWriteStream } from "fs";

const OUTPUT_DIR = process.env.OUTPUT_DIR || "./output";

export function getOutputDir(templateSlug: string): string {
  return path.join(OUTPUT_DIR, templateSlug);
}

export async function writeTemplateFile(
  templateSlug: string,
  filePath: string,
  content: string,
): Promise<void> {
  const fullPath = path.join(getOutputDir(templateSlug), filePath);
  await fs.ensureDir(path.dirname(fullPath));
  await fs.writeFile(fullPath, content, "utf-8");
}

export async function zipTemplate(templateSlug: string): Promise<string> {
  const dir = getOutputDir(templateSlug);
  const zipPath = path.join(OUTPUT_DIR, `${templateSlug}.zip`);
  await fs.ensureDir(OUTPUT_DIR);

  return new Promise((resolve, reject) => {
    const output = createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => resolve(zipPath));
    archive.on("error", reject);

    archive.pipe(output);
    archive.directory(dir, templateSlug);
    archive.finalize();
  });
}

export async function saveJson(
  filePath: string,
  data: unknown,
): Promise<void> {
  const fullPath = path.join(OUTPUT_DIR, filePath);
  await fs.ensureDir(path.dirname(fullPath));
  await fs.writeFile(fullPath, JSON.stringify(data, null, 2), "utf-8");
}

export async function loadJson<T>(filePath: string): Promise<T | null> {
  const fullPath = path.join(OUTPUT_DIR, filePath);
  if (await fs.pathExists(fullPath)) {
    const raw = await fs.readFile(fullPath, "utf-8");
    return JSON.parse(raw) as T;
  }
  return null;
}
