#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import pc from 'picocolors';
import { parseCli } from './cli.js';
import { promptForConfig, type ProjectConfig } from './prompts.js';
import { generateHonoProject } from './generators/hono.js';
import { generateExpressProject } from './generators/express.js';
import { generateLambdaProject } from './generators/lambda.js';
import { generateEventBridgeProject } from './generators/eventbridge.js';
import { logger } from './utils/logger.js';
import { pathExists, isEmpty } from './utils/files.js';

async function main() {
  console.log();
  console.log(pc.bold(pc.cyan('create-tayori')));
  console.log(pc.dim('Scaffolding tool for Tayori webhook handlers'));
  console.log();

  try {
    // Parse CLI arguments
    const cliOptions = parseCli();

    // Get full configuration (prompting for missing values)
    const configInput: Partial<ProjectConfig> = {};
    if (cliOptions.projectName) configInput.projectName = cliOptions.projectName;
    if (cliOptions.framework) configInput.framework = cliOptions.framework;
    if (cliOptions.packageManager) configInput.packageManager = cliOptions.packageManager;
    if (cliOptions.skipInstall !== undefined) configInput.shouldInstall = !cliOptions.skipInstall;

    const config = await promptForConfig(configInput);

    // Determine target directory
    const targetDir = path.resolve(process.cwd(), config.projectName);

    // Check if directory exists and is not empty
    if (await pathExists(targetDir)) {
      const empty = await isEmpty(targetDir);
      if (!empty) {
        logger.error(
          `Directory "${config.projectName}" already exists and is not empty.`
        );
        process.exit(1);
      }
    } else {
      // Create directory if it doesn't exist
      await fs.mkdir(targetDir, { recursive: true });
    }

    // Generate project based on framework
    switch (config.framework) {
      case 'hono':
        await generateHonoProject({
          projectName: config.projectName,
          targetDir,
          packageManager: config.packageManager,
          shouldInstall: config.shouldInstall,
        });
        break;
      case 'express':
        await generateExpressProject({
          projectName: config.projectName,
          targetDir,
          packageManager: config.packageManager,
          shouldInstall: config.shouldInstall,
        });
        break;
      case 'lambda':
        await generateLambdaProject({
          projectName: config.projectName,
          targetDir,
          packageManager: config.packageManager,
          shouldInstall: config.shouldInstall,
        });
        break;
      case 'eventbridge':
        await generateEventBridgeProject({
          projectName: config.projectName,
          targetDir,
          packageManager: config.packageManager,
          shouldInstall: config.shouldInstall,
        });
        break;
      default:
        logger.error(
          `Framework "${config.framework}" is not supported.`
        );
        process.exit(1);
    }
  } catch (error) {
    console.log();
    logger.error(
      error instanceof Error ? error.message : 'An unexpected error occurred'
    );
    process.exit(1);
  }
}

main();
