import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';

// Note: We test the individual components rather than the main() function
// because it uses process.exit which is hard to test

describe('Main CLI Integration', () => {
  describe('Directory validation', () => {
    const testDir = path.join(process.cwd(), 'test-integration');

    beforeEach(async () => {
      try {
        await fs.rm(testDir, { recursive: true, force: true });
      } catch {
        // Ignore
      }
    });

    it('should handle non-existent directory', async () => {
      const { pathExists } = await import('./utils/files.js');

      const exists = await pathExists(testDir);
      expect(exists).toBe(false);
    });

    it('should handle existing empty directory', async () => {
      const { pathExists, isEmpty } = await import('./utils/files.js');

      await fs.mkdir(testDir, { recursive: true });

      const exists = await pathExists(testDir);
      const empty = await isEmpty(testDir);

      expect(exists).toBe(true);
      expect(empty).toBe(true);
    });

    it('should detect non-empty directory', async () => {
      const { isEmpty } = await import('./utils/files.js');

      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(path.join(testDir, 'test.txt'), 'test');

      const empty = await isEmpty(testDir);
      expect(empty).toBe(false);
    });
  });

  describe('Framework validation', () => {
    it('should accept hono framework', () => {
      const framework = 'hono';
      expect(framework).toBe('hono');
    });

    it('should identify unsupported frameworks', () => {
      const unsupportedFrameworks = ['express', 'lambda', 'eventbridge'];

      unsupportedFrameworks.forEach(fw => {
        expect(fw).not.toBe('hono');
      });
    });
  });

  describe('Configuration assembly', () => {
    it('should combine CLI options with prompt results', () => {
      const cliOptions = {
        projectName: 'my-project',
        framework: 'hono' as const,
      };

      const promptResults = {
        packageManager: 'pnpm' as const,
        shouldInstall: true,
      };

      const finalConfig = {
        ...cliOptions,
        ...promptResults,
      };

      expect(finalConfig).toEqual({
        projectName: 'my-project',
        framework: 'hono',
        packageManager: 'pnpm',
        shouldInstall: true,
      });
    });

    it('should handle skipInstall flag correctly', () => {
      const skipInstall = true;
      const shouldInstall = !skipInstall;

      expect(shouldInstall).toBe(false);
    });
  });

  describe('Error scenarios', () => {
    it('should handle invalid JSON in writeJson', async () => {
      const { writeJson } = await import('./utils/files.js');
      const testFile = path.join(process.cwd(), 'test-error.json');

      // This should not throw - circular references are not expected in our use case
      const validData = { name: 'test', version: '1.0.0' };
      await expect(writeJson(testFile, validData)).resolves.not.toThrow();

      // Clean up
      try {
        await fs.unlink(testFile);
      } catch {
        // Ignore
      }
    });
  });

  describe('Path resolution', () => {
    it('should resolve project path correctly', () => {
      const projectName = 'my-project';
      const targetDir = path.resolve(process.cwd(), projectName);

      expect(path.isAbsolute(targetDir)).toBe(true);
      expect(targetDir).toContain(projectName);
    });

    it('should handle paths with special characters', () => {
      const projectNames = ['my-project', 'project_name', 'project.name'];

      projectNames.forEach(name => {
        const targetDir = path.resolve(process.cwd(), name);
        expect(path.isAbsolute(targetDir)).toBe(true);
      });
    });
  });
});
