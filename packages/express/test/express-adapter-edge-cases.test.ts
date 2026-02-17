import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import { expressAdapter } from '../src/index.js';
import { WebhookRouter, type Verifier, type WebhookEvent } from '@tayori/core';

describe('expressAdapter - Edge Cases', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let router: WebhookRouter;
  let mockVerifier: Verifier<WebhookEvent>;

  const testEvent = {
    id: 'evt_123',
    type: 'test.event',
    data: { object: { id: 'test_123' } },
  };

  beforeEach(() => {
    mockReq = {
      headers: {},
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    router = new WebhookRouter();
    mockVerifier = vi.fn().mockReturnValue({ event: testEvent });
  });

  describe('invalid JSON handling', () => {
    it('should handle invalid JSON in buffer body', async () => {
      mockReq.body = Buffer.from('{ invalid json }');

      const verifier = vi.fn().mockImplementation(() => {
        throw new Error('Invalid JSON');
      });

      const middleware = expressAdapter(router, { verifier });

      await middleware(mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Invalid JSON' })
      );
    });

    it('should handle invalid JSON in string body', async () => {
      mockReq.body = '{ broken: json }';

      const verifier = vi.fn().mockImplementation(() => {
        throw new Error('Failed to parse JSON');
      });

      const middleware = expressAdapter(router, { verifier });

      await middleware(mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) })
      );
    });

    it('should handle JSON with extra trailing content', async () => {
      mockReq.body = Buffer.from('{"valid": true} extra content');

      const verifier = vi.fn().mockImplementation(() => {
        throw new Error('Extra content after JSON');
      });

      const middleware = expressAdapter(router, { verifier });

      await middleware(mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should handle truncated JSON', async () => {
      mockReq.body = Buffer.from('{"incomplete":');

      const verifier = vi.fn().mockImplementation(() => {
        throw new Error('Truncated JSON');
      });

      const middleware = expressAdapter(router, { verifier });

      await middleware(mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should handle JSON with null bytes', async () => {
      mockReq.body = Buffer.from('{"data":"value\u0000null"}');

      const verifier = vi.fn().mockReturnValue({ event: testEvent });

      const middleware = expressAdapter(router, { verifier });

      await middleware(mockReq as Request, mockRes as Response, vi.fn());

      expect(mockVerifier).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalled();
    });
  });

  describe('whitespace-only body handling', () => {
    it('should handle whitespace-only buffer body', async () => {
      mockReq.body = Buffer.from('   \n\t  \r\n  ');

      const verifier = vi.fn().mockImplementation(() => {
        throw new Error('Empty or whitespace body');
      });

      const middleware = expressAdapter(router, { verifier });

      await middleware(mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should handle whitespace-only string body', async () => {
      mockReq.body = '   \n\t  ';

      const verifier = vi.fn().mockImplementation(() => {
        throw new Error('Whitespace only');
      });

      const middleware = expressAdapter(router, { verifier });

      await middleware(mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should handle empty buffer body', async () => {
      mockReq.body = Buffer.from('');

      const verifier = vi.fn().mockImplementation(() => {
        throw new Error('Empty body');
      });

      const middleware = expressAdapter(router, { verifier });

      await middleware(mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should handle empty string body', async () => {
      mockReq.body = '';

      const verifier = vi.fn().mockImplementation(() => {
        throw new Error('Empty body');
      });

      const middleware = expressAdapter(router, { verifier });

      await middleware(mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should pass whitespace body to verifier for handling', async () => {
      mockReq.body = Buffer.from('  \n  ');

      const verifier = vi.fn().mockReturnValue({ event: testEvent });

      const middleware = expressAdapter(router, { verifier });

      await middleware(mockReq as Request, mockRes as Response, vi.fn());

      expect(verifier).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object)
      );
    });
  });

  describe('multi-value headers handling', () => {
    it('should handle multi-value header arrays', async () => {
      mockReq.body = Buffer.from(JSON.stringify(testEvent));
      mockReq.headers = {
        'x-custom-header': ['value1', 'value2', 'value3'],
      };

      const middleware = expressAdapter(router, { verifier: mockVerifier });

      await middleware(mockReq as Request, mockRes as Response, vi.fn());

      expect(mockVerifier).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          'x-custom-header': 'value1', // Should use first value
        })
      );
    });

    it('should handle mixed single and multi-value headers', async () => {
      mockReq.body = Buffer.from(JSON.stringify(testEvent));
      mockReq.headers = {
        'single-header': 'single-value',
        'multi-header': ['multi1', 'multi2'],
        'another-single': 'value',
      };

      const middleware = expressAdapter(router, { verifier: mockVerifier });

      await middleware(mockReq as Request, mockRes as Response, vi.fn());

      expect(mockVerifier).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          'single-header': 'single-value',
          'multi-header': 'multi1',
          'another-single': 'value',
        })
      );
    });

    it('should handle empty multi-value header array', async () => {
      mockReq.body = Buffer.from(JSON.stringify(testEvent));
      mockReq.headers = {
        'empty-multi': [],
      };

      const middleware = expressAdapter(router, { verifier: mockVerifier });

      await middleware(mockReq as Request, mockRes as Response, vi.fn());

      // The adapter should handle empty arrays gracefully
      expect(mockVerifier).toHaveBeenCalled();
    });

    it('should normalize header names to lowercase', async () => {
      mockReq.body = Buffer.from(JSON.stringify(testEvent));
      mockReq.headers = {
        'Content-Type': 'application/json',
        'X-Signature': 'sig_value',
        'STRIPE-SIGNATURE': 'stripe_sig',
      };

      const middleware = expressAdapter(router, { verifier: mockVerifier });

      await middleware(mockReq as Request, mockRes as Response, vi.fn());

      expect(mockVerifier).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          'content-type': 'application/json',
          'x-signature': 'sig_value',
          'stripe-signature': 'stripe_sig',
        })
      );
    });

    it('should handle headers with undefined values', async () => {
      mockReq.body = Buffer.from(JSON.stringify(testEvent));
      mockReq.headers = {
        'defined-header': 'value',
        'undefined-header': undefined,
        'null-header': null as unknown as string,
      };

      const middleware = expressAdapter(router, { verifier: mockVerifier });

      await middleware(mockReq as Request, mockRes as Response, vi.fn());

      expect(mockVerifier).toHaveBeenCalled();
    });

    it('should handle headers with special characters', async () => {
      mockReq.body = Buffer.from(JSON.stringify(testEvent));
      mockReq.headers = {
        'x-special-!@#$': 'value',
        'x-dash-header': 'dash-value',
        'x_underscore_header': 'underscore-value',
      };

      const middleware = expressAdapter(router, { verifier: mockVerifier });

      await middleware(mockReq as Request, mockRes as Response, vi.fn());

      expect(mockVerifier).toHaveBeenCalled();
    });

    it('should handle headers with very long values', async () => {
      const longHeaderValue = 'x'.repeat(10000);
      mockReq.body = Buffer.from(JSON.stringify(testEvent));
      mockReq.headers = {
        'x-long-header': longHeaderValue,
      };

      const middleware = expressAdapter(router, { verifier: mockVerifier });

      await middleware(mockReq as Request, mockRes as Response, vi.fn());

      expect(mockVerifier).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          'x-long-header': longHeaderValue,
        })
      );
    });
  });

  describe('request body type edge cases', () => {
    it('should reject number type body', async () => {
      mockReq.body = 12345 as unknown;

      const middleware = expressAdapter(router, { verifier: mockVerifier });

      await middleware(mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('raw Buffer or string'),
        })
      );
    });

    it('should reject array type body', async () => {
      mockReq.body = [1, 2, 3] as unknown;

      const middleware = expressAdapter(router, { verifier: mockVerifier });

      await middleware(mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should reject boolean type body', async () => {
      mockReq.body = true as unknown;

      const middleware = expressAdapter(router, { verifier: mockVerifier });

      await middleware(mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should handle very large buffer bodies', async () => {
      const largeBuffer = Buffer.alloc(10 * 1024 * 1024); // 10MB
      largeBuffer.fill(JSON.stringify(testEvent));
      mockReq.body = largeBuffer;

      const middleware = expressAdapter(router, { verifier: mockVerifier });

      await middleware(mockReq as Request, mockRes as Response, vi.fn());

      expect(mockVerifier).toHaveBeenCalled();
    });
  });

  describe('error handling edge cases', () => {
    it('should handle verifier throwing non-Error objects', async () => {
      mockReq.body = Buffer.from(JSON.stringify(testEvent));

      const verifier = vi.fn().mockImplementation(() => {
        throw 'string error';
      });

      const middleware = expressAdapter(router, { verifier });

      await middleware(mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should handle handler throwing non-Error objects', async () => {
      mockReq.body = Buffer.from(JSON.stringify(testEvent));

      const handler = vi.fn().mockImplementation(() => {
        throw { error: 'object error' };
      });

      router.on('test.event', handler);

      const middleware = expressAdapter(router, { verifier: mockVerifier });

      await middleware(mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    it('should call onError handler when provided', async () => {
      mockReq.body = Buffer.from(JSON.stringify(testEvent));

      const errorHandler = vi.fn();
      const handler = vi.fn().mockRejectedValue(new Error('Test error'));

      router.on('test.event', handler);

      const middleware = expressAdapter(router, {
        verifier: mockVerifier,
        onError: errorHandler,
      });

      await middleware(mockReq as Request, mockRes as Response, vi.fn());

      expect(errorHandler).toHaveBeenCalledWith(
        expect.any(Error),
        expect.any(Object)
      );
    });

    it('should handle onError handler that throws', async () => {
      mockReq.body = Buffer.from(JSON.stringify(testEvent));

      const errorHandler = vi.fn().mockImplementation(() => {
        throw new Error('onError failed');
      });

      const handler = vi.fn().mockRejectedValue(new Error('Handler error'));

      router.on('test.event', handler);

      const middleware = expressAdapter(router, {
        verifier: mockVerifier,
        onError: errorHandler,
      });

      // Should not throw, should return 500
      await expect(
        middleware(mockReq as Request, mockRes as Response, vi.fn())
      ).resolves.toBeUndefined();

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    it('should handle async verifier that throws', async () => {
      mockReq.body = Buffer.from(JSON.stringify(testEvent));

      const asyncVerifier = vi.fn(async () => {
        throw new Error('Async verify failed');
      });

      const middleware = expressAdapter(router, {
        verifier: asyncVerifier,
      });

      await middleware(mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('response handling', () => {
    it('should return correct success response structure', async () => {
      mockReq.body = Buffer.from(JSON.stringify(testEvent));

      const handler = vi.fn().mockResolvedValue(undefined);
      router.on('test.event', handler);

      const middleware = expressAdapter(router, { verifier: mockVerifier });

      await middleware(mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ received: true });
    });

    it('should return error response with proper structure', async () => {
      mockReq.body = undefined;

      const middleware = expressAdapter(router, { verifier: mockVerifier });

      await middleware(mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) })
      );
    });
  });
});
