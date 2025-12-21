import { execa } from 'execa';
import ora from 'ora';
import { logger } from './logger.js';

export type PackageManager = 'pnpm' | 'npm' | 'yarn' | 'bun';

export async function detectPackageManager(): Promise<PackageManager> {
  // Check if pnpm is available
  try {
    await execa('pnpm', ['--version']);
    return 'pnpm';
  } catch {
    // Fall back to npm
    return 'npm';
  }
}

export async function installDependencies(
  projectDir: string,
  packageManager: PackageManager = 'pnpm'
): Promise<void> {
  const spinner = ora('Installing dependencies...').start();

  try {
    await execa(packageManager, ['install'], {
      cwd: projectDir,
      stdio: 'pipe',
    });

    spinner.succeed('Dependencies installed successfully');
  } catch (error) {
    spinner.fail('Failed to install dependencies');
    logger.error(
      `Please run '${packageManager} install' manually in the project directory`
    );
    throw error;
  }
}
