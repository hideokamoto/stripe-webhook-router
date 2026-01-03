import { describe, it, expect, vi, beforeEach } from 'vitest';
import { promptForConfig } from './prompts.js';
import type prompts from 'prompts';

// Mock prompts
vi.mock('prompts', () => ({
  default: vi.fn(),
}));

describe('Prompts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('promptForConfig', () => {
    it('should use provided values without prompting', async () => {
      const prompts = (await import('prompts')).default;
      vi.mocked(prompts).mockResolvedValue({});

      const config = await promptForConfig({
        projectName: 'my-project',
        framework: 'hono',
        packageManager: 'pnpm',
        shouldInstall: true,
      });

      expect(config).toEqual({
        projectName: 'my-project',
        framework: 'hono',
        packageManager: 'pnpm',
        shouldInstall: true,
      });

      // Should not prompt for anything since all values are provided
      expect(prompts).toHaveBeenCalledWith(
        [],
        expect.any(Object)
      );
    });

    it('should prompt for missing project name', async () => {
      const prompts = (await import('prompts')).default;
      vi.mocked(prompts).mockResolvedValue({
        projectName: 'prompted-project',
      });

      const config = await promptForConfig({
        framework: 'hono',
        packageManager: 'pnpm',
        shouldInstall: true,
      });

      expect(config.projectName).toBe('prompted-project');

      // Should have prompted for project name
      const calls = vi.mocked(prompts).mock.calls[0];
      const questions = calls[0] as prompts.PromptObject[];
      expect(questions.some((q: prompts.PromptObject) => q.name === 'projectName')).toBe(true);
    });

    it('should prompt for missing framework', async () => {
      const prompts = (await import('prompts')).default;
      vi.mocked(prompts).mockResolvedValue({
        framework: 'express',
      });

      const config = await promptForConfig({
        projectName: 'my-project',
        packageManager: 'pnpm',
        shouldInstall: true,
      });

      expect(config.framework).toBe('express');

      const calls = vi.mocked(prompts).mock.calls[0];
      const questions = calls[0] as prompts.PromptObject[];
      expect(questions.some((q: prompts.PromptObject) => q.name === 'framework')).toBe(true);
    });

    it('should prompt for missing package manager', async () => {
      const prompts = (await import('prompts')).default;
      vi.mocked(prompts).mockResolvedValue({
        packageManager: 'yarn',
      });

      const config = await promptForConfig({
        projectName: 'my-project',
        framework: 'hono',
        shouldInstall: true,
      });

      expect(config.packageManager).toBe('yarn');

      const calls = vi.mocked(prompts).mock.calls[0];
      const questions = calls[0] as prompts.PromptObject[];
      expect(questions.some((q: prompts.PromptObject) => q.name === 'packageManager')).toBe(true);
    });

    it('should prompt for missing shouldInstall', async () => {
      const prompts = (await import('prompts')).default;
      vi.mocked(prompts).mockResolvedValue({
        shouldInstall: false,
      });

      const config = await promptForConfig({
        projectName: 'my-project',
        framework: 'hono',
        packageManager: 'pnpm',
      });

      expect(config.shouldInstall).toBe(false);

      const calls = vi.mocked(prompts).mock.calls[0];
      const questions = calls[0] as prompts.PromptObject[];
      expect(questions.some((q: prompts.PromptObject) => q.name === 'shouldInstall')).toBe(true);
    });

    it('should prompt for all missing values', async () => {
      const prompts = (await import('prompts')).default;
      vi.mocked(prompts).mockResolvedValue({
        projectName: 'new-project',
        framework: 'lambda',
        packageManager: 'bun',
        shouldInstall: true,
      });

      const config = await promptForConfig({});

      expect(config).toEqual({
        projectName: 'new-project',
        framework: 'lambda',
        packageManager: 'bun',
        shouldInstall: true,
      });

      const calls = vi.mocked(prompts).mock.calls[0];
      const questions = calls[0] as prompts.PromptObject[];
      expect(questions.length).toBe(4);
    });

    it('should handle shouldInstall=false correctly', async () => {
      const prompts = (await import('prompts')).default;
      vi.mocked(prompts).mockResolvedValue({});

      const config = await promptForConfig({
        projectName: 'my-project',
        framework: 'hono',
        packageManager: 'pnpm',
        shouldInstall: false,
      });

      expect(config.shouldInstall).toBe(false);

      const calls = vi.mocked(prompts).mock.calls[0];
      const questions = calls[0] as prompts.PromptObject[];
      expect(questions.some((q: prompts.PromptObject) => q.name === 'shouldInstall')).toBe(false);
    });
  });

  describe('Prompt validation', () => {
    it('should validate project name is not empty', async () => {
      const prompts = (await import('prompts')).default;

      // Don't actually execute validation, just check it exists
      await promptForConfig({ framework: 'hono' });

      const calls = vi.mocked(prompts).mock.calls[0];
      const questions = calls[0] as prompts.PromptObject[];
      const projectNameQ = questions.find((q: prompts.PromptObject) => q.name === 'projectName');

      expect(projectNameQ?.validate).toBeDefined();
      expect(typeof projectNameQ?.validate).toBe('function');
    });

    it('should reject empty project name', async () => {
      const prompts = (await import('prompts')).default;

      await promptForConfig({ framework: 'hono' });

      const calls = vi.mocked(prompts).mock.calls[0];
      const questions = calls[0] as prompts.PromptObject[];
      const projectNameQ = questions.find((q: prompts.PromptObject) => q.name === 'projectName');

      const validation = projectNameQ?.validate('');
      expect(validation).not.toBe(true);
    });

    it('should accept non-empty project name', async () => {
      const prompts = (await import('prompts')).default;

      await promptForConfig({ framework: 'hono' });

      const calls = vi.mocked(prompts).mock.calls[0];
      const questions = calls[0] as prompts.PromptObject[];
      const projectNameQ = questions.find((q: prompts.PromptObject) => q.name === 'projectName');

      const validation = projectNameQ?.validate('my-project');
      expect(validation).toBe(true);
    });
  });
});
