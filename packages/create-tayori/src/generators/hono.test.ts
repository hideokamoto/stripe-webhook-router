import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { generateHonoProject } from './hono.js';

// Mock dependencies
vi.mock('../utils/files.js', async () => {
  const actual = await vi.importActual('../utils/files.js');
  return {
    ...actual,
    copyTemplate: vi.fn(),
  };
});

vi.mock('../utils/install.js', () => ({
  installDependencies: vi.fn(),
}));

vi.mock('../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    title: vi.fn(),
  },
}));

// Mock picocolors
vi.mock('picocolors', () => ({
  default: {
    bold: (s: string) => s,
    dim: (s: string) => s,
    cyan: (s: string) => s,
  },
}));

describe('Hono Generator', () => {
  const testDir = path.join(process.cwd(), 'test-generator');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  });

  describe('generateHonoProject', () => {
    it('should call copyTemplate with correct arguments', async () => {
      const { copyTemplate } = await import('../utils/files.js');

      await generateHonoProject({
        projectName: 'test-project',
        targetDir: testDir,
        packageManager: 'pnpm',
        shouldInstall: false,
      });

      expect(copyTemplate).toHaveBeenCalledWith('hono', testDir, {
        PROJECT_NAME: 'test-project',
        PACKAGE_MANAGER: 'pnpm',
      });
    });

    it('should install dependencies when shouldInstall is true', async () => {
      const { installDependencies } = await import('../utils/install.js');

      await generateHonoProject({
        projectName: 'test-project',
        targetDir: testDir,
        packageManager: 'pnpm',
        shouldInstall: true,
      });

      expect(installDependencies).toHaveBeenCalledWith(testDir, 'pnpm');
    });

    it('should skip installation when shouldInstall is false', async () => {
      const { installDependencies } = await import('../utils/install.js');

      await generateHonoProject({
        projectName: 'test-project',
        targetDir: testDir,
        packageManager: 'pnpm',
        shouldInstall: false,
      });

      expect(installDependencies).not.toHaveBeenCalled();
    });

    it('should log appropriate messages', async () => {
      const { logger } = await import('../utils/logger.js');

      await generateHonoProject({
        projectName: 'test-project',
        targetDir: testDir,
        packageManager: 'pnpm',
        shouldInstall: false,
      });

      expect(logger.title).toHaveBeenCalledWith('Creating Tayori + Hono project...');
      expect(logger.info).toHaveBeenCalledWith('Copying template files...');
      expect(logger.success).toHaveBeenCalledWith('Template files created');
      expect(logger.warn).toHaveBeenCalledWith('Skipped dependency installation');
      expect(logger.success).toHaveBeenCalledWith('Project created successfully! 🎉');
    });

    it('should support all package managers', async () => {
      const { installDependencies } = await import('../utils/install.js');

      const packageManagers: Array<'pnpm' | 'npm' | 'yarn' | 'bun'> = [
        'pnpm',
        'npm',
        'yarn',
        'bun',
      ];

      for (const pm of packageManagers) {
        vi.clearAllMocks();

        await generateHonoProject({
          projectName: 'test-project',
          targetDir: testDir,
          packageManager: pm,
          shouldInstall: true,
        });

        expect(installDependencies).toHaveBeenCalledWith(testDir, pm);
      }
    });

    it('should handle different project names correctly', async () => {
      const { copyTemplate } = await import('../utils/files.js');

      const projectNames = [
        'my-webhook',
        'stripe-handler',
        'payment-processor',
      ];

      for (const name of projectNames) {
        vi.clearAllMocks();

        await generateHonoProject({
          projectName: name,
          targetDir: testDir,
          packageManager: 'pnpm',
          shouldInstall: false,
        });

        expect(copyTemplate).toHaveBeenCalledWith('hono', testDir, {
          PROJECT_NAME: name,
          PACKAGE_MANAGER: 'pnpm',
        });
      }
    });
  });

  describe('Console output', () => {
    let consoleLogSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
    });

    it('should print next steps', async () => {
      await generateHonoProject({
        projectName: 'test-project',
        targetDir: testDir,
        packageManager: 'pnpm',
        shouldInstall: false,
      });

      const output = consoleLogSpy.mock.calls.map(c => c.join(' ')).join('\n');

      expect(output).toContain('Next steps:');
      expect(output).toContain('pnpm install');
      expect(output).toContain('cp .env.example .env');
      expect(output).toContain('pnpm dev');
      expect(output).toContain('stripe listen');
    });

    it('should not show install step when dependencies are installed', async () => {
      await generateHonoProject({
        projectName: 'test-project',
        targetDir: testDir,
        packageManager: 'pnpm',
        shouldInstall: true,
      });

      const output = consoleLogSpy.mock.calls.map(c => c.join(' ')).join('\n');

      // Should not show "Install dependencies" step
      expect(output).not.toContain('pnpm install');
    });

    it('should use correct package manager in instructions', async () => {
      await generateHonoProject({
        projectName: 'test-project',
        targetDir: testDir,
        packageManager: 'yarn',
        shouldInstall: false,
      });

      const output = consoleLogSpy.mock.calls.map(c => c.join(' ')).join('\n');

      expect(output).toContain('yarn install');
      expect(output).toContain('yarn dev');
    });
  });
});
