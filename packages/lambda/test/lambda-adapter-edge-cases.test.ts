import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { lambdaAdapter } from '../src/index.js';
import { WebhookRouter, type Verifier, type WebhookEvent } from '@tayori/core';

describe('lambdaAdapter - Edge Cases', () => {
  let mockEvent: Partial<APIGatewayProxyEvent>;
  let mockContext: Partial<Context>;
  let router: WebhookRouter;
  let mockVerifier: Verifier<WebhookEvent>;

  const testEvent = {
    id: 'evt_123',
    type: 'test.event',
    data: { object: { id: 'test_123' } },
  };

  beforeEach(() => {
    mockEvent = {
      body: JSON.stringify(testEvent),
      headers: {
        'stripe-signature': 'test_sig',
      },
      isBase64Encoded: false,
    };

    mockContext = {
      functionName: 'test-function',
    };

    router = new WebhookRouter();
    mockVerifier = vi.fn().mockReturnValue({ event: testEvent });
  });

  describe('missing body handling', () => {
    it('should return 400 when body is missing', async () => {
      mockEvent.body = undefined;

      const handler = lambdaAdapter(router, { verifier: mockVerifier });

      const result = await handler(mockEvent as any, mockContext as any);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({
        error: 'Request body is required',
      });
    });

    it('should return 400 when body is null', async () => {
      mockEvent.body = null;

      const handler = lambdaAdapter(router, { verifier: mockVerifier });

      const result = await handler(mockEvent as any, mockContext as any);

      expect(result.statusCode).toBe(400);
    });

    it('should return 400 when body is empty string', async () => {
      mockEvent.body = '';

      const handler = lambdaAdapter(router, { verifier: mockVerifier });

      const result = await handler(mockEvent as any, mockContext as any);

      expect(result.statusCode).toBe(400);
    });

    it('should handle whitespace-only body', async () => {
      mockEvent.body = '   \n\t  ';

      const verifier = vi.fn().mockImplementation(() => {
        throw new Error('Whitespace body');
      });

      const handler = lambdaAdapter(router, { verifier });

      const result = await handler(mockEvent as any, mockContext as any);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({
        error: 'Whitespace body',
      });
    });
  });

  describe('base64 decoding', () => {
    it('should decode base64-encoded body', async () => {
      const bodyString = JSON.stringify(testEvent);
      mockEvent.body = Buffer.from(bodyString).toString('base64');
      mockEvent.isBase64Encoded = true;

      const handler = lambdaAdapter(router, { verifier: mockVerifier });

      await handler(mockEvent as any, mockContext as any);

      expect(mockVerifier).toHaveBeenCalledWith(
        bodyString,
        expect.any(Object)
      );
    });

    it('should handle invalid base64 content', async () => {
      mockEvent.body = '!!!invalid base64!!!';
      mockEvent.isBase64Encoded = true;

      const verifier = vi.fn().mockImplementation(() => {
        throw new Error('Invalid payload');
      });

      const handler = lambdaAdapter(router, { verifier });

      const result = await handler(mockEvent as any, mockContext as any);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({ error: 'Invalid payload' });
    });

    it('should handle non-UTF8 base64 content', async () => {
      // Create a buffer with non-UTF8 bytes
      const buffer = Buffer.from([0xFF, 0xFE, 0xFD]);
      mockEvent.body = buffer.toString('base64');
      mockEvent.isBase64Encoded = true;

      const verifier = vi.fn().mockReturnValue({ event: testEvent });

      const handler = lambdaAdapter(router, { verifier });

      await handler(mockEvent as any, mockContext as any);

      expect(verifier).toHaveBeenCalled();
    });

    it('should skip decoding when isBase64Encoded is false', async () => {
      const bodyString = JSON.stringify(testEvent);
      mockEvent.body = bodyString;
      mockEvent.isBase64Encoded = false;

      const handler = lambdaAdapter(router, { verifier: mockVerifier });

      await handler(mockEvent as any, mockContext as any);

      expect(mockVerifier).toHaveBeenCalledWith(
        bodyString,
        expect.any(Object)
      );
    });

    it('should handle missing isBase64Encoded flag', async () => {
      mockEvent.body = JSON.stringify(testEvent);
      mockEvent.isBase64Encoded = undefined as any;

      const handler = lambdaAdapter(router, { verifier: mockVerifier });

      await handler(mockEvent as any, mockContext as any);

      expect(mockVerifier).toHaveBeenCalled();
    });
  });

  describe('header handling', () => {
    it('should normalize header names to lowercase', async () => {
      mockEvent.headers = {
        'Content-Type': 'application/json',
        'X-Signature': 'sig_value',
        'STRIPE-SIGNATURE': 'stripe_sig',
      };

      const handler = lambdaAdapter(router, { verifier: mockVerifier });

      await handler(mockEvent as any, mockContext as any);

      expect(mockVerifier).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          'content-type': 'application/json',
          'x-signature': 'sig_value',
          'stripe-signature': 'stripe_sig',
        })
      );
    });

    it('should handle missing headers object', async () => {
      mockEvent.headers = undefined as any;

      const handler = lambdaAdapter(router, { verifier: mockVerifier });

      // Missing headers are handled gracefully (treated as empty object)
      const result = await handler(mockEvent as any, mockContext as any);

      expect(result.statusCode).toBe(200);
      expect(mockVerifier).toHaveBeenCalled();
    });

    it('should handle empty headers object', async () => {
      mockEvent.headers = {};

      const handler = lambdaAdapter(router, { verifier: mockVerifier });

      await handler(mockEvent as any, mockContext as any);

      expect(mockVerifier).toHaveBeenCalledWith(
        expect.any(String),
        {}
      );
    });

    it('should handle headers with undefined values', async () => {
      mockEvent.headers = {
        'valid-header': 'value',
        'undefined-header': undefined,
      };

      const handler = lambdaAdapter(router, { verifier: mockVerifier });

      await handler(mockEvent as any, mockContext as any);

      expect(mockVerifier).toHaveBeenCalled();
    });

    it('should handle headers with special characters', async () => {
      mockEvent.headers = {
        'x-special-!@#$': 'value',
        'x-dash-header': 'dash-value',
        'x_underscore_header': 'underscore-value',
      };

      const handler = lambdaAdapter(router, { verifier: mockVerifier });

      await handler(mockEvent as any, mockContext as any);

      expect(mockVerifier).toHaveBeenCalled();
    });
  });

  describe('invalid JSON handling', () => {
    it('should handle invalid JSON in body', async () => {
      mockEvent.body = '{ invalid json }';

      const verifier = vi.fn().mockImplementation(() => {
        throw new Error('Invalid JSON');
      });

      const handler = lambdaAdapter(router, { verifier });

      const result = await handler(mockEvent as any, mockContext as any);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({
        error: 'Invalid JSON',
      });
    });

    it('should handle truncated JSON', async () => {
      mockEvent.body = '{"incomplete":';

      const verifier = vi.fn().mockImplementation(() => {
        throw new Error('Truncated JSON');
      });

      const handler = lambdaAdapter(router, { verifier });

      const result = await handler(mockEvent as any, mockContext as any);

      expect(result.statusCode).toBe(400);
    });
  });

  describe('error handling', () => {
    it('should handle verifier throwing non-Error objects', async () => {
      const verifier = vi.fn().mockImplementation(() => {
        throw 'string error';
      });

      const handler = lambdaAdapter(router, { verifier });

      const result = await handler(mockEvent as any, mockContext as any);

      expect(result.statusCode).toBe(400);
      // Non-Error objects are converted to "Verification failed"
      expect(JSON.parse(result.body)).toEqual({
        error: 'Verification failed',
      });
    });

    it('should handle handler errors with onError callback', async () => {
      const handlerFn = vi.fn().mockRejectedValue(new Error('Handler failed'));
      const errorHandler = vi.fn();

      router.on('test.event', handlerFn);

      const handler = lambdaAdapter(router, {
        verifier: mockVerifier,
        onError: errorHandler,
      });

      const result = await handler(mockEvent as any, mockContext as any);

      expect(errorHandler).toHaveBeenCalledWith(
        expect.any(Error),
        expect.any(Object)
      );
      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body)).toEqual({
        error: 'Internal server error',
      });
    });

    it('should ignore onError handler errors', async () => {
      const handlerFn = vi.fn().mockRejectedValue(new Error('Handler failed'));
      const errorHandler = vi.fn().mockImplementation(() => {
        throw new Error('onError failed');
      });

      router.on('test.event', handlerFn);

      const handler = lambdaAdapter(router, {
        verifier: mockVerifier,
        onError: errorHandler,
      });

      const result = await handler(mockEvent as any, mockContext as any);

      expect(result.statusCode).toBe(500);
    });

    it('should handle handler throwing non-Error objects', async () => {
      const handlerFn = vi.fn().mockImplementation(() => {
        throw { custom: 'error' };
      });

      router.on('test.event', handlerFn);

      const handler = lambdaAdapter(router, { verifier: mockVerifier });

      const result = await handler(mockEvent as any, mockContext as any);

      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body)).toEqual({
        error: 'Internal server error',
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

      mockEvent.body = JSON.stringify(largeEvent);

      const verifier = vi.fn().mockReturnValue({ event: largeEvent });

      const handler = lambdaAdapter(router, { verifier });

      const result = await handler(mockEvent as any, mockContext as any);

      expect(result.statusCode).toBe(200);
    });

    it('should handle request bodies with special characters', async () => {
      const specialEvent = {
        id: 'evt_special',
        type: 'test.event',
        data: { object: { text: '你好世界 🎉 \n\t\r' } },
      };

      mockEvent.body = JSON.stringify(specialEvent);

      const verifier = vi.fn().mockReturnValue({ event: specialEvent });

      const handler = lambdaAdapter(router, { verifier });

      const result = await handler(mockEvent as any, mockContext as any);

      expect(result.statusCode).toBe(200);
    });
  });

  describe('response structure', () => {
    it('should return proper success response', async () => {
      const handler = lambdaAdapter(router, { verifier: mockVerifier });

      const result = await handler(mockEvent as any, mockContext as any);

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual({ received: true });
      expect(result.headers).toEqual({ 'Content-Type': 'application/json' });
    });

    it('should return proper error response', async () => {
      mockEvent.body = undefined;

      const handler = lambdaAdapter(router, { verifier: mockVerifier });

      const result = await handler(mockEvent as any, mockContext as any);

      expect(result.statusCode).toBe(400);
      expect(result.headers).toEqual({ 'Content-Type': 'application/json' });
      expect(JSON.parse(result.body)).toHaveProperty('error');
    });
  });
});
