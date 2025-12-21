import { describe, it, expect } from 'vitest';
import { parseCli } from './cli.js';

describe('CLI Parser', () => {
  describe('Project Name', () => {
    it('should parse project name from first argument', () => {
      const options = parseCli(['node', 'create-tayori', 'my-project']);
      expect(options.projectName).toBe('my-project');
    });

    it('should return undefined when no project name is provided', () => {
      const options = parseCli(['node', 'create-tayori']);
      expect(options.projectName).toBeUndefined();
    });
  });

  describe('Framework Option', () => {
    it('should parse --fw flag', () => {
      const options = parseCli(['node', 'create-tayori', '--fw', 'hono']);
      expect(options.framework).toBe('hono');
    });

    it('should parse --framework flag', () => {
      const options = parseCli(['node', 'create-tayori', '--framework', 'express']);
      expect(options.framework).toBe('express');
    });

    it('should use first specified value when both --fw and --framework are provided', () => {
      const options = parseCli(['node', 'create-tayori', '--fw', 'hono', '--framework', 'express']);
      // cac uses the first value when aliases are provided
      expect(options.framework).toBe('hono');
    });

    it('should return undefined when no framework is specified', () => {
      const options = parseCli(['node', 'create-tayori']);
      expect(options.framework).toBeUndefined();
    });
  });

  describe('Package Manager Option', () => {
    it('should parse --pm flag', () => {
      const options = parseCli(['node', 'create-tayori', '--pm', 'pnpm']);
      expect(options.packageManager).toBe('pnpm');
    });

    it('should parse --package-manager flag', () => {
      const options = parseCli(['node', 'create-tayori', '--package-manager', 'npm']);
      expect(options.packageManager).toBe('npm');
    });

    it('should accept all package manager types', () => {
      const managers = ['pnpm', 'npm', 'yarn', 'bun'];

      managers.forEach(pm => {
        const options = parseCli(['node', 'create-tayori', '--pm', pm]);
        expect(options.packageManager).toBe(pm);
      });
    });

    it('should return undefined when no package manager is specified', () => {
      const options = parseCli(['node', 'create-tayori']);
      expect(options.packageManager).toBeUndefined();
    });
  });

  describe('Skip Install Option', () => {
    it('should parse --skip-install flag', () => {
      const options = parseCli(['node', 'create-tayori', '--skip-install']);
      expect(options.skipInstall).toBe(true);
    });

    it('should default to undefined when flag is not provided', () => {
      const options = parseCli(['node', 'create-tayori']);
      expect(options.skipInstall).toBeUndefined();
    });
  });

  describe('Combined Options', () => {
    it('should parse all options together', () => {
      const options = parseCli([
        'node',
        'create-tayori',
        'my-webhook-handler',
        '--fw',
        'hono',
        '--pm',
        'pnpm',
        '--skip-install',
      ]);

      expect(options.projectName).toBe('my-webhook-handler');
      expect(options.framework).toBe('hono');
      expect(options.packageManager).toBe('pnpm');
      expect(options.skipInstall).toBe(true);
    });

    it('should handle options in any order', () => {
      const options = parseCli([
        'node',
        'create-tayori',
        '--skip-install',
        '--pm',
        'npm',
        'test-project',
        '--framework',
        'lambda',
      ]);

      expect(options.projectName).toBe('test-project');
      expect(options.framework).toBe('lambda');
      expect(options.packageManager).toBe('npm');
      expect(options.skipInstall).toBe(true);
    });
  });
});
