import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import { expressAdapter } from '../src/index.js';
import { WebhookRouter, type Verifier, type WebhookEvent } from '@tayori/core';

describe('expressAdapter', () => {
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

  it('should return an express middleware function', () => {
    const middleware = expressAdapter(router, {
      verifier: mockVerifier,
    });

    expect(typeof middleware).toBe('function');
  });

  it('should call registered handlers when event matches', async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    router.on('payment_intent.succeeded', handler);

    const middleware = expressAdapter(router, {
      verifier: mockVerifier,
    });

    await middleware(mockReq as Request, mockRes as Response, vi.fn());

    expect(mockVerifier).toHaveBeenCalledWith(
      mockReq.body,
      expect.objectContaining({
        'stripe-signature': 'test_signature',
      })
    );
    expect(handler).toHaveBeenCalledOnce();
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ received: true });
  });

  it('should accept string body', async () => {
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
    expect(mockRes.status).toHaveBeenCalledWith(200);
  });

  it('should return 400 when body is missing', async () => {
    mockReq.body = undefined;

    const middleware = expressAdapter(router, {
      verifier: mockVerifier,
    });

    await middleware(mockReq as Request, mockRes as Response, vi.fn());

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) })
    );
  });

  it('should return 400 when body is not a Buffer or string', async () => {
    mockReq.body = { parsed: 'json' }; // Object instead of Buffer/string

    const middleware = expressAdapter(router, {
      verifier: mockVerifier,
    });

    await middleware(mockReq as Request, mockRes as Response, vi.fn());

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringContaining('raw Buffer or string'),
      })
    );
  });

  it('should return 400 when verifier throws', async () => {
    (mockVerifier as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('Invalid signature');
    });

    const middleware = expressAdapter(router, {
      verifier: mockVerifier,
    });

    await middleware(mockReq as Request, mockRes as Response, vi.fn());

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Verification failed' })
    );
  });

  it('should handle handler errors with 500 status', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('Handler error'));
    router.on('payment_intent.succeeded', handler);

    const middleware = expressAdapter(router, {
      verifier: mockVerifier,
    });

    await middleware(mockReq as Request, mockRes as Response, vi.fn());

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) })
    );
  });

  it('should call custom onError handler when provided', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('Handler error'));
    const onError = vi.fn();
    router.on('payment_intent.succeeded', handler);

    const middleware = expressAdapter(router, {
      verifier: mockVerifier,
      onError,
    });

    await middleware(mockReq as Request, mockRes as Response, vi.fn());

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ type: 'payment_intent.succeeded' })
    );
  });

  it('should handle async onError handler', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('Handler error'));
    const onError = vi.fn().mockResolvedValue(undefined);
    router.on('payment_intent.succeeded', handler);

    const middleware = expressAdapter(router, {
      verifier: mockVerifier,
      onError,
    });

    await middleware(mockReq as Request, mockRes as Response, vi.fn());

    expect(onError).toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(500);
  });

  it('should not crash if onError throws', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('Handler error'));
    const onError = vi.fn().mockRejectedValue(new Error('onError failed'));
    router.on('payment_intent.succeeded', handler);

    const middleware = expressAdapter(router, {
      verifier: mockVerifier,
      onError,
    });

    await middleware(mockReq as Request, mockRes as Response, vi.fn());

    expect(onError).toHaveBeenCalled();
    // Should still return 500 response
    expect(mockRes.status).toHaveBeenCalledWith(500);
  });
});
