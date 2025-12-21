/**
 * Edge case tests for Express Adapter
 *
 * This test file covers edge cases and boundary conditions
 * for the Express adapter implementation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import { expressAdapter } from '../src/index.js';
import { WebhookRouter, type Verifier, type WebhookEvent } from '@tayori/core';

describe('expressAdapter - Edge Cases', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let router: WebhookRouter;
  let mockVerifier: Verifier<WebhookEvent>;

  const testEvent: WebhookEvent = {
    id: 'evt_123',
    type: 'test.event',
    data: { object: { id: 'test_123' } },
  };

  beforeEach(() => {
    mockReq = {
      body: Buffer.from(JSON.stringify(testEvent)),
      headers: {
        'stripe-signature': 'test_signature',
      },
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    router = new WebhookRouter();
    mockVerifier = vi.fn().mockReturnValue({ event: testEvent });
  });

  describe('header handling', () => {
    it('should handle multi-value headers by using the first value', async () => {
      mockReq.headers = {
        'stripe-signature': ['sig1', 'sig2'] as any, // Express can have array headers
      };

      const middleware = expressAdapter(router, { verifier: mockVerifier });
      await middleware(mockReq as Request, mockRes as Response, vi.fn());

      expect(mockVerifier).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.objectContaining({
          'stripe-signature': 'sig1',
        })
      );
    });

    it('should normalize header keys to lowercase', async () => {
      mockReq.headers = {
        'Stripe-Signature': 'test',
        'X-Custom-Header': 'value',
        'Content-Type': 'application/json',
      };

      const middleware = expressAdapter(router, { verifier: mockVerifier });
      await middleware(mockReq as Request, mockRes as Response, vi.fn());

      expect(mockVerifier).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.objectContaining({
          'stripe-signature': 'test',
          'x-custom-header': 'value',
          'content-type': 'application/json',
        })
      );
    });

    it('should handle headers with unicode characters', async () => {
      mockReq.headers = {
        'stripe-signature': 'test',
        'x-custom-header': '日本語ヘッダー',
      };

      const middleware = expressAdapter(router, { verifier: mockVerifier });
      await middleware(mockReq as Request, mockRes as Response, vi.fn());

      expect(mockVerifier).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.objectContaining({
          'x-custom-header': '日本語ヘッダー',
        })
      );
    });

    it('should handle undefined header values', async () => {
      mockReq.headers = {
        'stripe-signature': 'test',
        'x-optional-header': undefined,
      };

      const middleware = expressAdapter(router, { verifier: mockVerifier });
      await middleware(mockReq as Request, mockRes as Response, vi.fn());

      expect(mockVerifier).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.objectContaining({
          'stripe-signature': 'test',
          'x-optional-header': undefined,
        })
      );
    });
  });

  describe('body handling', () => {
    it('should handle large request bodies', async () => {
      const largePayload = Buffer.alloc(10 * 1024 * 1024); // 10MB
      mockReq.body = largePayload;

      const middleware = expressAdapter(router, { verifier: mockVerifier });
      await middleware(mockReq as Request, mockRes as Response, vi.fn());

      expect(mockVerifier).toHaveBeenCalledWith(largePayload, expect.any(Object));
    });

    it('should handle empty Buffer body', async () => {
      mockReq.body = Buffer.alloc(0); // Empty buffer

      const middleware = expressAdapter(router, { verifier: mockVerifier });
      await middleware(mockReq as Request, mockRes as Response, vi.fn());

      expect(mockVerifier).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.any(Object)
      );
    });

    it('should handle empty string body', async () => {
      mockReq.body = '';

      const middleware = expressAdapter(router, { verifier: mockVerifier });
      await middleware(mockReq as Request, mockRes as Response, vi.fn());

      expect(mockVerifier).toHaveBeenCalledWith('', expect.any(Object));
    });

    it('should handle body with special characters', async () => {
      const specialBody = '{"emoji":"🎉","unicode":"日本語"}';
      mockReq.body = specialBody;

      const middleware = expressAdapter(router, { verifier: mockVerifier });
      await middleware(mockReq as Request, mockRes as Response, vi.fn());

      expect(mockVerifier).toHaveBeenCalledWith(specialBody, expect.any(Object));
    });

    it('should reject body that is an object (not raw)', async () => {
      mockReq.body = { parsed: 'json' };

      const middleware = expressAdapter(router, { verifier: mockVerifier });
      await middleware(mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('raw Buffer or string'),
        })
      );
    });

    it('should reject body that is null', async () => {
      mockReq.body = null;

      const middleware = expressAdapter(router, { verifier: mockVerifier });
      await middleware(mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockVerifier).not.toHaveBeenCalled();
    });

    it('should reject body that is undefined', async () => {
      mockReq.body = undefined;

      const middleware = expressAdapter(router, { verifier: mockVerifier });
      await middleware(mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockVerifier).not.toHaveBeenCalled();
    });

    it('should reject body that is a number', async () => {
      mockReq.body = 123;

      const middleware = expressAdapter(router, { verifier: mockVerifier });
      await middleware(mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('verifier edge cases', () => {
    it('should handle async verifier that rejects', async () => {
      mockVerifier = vi.fn().mockRejectedValue(new Error('Async verification failed'));

      const middleware = expressAdapter(router, { verifier: mockVerifier });
      await middleware(mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Async verification failed',
      });
    });

    it('should handle verifier that throws a non-Error object', async () => {
      mockVerifier = vi.fn().mockImplementation(() => {
        throw 'String error'; // Non-Error throw
      });

      const middleware = expressAdapter(router, { verifier: mockVerifier });
      await middleware(mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Verification failed',
      });
    });

    it('should handle verifier that returns invalid event structure', async () => {
      mockVerifier = vi.fn().mockReturnValue({
        event: null, // Invalid event
      });

      const handler = vi.fn().mockResolvedValue(undefined);
      router.on('test.event', handler);

      const middleware = expressAdapter(router, { verifier: mockVerifier });

      // This might cause issues in dispatch, depending on implementation
      await expect(
        middleware(mockReq as Request, mockRes as Response, vi.fn())
      ).rejects.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle handler that throws synchronously', async () => {
      const handler = vi.fn().mockImplementation(() => {
        throw new Error('Sync error');
      });

      router.on('test.event', handler);

      const middleware = expressAdapter(router, { verifier: mockVerifier });
      await middleware(mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    it('should handle non-Error throws from handler', async () => {
      const handler = vi.fn().mockRejectedValue('String error');

      router.on('test.event', handler);

      const middleware = expressAdapter(router, { verifier: mockVerifier });
      await middleware(mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    it('should call onError when handler fails', async () => {
      const handler = vi.fn().mockRejectedValue(new Error('Handler error'));
      const onError = vi.fn();

      router.on('test.event', handler);

      const middleware = expressAdapter(router, {
        verifier: mockVerifier,
        onError,
      });

      await middleware(mockReq as Request, mockRes as Response, vi.fn());

      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ type: 'test.event' })
      );
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    it('should handle onError that throws synchronously', async () => {
      const handler = vi.fn().mockRejectedValue(new Error('Handler error'));
      const onError = vi.fn().mockImplementation(() => {
        throw new Error('onError error');
      });

      router.on('test.event', handler);

      const middleware = expressAdapter(router, {
        verifier: mockVerifier,
        onError,
      });

      await middleware(mockReq as Request, mockRes as Response, vi.fn());

      // Should still return 500 response
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    it('should handle async onError that rejects', async () => {
      const handler = vi.fn().mockRejectedValue(new Error('Handler error'));
      const onError = vi.fn().mockRejectedValue(new Error('onError error'));

      router.on('test.event', handler);

      const middleware = expressAdapter(router, {
        verifier: mockVerifier,
        onError,
      });

      await middleware(mockReq as Request, mockRes as Response, vi.fn());

      // Should still return 500 response
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('response handling', () => {
    it('should handle res.status returning non-chainable value', async () => {
      mockRes.status = vi.fn(); // Not returning this

      const middleware = expressAdapter(router, { verifier: mockVerifier });

      // Should not crash
      await expect(
        middleware(mockReq as Request, mockRes as Response, vi.fn())
      ).resolves.toBeUndefined();
    });

    it('should handle res.json that throws', async () => {
      mockRes.json = vi.fn().mockImplementation(() => {
        throw new Error('Response error');
      });

      const middleware = expressAdapter(router, { verifier: mockVerifier });

      await expect(
        middleware(mockReq as Request, mockRes as Response, vi.fn())
      ).rejects.toThrow('Response error');
    });
  });

  describe('concurrent requests', () => {
    it('should handle multiple concurrent requests', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      router.on('test.event', handler);

      const middleware = expressAdapter(router, { verifier: mockVerifier });

      // Simulate 10 concurrent requests
      const requests = Array.from({ length: 10 }, () =>
        middleware(mockReq as Request, mockRes as Response, vi.fn())
      );

      await Promise.all(requests);

      expect(handler).toHaveBeenCalledTimes(10);
      expect(mockRes.status).toHaveBeenCalledTimes(10);
    });
  });
});
