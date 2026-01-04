import cac from 'cac';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import type { PackageManager } from './utils/install.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(
  readFileSync(path.join(__dirname, '../package.json'), 'utf-8')
);

export type Framework = 'hono' | 'express' | 'lambda' | 'eventbridge';

export interface CliOptions {
  projectName?: string;
  framework?: Framework;
  packageManager?: PackageManager;
  skipInstall?: boolean;
}

export function parseCli(argv?: string[]): CliOptions {
  const cli = cac('create-tayori');

  cli
    .version(packageJson.version)
    .usage('[project-name] [options]')
    .option('--fw, --framework <framework>', 'Framework to use (hono, express, lambda, eventbridge)')
    .option('--pm, --package-manager <pm>', 'Package manager to use (pnpm, npm, yarn, bun)')
    .option('--skip-install', 'Skip installing dependencies')
    .help();

  const parsed = cli.parse(argv);

  const options: CliOptions = {};

  const projectNameArg = parsed.args[0];
  if (projectNameArg) {
    options.projectName = projectNameArg;
  }

  const framework = parsed.options['framework'] || parsed.options['fw'];
  if (framework) {
    options.framework = framework;
  }

  const packageManager = parsed.options['packageManager'] || parsed.options['pm'];
  if (packageManager) {
    options.packageManager = packageManager;
  }

  const skipInstall = parsed.options['skipInstall'];
  if (skipInstall !== undefined) {
    options.skipInstall = skipInstall;
  }

  return options;
}
