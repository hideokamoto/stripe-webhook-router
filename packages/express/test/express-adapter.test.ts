import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import { expressAdapter } from '../src/index.js';
import { WebhookRouter } from '@and-subscribe/core';

// Mock stripe
vi.mock('stripe', () => {
  return {
    default: class Stripe {
      webhooks = {
        constructEvent: vi.fn(),
      };
    },
  };
});

describe('expressAdapter', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let router: WebhookRouter;

  beforeEach(() => {
    mockReq = {
      body: Buffer.from(JSON.stringify({
        id: 'evt_123',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_123' } },
      })),
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
  });

  it('should return an express middleware function', () => {
    const middleware = expressAdapter(router, {
      webhookSecret: 'whsec_test',
    });

    expect(typeof middleware).toBe('function');
  });

  it('should call registered handlers when event matches', async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    router.on('payment_intent.succeeded', handler);

    const middleware = expressAdapter(router, {
      webhookSecret: 'whsec_test',
      // Skip signature verification for testing
      skipVerification: true,
    });

    await middleware(mockReq as Request, mockRes as Response, vi.fn());

    expect(handler).toHaveBeenCalledOnce();
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ received: true });
  });

  it('should return 400 when body is missing', async () => {
    mockReq.body = undefined;

    const middleware = expressAdapter(router, {
      webhookSecret: 'whsec_test',
      skipVerification: true,
    });

    await middleware(mockReq as Request, mockRes as Response, vi.fn());

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) })
    );
  });

  it('should return 400 when signature is missing', async () => {
    mockReq.headers = {};

    const middleware = expressAdapter(router, {
      webhookSecret: 'whsec_test',
    });

    await middleware(mockReq as Request, mockRes as Response, vi.fn());

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) })
    );
  });

  it('should handle handler errors with 500 status', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('Handler error'));
    router.on('payment_intent.succeeded', handler);

    const middleware = expressAdapter(router, {
      webhookSecret: 'whsec_test',
      skipVerification: true,
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
      webhookSecret: 'whsec_test',
      skipVerification: true,
      onError,
    });

    await middleware(mockReq as Request, mockRes as Response, vi.fn());

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ type: 'payment_intent.succeeded' })
    );
  });
});
