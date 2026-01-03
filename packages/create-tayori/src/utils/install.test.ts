import { describe, it, expect, vi, beforeEach } from 'vitest';
import { detectPackageManager } from './install.js';
import type { ExecaReturnValue } from 'execa';

// Mock execa
vi.mock('execa', () => ({
  execa: vi.fn(),
}));

// Mock ora
vi.mock('ora', () => ({
  default: vi.fn(() => ({
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
  })),
}));

describe('Install Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('detectPackageManager', () => {
    it('should return pnpm when pnpm is available', async () => {
      const { execa } = await import('execa');
      vi.mocked(execa).mockResolvedValue({
        stdout: '8.15.0',
        stderr: '',
        exitCode: 0,
      } as Partial<ExecaReturnValue> as ExecaReturnValue);

      const pm = await detectPackageManager();
      expect(pm).toBe('pnpm');
      expect(execa).toHaveBeenCalledWith('pnpm', ['--version']);
    });

    it('should return npm when pnpm is not available', async () => {
      const { execa } = await import('execa');
      vi.mocked(execa).mockRejectedValue(new Error('Command not found'));

      const pm = await detectPackageManager();
      expect(pm).toBe('npm');
    });
  });
});
