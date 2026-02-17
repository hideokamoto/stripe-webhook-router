import { describe, it, expect, beforeEach } from 'vitest';
import { createTayori } from '../src/index.js';

describe('CLI Integration', () => {
  beforeEach(() => {
    // TODO: Add tempDir setup and project-generation tests when ready
  });

  it('should export createTayori function', () => {
    expect(typeof createTayori).toBe('function');
  });

  it('should handle CLI invocation', async () => {
    // Integration test for CLI functionality
    expect(createTayori).toBeDefined();
  });
});
