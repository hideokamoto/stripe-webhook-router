import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger } from './logger.js';

describe('Logger', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

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
      expect(consoleLogSpy.mock.calls[0]).toMatchSnapshot();
    });
  });

  describe('success', () => {
    it('should log success message', () => {
      logger.success('Test success message');

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy.mock.calls[0]).toMatchSnapshot();
    });
  });

  describe('warn', () => {
    it('should log warning message', () => {
      logger.warn('Test warning message');

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy.mock.calls[0]).toMatchSnapshot();
    });
  });

  describe('error', () => {
    it('should log error message to stderr', () => {
      logger.error('Test error message');

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy.mock.calls[0]).toMatchSnapshot();
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
      expect(lastCall.join(' ')).toContain('Custom info text');
    });

    it('should include the message text in success', () => {
      logger.success('Operation completed');

      const lastCall = consoleLogSpy.mock.calls[0];
      expect(lastCall.join(' ')).toContain('Operation completed');
    });

    it('should include the message text in warn', () => {
      logger.warn('Warning: deprecated');

      const lastCall = consoleLogSpy.mock.calls[0];
      expect(lastCall.join(' ')).toContain('Warning: deprecated');
    });

    it('should include the message text in error', () => {
      logger.error('Error occurred');

      const lastCall = consoleErrorSpy.mock.calls[0];
      expect(lastCall.join(' ')).toContain('Error occurred');
    });
  });
});
