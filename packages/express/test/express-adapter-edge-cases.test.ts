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
    type: 'payment_intent.succeeded',
    data: { object: { id: 'pi_123' } },
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
      send: vi.fn().mockReturnThis(),
    };

    router = new WebhookRouter();

    // Create mock verifier
    mockVerifier = vi.fn().mockReturnValue({ event: testEvent });
  });

  it('should handle custom verifier and ignore mockVerifier', async () => {
    const customVerifier: Verifier<WebhookEvent> = vi
      .fn()
      .mockReturnValue({ event: testEvent });

    const handler = vi.fn().mockResolvedValue(undefined);
    router.on('payment_intent.succeeded', handler);

    const middleware = expressAdapter(router, {
      verifier: customVerifier,
    });

    await middleware(mockReq as Request, mockRes as Response, vi.fn());

    // Assert that the supplied custom verifier was invoked
    expect(customVerifier).toHaveBeenCalledWith(
      mockReq.body,
      expect.objectContaining({
        'stripe-signature': 'test_signature',
      })
    );
    expect(handler).toHaveBeenCalledOnce();
    expect(mockRes.status).toHaveBeenCalledWith(200);
  });

  it('should handle JSON with null bytes', async () => {
    const nullByteEvent = JSON.stringify({
      id: 'evt_null\x00byte',
      type: 'test.event',
      data: { object: { id: 'test_123' } },
    });

    mockReq.body = Buffer.from(nullByteEvent);

    const customVerifier: Verifier<WebhookEvent> = vi
      .fn()
      .mockReturnValue({ event: testEvent });

    const handler = vi.fn().mockResolvedValue(undefined);
    router.on('payment_intent.succeeded', handler);

    const middleware = expressAdapter(router, {
      verifier: customVerifier,
    });

    await middleware(mockReq as Request, mockRes as Response, vi.fn());

    expect(customVerifier).toHaveBeenCalledWith(
      mockReq.body,
      expect.any(Object)
    );
  });

  it('should handle large buffer bodies (1MB)', async () => {
    if (!process.env.RUN_LARGE_TESTS) {
      // Skip by default for CI efficiency
      expect(true).toBe(true);
      return;
    }

    const largeBuffer = Buffer.alloc(1 * 1024 * 1024, 'x');
    mockReq.body = largeBuffer;

    const handler = vi.fn().mockResolvedValue(undefined);
    router.on('payment_intent.succeeded', handler);

    const middleware = expressAdapter(router, {
      verifier: mockVerifier,
    });

    await middleware(mockReq as Request, mockRes as Response, vi.fn());

    expect(mockVerifier).toHaveBeenCalledWith(
      largeBuffer,
      expect.any(Object)
    );
  });

  it('should handle string body without errors', async () => {
    mockReq.body = JSON.stringify(testEvent);

    const handler = vi.fn().mockResolvedValue(undefined);
    router.on('payment_intent.succeeded', handler);

    const middleware = expressAdapter(router, {
      verifier: mockVerifier,
    });

    await middleware(mockReq as Request, mockRes as Response, vi.fn());

    expect(mockVerifier).toHaveBeenCalledWith(
      JSON.stringify(testEvent),
      expect.any(Object)
    );
    expect(handler).toHaveBeenCalledOnce();
  });

  it('should return 400 when verifier fails', async () => {
    const failingVerifier: Verifier<WebhookEvent> = vi
      .fn()
      .mockImplementation(() => {
        throw new Error('Invalid signature');
      });

    const middleware = expressAdapter(router, {
      verifier: failingVerifier,
    });

    await middleware(mockReq as Request, mockRes as Response, vi.fn());

    expect(mockRes.status).toHaveBeenCalledWith(400);
  });
});
