import prompts from 'prompts';
import type { Framework } from './cli.js';
import type { PackageManager } from './utils/install.js';

export interface ProjectConfig {
  projectName: string;
  framework: Framework;
  packageManager: PackageManager;
  shouldInstall: boolean;
}

export async function promptForConfig(
  initialConfig: Partial<ProjectConfig>
): Promise<ProjectConfig> {
  const questions: prompts.PromptObject[] = [];

  if (!initialConfig.projectName) {
    questions.push({
      type: 'text',
      name: 'projectName',
      message: 'Project name:',
      initial: 'my-webhook-handler',
      validate: (value: string) =>
        value.length > 0 ? true : 'Project name is required',
    });
  }

  if (!initialConfig.framework) {
    questions.push({
      type: 'select',
      name: 'framework',
      message: 'Select framework:',
      choices: [
        { title: 'Hono', value: 'hono' },
        { title: 'Express', value: 'express' },
        { title: 'AWS Lambda', value: 'lambda' },
        { title: 'AWS EventBridge', value: 'eventbridge' },
      ],
      initial: 0,
    });
  }

  if (!initialConfig.packageManager) {
    questions.push({
      type: 'select',
      name: 'packageManager',
      message: 'Select package manager:',
      choices: [
        { title: 'pnpm', value: 'pnpm' },
        { title: 'npm', value: 'npm' },
        { title: 'yarn', value: 'yarn' },
        { title: 'bun', value: 'bun' },
      ],
      initial: 0,
    });
  }

  if (initialConfig.shouldInstall === undefined) {
    questions.push({
      type: 'confirm',
      name: 'shouldInstall',
      message: 'Install dependencies?',
      initial: true,
    });
  }

  const answers = await prompts(questions, {
    onCancel: () => {
      console.log('\nCancelled.');
      process.exit(0);
    },
  });

  return {
    projectName: initialConfig.projectName || answers['projectName'],
    framework: initialConfig.framework || answers['framework'],
    packageManager: initialConfig.packageManager || answers['packageManager'],
    shouldInstall:
      initialConfig.shouldInstall !== undefined
        ? initialConfig.shouldInstall
        : answers['shouldInstall'],
  };
}
