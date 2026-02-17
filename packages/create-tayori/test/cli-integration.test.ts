import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { parseCli } from '../src/cli.js';

describe('create-tayori CLI Integration Tests', () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create a temporary directory for test projects
    tempDir = path.join(os.tmpdir(), `tayori-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('CLI Option Parsing', () => {
    it('should parse project name correctly', () => {
      const options = parseCli(['node', 'create-tayori', 'my-project']);
      expect(options.projectName).toBe('my-project');
    });

    it('should parse framework option with --fw flag', () => {
      const options = parseCli(['node', 'create-tayori', '--fw', 'express']);
      expect(options.framework).toBe('express');
    });

    it('should parse framework option with --framework flag', () => {
      const options = parseCli(['node', 'create-tayori', '--framework', 'hono']);
      expect(options.framework).toBe('hono');
    });

    it('should parse package manager option with --pm flag', () => {
      const options = parseCli(['node', 'create-tayori', '--pm', 'pnpm']);
      expect(options.packageManager).toBe('pnpm');
    });

    it('should parse skip-install flag', () => {
      const options = parseCli(['node', 'create-tayori', '--skip-install']);
      expect(options.skipInstall).toBe(true);
    });

    it('should parse all options together', () => {
      const options = parseCli([
        'node',
        'create-tayori',
        'webhook-handler',
        '--framework',
        'lambda',
        '--package-manager',
        'npm',
        '--skip-install',
      ]);

      expect(options.projectName).toBe('webhook-handler');
      expect(options.framework).toBe('lambda');
      expect(options.packageManager).toBe('npm');
      expect(options.skipInstall).toBe(true);
    });

    it('should handle options in different orders', () => {
      const options = parseCli([
        'node',
        'create-tayori',
        '--skip-install',
        '--fw',
        'hono',
        'test-app',
        '--pm',
        'yarn',
      ]);

      expect(options.projectName).toBe('test-app');
      expect(options.framework).toBe('hono');
      expect(options.packageManager).toBe('yarn');
      expect(options.skipInstall).toBe(true);
    });

    it('should return empty options when no arguments provided', () => {
      const options = parseCli(['node', 'create-tayori']);
      expect(options.projectName).toBeUndefined();
      expect(options.framework).toBeUndefined();
      expect(options.packageManager).toBeUndefined();
      expect(options.skipInstall).toBeUndefined();
    });

    it('should support all framework types', () => {
      const frameworks = ['hono', 'express', 'lambda', 'eventbridge'];

      frameworks.forEach((fw) => {
        const options = parseCli(['node', 'create-tayori', '--framework', fw]);
        expect(options.framework).toBe(fw);
      });
    });

    it('should support all package manager types', () => {
      const managers = ['pnpm', 'npm', 'yarn', 'bun'];

      managers.forEach((pm) => {
        const options = parseCli(['node', 'create-tayori', '--pm', pm]);
        expect(options.packageManager).toBe(pm);
      });
    });
  });

  describe('Project Scaffolding Basics', () => {
    it('should handle project names with hyphens', () => {
      const options = parseCli(['node', 'create-tayori', 'my-awesome-project']);
      expect(options.projectName).toBe('my-awesome-project');
    });

    it('should handle project names with underscores', () => {
      const options = parseCli(['node', 'create-tayori', 'my_project']);
      expect(options.projectName).toBe('my_project');
    });

    it('should handle complex project names with mixed chars', () => {
      const options = parseCli(['node', 'create-tayori', 'my-project_123']);
      expect(options.projectName).toBe('my-project_123');
    });

    it('should handle relative paths', () => {
      const options = parseCli(['node', 'create-tayori', './projects/my-app']);
      expect(options.projectName).toBe('./projects/my-app');
    });

    it('should not require project name', () => {
      const options = parseCli(['node', 'create-tayori', '--framework', 'express']);
      expect(options.projectName).toBeUndefined();
      expect(options.framework).toBe('express');
    });
  });

  describe('Framework Selection', () => {
    it('should accept Hono framework', () => {
      const options = parseCli(['node', 'create-tayori', '--fw', 'hono']);
      expect(options.framework).toBe('hono');
    });

    it('should accept Express framework', () => {
      const options = parseCli(['node', 'create-tayori', '--fw', 'express']);
      expect(options.framework).toBe('express');
    });

    it('should accept Lambda framework', () => {
      const options = parseCli(['node', 'create-tayori', '--fw', 'lambda']);
      expect(options.framework).toBe('lambda');
    });

    it('should accept EventBridge framework', () => {
      const options = parseCli(['node', 'create-tayori', '--fw', 'eventbridge']);
      expect(options.framework).toBe('eventbridge');
    });
  });

  describe('Package Manager Selection', () => {
    it('should accept pnpm', () => {
      const options = parseCli(['node', 'create-tayori', '--pm', 'pnpm']);
      expect(options.packageManager).toBe('pnpm');
    });

    it('should accept npm', () => {
      const options = parseCli(['node', 'create-tayori', '--pm', 'npm']);
      expect(options.packageManager).toBe('npm');
    });

    it('should accept yarn', () => {
      const options = parseCli(['node', 'create-tayori', '--pm', 'yarn']);
      expect(options.packageManager).toBe('yarn');
    });

    it('should accept bun', () => {
      const options = parseCli(['node', 'create-tayori', '--pm', 'bun']);
      expect(options.packageManager).toBe('bun');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty project name string', () => {
      const options = parseCli(['node', 'create-tayori', '']);
      // Empty string is treated as no argument by the CLI parser
      expect(options.projectName).toBeUndefined();
    });

    it('should handle flags without values', () => {
      const options = parseCli(['node', 'create-tayori', '--skip-install']);
      expect(options.skipInstall).toBe(true);
      expect(options.projectName).toBeUndefined();
    });

    it('should handle multiple flags', () => {
      const options = parseCli([
        'node',
        'create-tayori',
        'app',
        '--skip-install',
        '--framework',
        'lambda',
      ]);
      expect(options.projectName).toBe('app');
      expect(options.skipInstall).toBe(true);
      expect(options.framework).toBe('lambda');
    });

    it('should prioritize --fw over --framework when both provided', () => {
      const options = parseCli([
        'node',
        'create-tayori',
        '--fw',
        'hono',
        '--framework',
        'express',
      ]);
      // cac aliases: --fw takes precedence when defined first in the option string
      expect(options.framework).toBe('hono');
    });

    it('should handle whitespace in arguments', () => {
      const options = parseCli(['node', 'create-tayori', '  project  ']);
      expect(options.projectName).toBe('  project  ');
    });

    it('should handle numeric project names', () => {
      const options = parseCli(['node', 'create-tayori', '123-project']);
      expect(options.projectName).toBe('123-project');
    });

    it('should handle project names with dots', () => {
      const options = parseCli(['node', 'create-tayori', 'my.project.app']);
      expect(options.projectName).toBe('my.project.app');
    });
  });
});
