import path from 'node:path';
import pc from 'picocolors';
import { copyTemplate } from '../utils/files.js';
import { installDependencies, type PackageManager } from '../utils/install.js';
import { logger } from '../utils/logger.js';

export interface HonoGeneratorOptions {
  projectName: string;
  targetDir: string;
  packageManager: PackageManager;
  shouldInstall: boolean;
}

export async function generateHonoProject(
  options: HonoGeneratorOptions
): Promise<void> {
  const { projectName, targetDir, packageManager, shouldInstall } = options;

  logger.title('Creating Tayori + Hono project...');

  // Copy template files
  logger.info('Copying template files...');
  await copyTemplate('hono', targetDir, {
    PROJECT_NAME: projectName,
  });

  logger.success('Template files created');

  // Install dependencies
  if (shouldInstall) {
    await installDependencies(targetDir, packageManager);
  } else {
    logger.warn('Skipped dependency installation');
  }

  // Print success message
  console.log();
  logger.success('Project created successfully! 🎉');
  console.log();

  // Print next steps
  const cdCommand =
    targetDir !== process.cwd()
      ? `  cd ${path.relative(process.cwd(), targetDir)}\n`
      : '';

  console.log(pc.bold('Next steps:'));
  console.log();
  console.log(pc.dim('  1. Navigate to your project:'));
  if (cdCommand) {
    console.log(pc.cyan(cdCommand));
  }

  if (!shouldInstall) {
    console.log(pc.dim('  2. Install dependencies:'));
    console.log(pc.cyan(`  ${packageManager} install\n`));
  }

  console.log(pc.dim(`  ${shouldInstall ? '2' : '3'}. Set up environment variables:`));
  console.log(pc.cyan('  cp .env.example .env'));
  console.log(pc.dim('     Then edit .env with your Stripe API keys\n'));

  console.log(pc.dim(`  ${shouldInstall ? '3' : '4'}. Start the development server:`));
  console.log(pc.cyan(`  ${packageManager} dev\n`));

  console.log(pc.dim('  4. Test webhooks with Stripe CLI:'));
  console.log(pc.cyan('  stripe listen --forward-to localhost:3000/webhook'));
  console.log(pc.cyan('  stripe trigger payment_intent.succeeded\n'));

  console.log(pc.dim('📚 Documentation:'));
  console.log(pc.cyan('  https://github.com/hideokamoto/stripe-webhook-router'));
  console.log();
}
