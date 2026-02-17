import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger } from './logger.js';

describe('Logger', () => {
  let consoleLogSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('info', () => {
    it('should log info message', () => {
      logger.info('Test info message');

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const call = consoleLogSpy.mock.calls[0];
      expect(call).toHaveLength(2);
      expect(call?.[1]).toBe('Test info message');
    });
  });

  describe('success', () => {
    it('should log success message', () => {
      logger.success('Test success message');

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const call = consoleLogSpy.mock.calls[0];
      expect(call).toHaveLength(2);
      expect(call?.[1]).toBe('Test success message');
    });
  });

  describe('warn', () => {
    it('should log warning message', () => {
      logger.warn('Test warning message');

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const call = consoleLogSpy.mock.calls[0];
      expect(call).toHaveLength(2);
      expect(call?.[1]).toBe('Test warning message');
    });
  });

  describe('error', () => {
    it('should log error message to stderr', () => {
      logger.error('Test error message');

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const call = consoleErrorSpy.mock.calls[0];
      expect(call).toHaveLength(2);
      expect(call?.[1]).toBe('Test error message');
    });
  });

  describe('title', () => {
    it('should log title with blank lines', () => {
      logger.title('Test Title');

      expect(consoleLogSpy).toHaveBeenCalledTimes(3);
      expect(consoleLogSpy.mock.calls[0]).toEqual([]);
      expect(consoleLogSpy.mock.calls[2]).toEqual([]);
    });
  });

  describe('Message content', () => {
    it('should include the message text in info', () => {
      logger.info('Custom info text');

      const lastCall = consoleLogSpy.mock.calls[0];
      expect(lastCall).toBeDefined();
      expect(lastCall?.join(' ')).toContain('Custom info text');
    });

    it('should include the message text in success', () => {
      logger.success('Operation completed');

      const lastCall = consoleLogSpy.mock.calls[0];
      expect(lastCall).toBeDefined();
      expect(lastCall?.join(' ')).toContain('Operation completed');
    });

    it('should include the message text in warn', () => {
      logger.warn('Warning: deprecated');

      const lastCall = consoleLogSpy.mock.calls[0];
      expect(lastCall).toBeDefined();
      expect(lastCall?.join(' ')).toContain('Warning: deprecated');
    });

    it('should include the message text in error', () => {
      logger.error('Error occurred');

      const lastCall = consoleErrorSpy.mock.calls[0];
      expect(lastCall).toBeDefined();
      expect(lastCall?.join(' ')).toContain('Error occurred');
    });
  });
});
