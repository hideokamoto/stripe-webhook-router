import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Find the package root (where templates/ directory is located)
function getPackageRoot(): string {
  // When bundled, __dirname is dist/
  // When in development, __dirname is src/utils/
  // We need to find the directory that contains templates/
  let current = __dirname;

  // Go up until we find package.json or reach root
  while (current !== path.dirname(current)) {
    // Check if templates directory exists here
    const templatesPath = path.join(current, 'templates');
    if (existsSync(templatesPath)) {
      return current;
    }
    current = path.dirname(current);
  }

  // Fallback: assume we're in dist/ directory
  return path.dirname(__dirname);
}

export async function copyTemplate(
  templateName: string,
  targetDir: string,
  replacements: Record<string, string> = {}
): Promise<void> {
  const packageRoot = getPackageRoot();
  const templateDir = path.join(packageRoot, 'templates', templateName);

  await copyDir(templateDir, targetDir, replacements);
}

async function copyDir(
  src: string,
  dest: string,
  replacements: Record<string, string>
): Promise<void> {
  await fs.mkdir(dest, { recursive: true });

  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath, replacements);
    } else {
      let content = await fs.readFile(srcPath, 'utf-8');

      // Replace template variables
      for (const [key, value] of Object.entries(replacements)) {
        content = content.replaceAll(`{{${key}}}`, value);
      }

      await fs.writeFile(destPath, content);
    }
  }
}

export async function writeJson(
  filePath: string,
  data: Record<string, any>
): Promise<void> {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2) + '\n');
}

export async function pathExists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

export async function isEmpty(dir: string): Promise<boolean> {
  try {
    const files = await fs.readdir(dir);
    return files.length === 0;
  } catch {
    return true;
  }
}
