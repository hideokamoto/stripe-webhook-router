import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Context } from 'hono';
import { honoAdapter } from '../src/index.js';
import { WebhookRouter, type Verifier, type WebhookEvent } from '@tayori/core';

describe('honoAdapter - Edge Cases', () => {
  let mockContext: Partial<Context>;
  let router: WebhookRouter;
  let mockVerifier: Verifier<WebhookEvent>;

  const testEvent = {
    id: 'evt_123',
    type: 'test.event',
    data: { object: { id: 'test_123' } },
  };

  beforeEach(() => {
    mockContext = {
      req: {
        text: vi.fn().mockResolvedValue(JSON.stringify(testEvent)),
        raw: {
          headers: new Map([['stripe-signature', 'test_sig']]),
        },
      },
      json: vi.fn().mockImplementation((data, status) => ({
        data,
        status,
      })),
    };

    router = new WebhookRouter();
    mockVerifier = vi.fn().mockReturnValue({ event: testEvent });
  });

  describe('empty and whitespace body handling', () => {
    it('should return 400 for empty body', async () => {
      (mockContext.req as any).text = vi.fn().mockResolvedValue('');

      const middleware = honoAdapter(router, { verifier: mockVerifier });

      const result = await middleware(mockContext as any);

      expect(result).toEqual({
        data: { error: 'Request body is required' },
        status: 400,
      });
    });

    it('should handle whitespace-only body', async () => {
      (mockContext.req as any).text = vi.fn().mockResolvedValue('   \n\t  ');

      const verifier = vi.fn().mockImplementation(() => {
        throw new Error('Whitespace only body');
      });

      const middleware = honoAdapter(router, { verifier });

      const result = await middleware(mockContext as any);

      expect(result).toEqual({
        data: { error: 'Whitespace only body' },
        status: 400,
      });
    });

    it('should handle null body', async () => {
      (mockContext.req as any).text = vi.fn().mockResolvedValue(null);

      const middleware = honoAdapter(router, { verifier: mockVerifier });

      const result = await middleware(mockContext as any);

      expect(result).toEqual({
        data: { error: 'Request body is required' },
        status: 400,
      });
    });

    it('should handle undefined body', async () => {
      (mockContext.req as any).text = vi.fn().mockResolvedValue(undefined);

      const middleware = honoAdapter(router, { verifier: mockVerifier });

      const result = await middleware(mockContext as any);

      expect(result).toEqual({
        data: { error: 'Request body is required' },
        status: 400,
      });
    });
  });

  describe('invalid JSON handling', () => {
    it('should handle invalid JSON in body', async () => {
      (mockContext.req as any).text = vi.fn().mockResolvedValue('{ invalid json }');

      const verifier = vi.fn().mockImplementation(() => {
        throw new Error('Invalid JSON');
      });

      const middleware = honoAdapter(router, { verifier });

      const result = await middleware(mockContext as any);

      expect(result).toEqual({
        data: { error: 'Invalid JSON' },
        status: 400,
      });
    });

    it('should handle truncated JSON', async () => {
      (mockContext.req as any).text = vi.fn().mockResolvedValue('{"incomplete":');

      const verifier = vi.fn().mockImplementation(() => {
        throw new Error('Truncated JSON');
      });

      const middleware = honoAdapter(router, { verifier });

      const result = await middleware(mockContext as any);

      expect(result).toEqual({
        data: { error: 'Truncated JSON' },
        status: 400,
      });
    });
  });

  describe('header handling', () => {
    it('should handle multi-value headers from Hono', async () => {
      const headerMap = new Map<string, string>();
      headerMap.set('x-custom', 'value1');
      headerMap.set('stripe-signature', 'sig_value');
      headerMap.set('content-type', 'application/json');

      (mockContext.req as any).raw.headers = headerMap;

      const middleware = honoAdapter(router, { verifier: mockVerifier });

      await middleware(mockContext as any);

      expect(mockVerifier).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          'x-custom': 'value1',
          'stripe-signature': 'sig_value',
          'content-type': 'application/json',
        })
      );
    });

    it('should normalize header names to lowercase', async () => {
      const headerMap = new Map<string, string>();
      headerMap.set('Content-Type', 'application/json');
      headerMap.set('X-Signature', 'sig');
      headerMap.set('STRIPE-SIGNATURE', 'stripe_sig');

      (mockContext.req as any).raw.headers = headerMap;

      const middleware = honoAdapter(router, { verifier: mockVerifier });

      await middleware(mockContext as any);

      expect(mockVerifier).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          'content-type': 'application/json',
          'x-signature': 'sig',
          'stripe-signature': 'stripe_sig',
        })
      );
    });

    it('should handle empty header map', async () => {
      (mockContext.req as any).raw.headers = new Map();

      const middleware = honoAdapter(router, { verifier: mockVerifier });

      await middleware(mockContext as any);

      expect(mockVerifier).toHaveBeenCalledWith(
        expect.any(String),
        {}
      );
    });
  });

  describe('error handling', () => {
    it('should handle verifier throwing non-Error objects', async () => {
      const verifier = vi.fn().mockImplementation(() => {
        throw 'string error';
      });

      const middleware = honoAdapter(router, { verifier });

      const result = await middleware(mockContext as any);

      // Non-Error objects are converted to "Verification failed"
      expect(result).toEqual({
        data: { error: 'Verification failed' },
        status: 400,
      });
    });

    it('should handle handler errors with onError callback', async () => {
      const handler = vi.fn().mockRejectedValue(new Error('Handler failed'));
      const errorHandler = vi.fn();

      router.on('test.event', handler);

      const middleware = honoAdapter(router, {
        verifier: mockVerifier,
        onError: errorHandler,
      });

      const result = await middleware(mockContext as any);

      expect(errorHandler).toHaveBeenCalledWith(
        expect.any(Error),
        expect.any(Object)
      );
      expect(result).toEqual({
        data: { error: 'Internal server error' },
        status: 500,
      });
    });

    it('should ignore onError handler errors', async () => {
      const handler = vi.fn().mockRejectedValue(new Error('Handler failed'));
      const errorHandler = vi.fn().mockImplementation(() => {
        throw new Error('onError failed');
      });

      router.on('test.event', handler);

      const middleware = honoAdapter(router, {
        verifier: mockVerifier,
        onError: errorHandler,
      });

      const result = await middleware(mockContext as any);

      expect(result).toEqual({
        data: { error: 'Internal server error' },
        status: 500,
      });
    });

    it('should handle handler throwing non-Error objects', async () => {
      const handler = vi.fn().mockImplementation(() => {
        throw { custom: 'error' };
      });

      router.on('test.event', handler);

      const middleware = honoAdapter(router, { verifier: mockVerifier });

      const result = await middleware(mockContext as any);

      expect(result).toEqual({
        data: { error: 'Internal server error' },
        status: 500,
      });
    });
  });

  describe('large and special body content', () => {
    it('should handle large request bodies', async () => {
      const largeEvent = {
        id: 'evt_large',
        type: 'test.event',
        data: { object: { content: 'x'.repeat(10 * 1024 * 1024) } },
      };

      (mockContext.req as any).text = vi.fn().mockResolvedValue(
        JSON.stringify(largeEvent)
      );

      const verifier = vi.fn().mockReturnValue({ event: largeEvent });

      const middleware = honoAdapter(router, { verifier });

      await middleware(mockContext as any);

      expect(verifier).toHaveBeenCalled();
    });

    it('should handle request bodies with special characters', async () => {
      const specialEvent = {
        id: 'evt_special',
        type: 'test.event',
        data: { object: { text: '你好世界 🎉 \n\t\r' } },
      };

      (mockContext.req as any).text = vi.fn().mockResolvedValue(
        JSON.stringify(specialEvent)
      );

      const verifier = vi.fn().mockReturnValue({ event: specialEvent });

      const middleware = honoAdapter(router, { verifier });

      await middleware(mockContext as any);

      expect(verifier).toHaveBeenCalled();
    });

    it('should handle request bodies with null bytes', async () => {
      const bodyWithNullByte = 'body\u0000content';

      (mockContext.req as any).text = vi.fn().mockResolvedValue(bodyWithNullByte);

      const verifier = vi.fn().mockImplementation(() => {
        throw new Error('Invalid body');
      });

      const middleware = honoAdapter(router, { verifier });

      const result = await middleware(mockContext as any);

      expect(result.status).toBe(400);
    });
  });

  describe('response structure', () => {
    it('should return proper success response', async () => {
      const middleware = honoAdapter(router, { verifier: mockVerifier });

      const result = await middleware(mockContext as any);

      expect(result).toEqual({
        data: { received: true },
        status: 200,
      });
    });

    it('should return proper error response for verification failure', async () => {
      const verifier = vi.fn().mockImplementation(() => {
        throw new Error('Signature verification failed');
      });

      const middleware = honoAdapter(router, { verifier });

      const result = await middleware(mockContext as any);

      expect(result).toEqual({
        data: { error: 'Signature verification failed' },
        status: 400,
      });
    });
  });

  describe('async body reading', () => {
    it('should handle text() throwing errors', async () => {
      (mockContext.req as any).text = vi.fn().mockRejectedValue(
        new Error('Failed to read body')
      );

      const middleware = honoAdapter(router, { verifier: mockVerifier });

      // This should throw as the adapter doesn't catch text() errors
      await expect(middleware(mockContext as any)).rejects.toThrow(
        'Failed to read body'
      );
    });

    it('should handle slow body reading', async () => {
      (mockContext.req as any).text = vi.fn(
        () => new Promise((resolve) => setTimeout(() => resolve(JSON.stringify(testEvent)), 100))
      );

      const middleware = honoAdapter(router, { verifier: mockVerifier });

      const result = await middleware(mockContext as any);

      expect(result).toEqual({
        data: { received: true },
        status: 200,
      });
    });
  });
});
