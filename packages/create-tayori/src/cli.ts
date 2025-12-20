import cac from 'cac';
import type { PackageManager } from './utils/install.js';

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
    .version('0.1.0')
    .usage('[project-name] [options]')
    .option('--fw, --framework <framework>', 'Framework to use (hono, express, lambda, eventbridge)')
    .option('--pm, --package-manager <pm>', 'Package manager to use (pnpm, npm, yarn, bun)')
    .option('--skip-install', 'Skip installing dependencies')
    .help();

  const parsed = cli.parse(argv);

  return {
    projectName: parsed.args[0],
    framework: parsed.options.framework || parsed.options.fw,
    packageManager: parsed.options.packageManager || parsed.options.pm,
    skipInstall: parsed.options.skipInstall,
  };
}
