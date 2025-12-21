import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathExists, isEmpty, writeJson } from './files.js';

describe('File Utilities', () => {
  const testDir = path.join(process.cwd(), 'test-temp');

  beforeEach(async () => {
    // Clean up test directory before each test
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Directory might not exist
    }
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory after each test
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore errors
    }
  });

  describe('pathExists', () => {
    it('should return true for existing file', async () => {
      const filePath = path.join(testDir, 'test.txt');
      await fs.writeFile(filePath, 'test');

      const exists = await pathExists(filePath);
      expect(exists).toBe(true);
    });

    it('should return true for existing directory', async () => {
      const dirPath = path.join(testDir, 'subdir');
      await fs.mkdir(dirPath);

      const exists = await pathExists(dirPath);
      expect(exists).toBe(true);
    });

    it('should return false for non-existent path', async () => {
      const nonExistentPath = path.join(testDir, 'does-not-exist');
      const exists = await pathExists(nonExistentPath);
      expect(exists).toBe(false);
    });
  });

  describe('isEmpty', () => {
    it('should return true for empty directory', async () => {
      const emptyDir = path.join(testDir, 'empty');
      await fs.mkdir(emptyDir);

      const empty = await isEmpty(emptyDir);
      expect(empty).toBe(true);
    });

    it('should return false for directory with files', async () => {
      const dirWithFiles = path.join(testDir, 'with-files');
      await fs.mkdir(dirWithFiles);
      await fs.writeFile(path.join(dirWithFiles, 'file.txt'), 'content');

      const empty = await isEmpty(dirWithFiles);
      expect(empty).toBe(false);
    });

    it('should return false for directory with subdirectories', async () => {
      const dirWithSubdir = path.join(testDir, 'with-subdir');
      await fs.mkdir(dirWithSubdir);
      await fs.mkdir(path.join(dirWithSubdir, 'subdir'));

      const empty = await isEmpty(dirWithSubdir);
      expect(empty).toBe(false);
    });

    it('should return true for non-existent directory', async () => {
      const nonExistentDir = path.join(testDir, 'does-not-exist');
      const empty = await isEmpty(nonExistentDir);
      expect(empty).toBe(true);
    });
  });

  describe('writeJson', () => {
    it('should write valid JSON to file', async () => {
      const jsonPath = path.join(testDir, 'test.json');
      const data = { name: 'test', version: '1.0.0' };

      await writeJson(jsonPath, data);

      const content = await fs.readFile(jsonPath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed).toEqual(data);
    });

    it('should format JSON with 2-space indentation', async () => {
      const jsonPath = path.join(testDir, 'formatted.json');
      const data = { name: 'test', nested: { value: 1 } };

      await writeJson(jsonPath, data);

      const content = await fs.readFile(jsonPath, 'utf-8');

      expect(content).toContain('  "name"');
      expect(content).toContain('  "nested"');
    });

    it('should include trailing newline', async () => {
      const jsonPath = path.join(testDir, 'newline.json');
      const data = { test: true };

      await writeJson(jsonPath, data);

      const content = await fs.readFile(jsonPath, 'utf-8');

      expect(content.endsWith('\n')).toBe(true);
    });

    it('should handle nested objects', async () => {
      const jsonPath = path.join(testDir, 'nested.json');
      const data = {
        scripts: {
          test: 'vitest',
          build: 'tsup',
        },
        dependencies: {
          react: '^18.0.0',
        },
      };

      await writeJson(jsonPath, data);

      const content = await fs.readFile(jsonPath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed).toEqual(data);
    });

    it('should handle arrays', async () => {
      const jsonPath = path.join(testDir, 'array.json');
      const data = {
        items: ['one', 'two', 'three'],
        numbers: [1, 2, 3],
      };

      await writeJson(jsonPath, data);

      const content = await fs.readFile(jsonPath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed).toEqual(data);
    });
  });
});
