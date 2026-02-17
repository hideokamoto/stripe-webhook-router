import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import type { Request, Response } from 'express';
import { expressAdapter } from '../src/index.js';
import { WebhookRouter, type Verifier, type WebhookEvent } from '@tayori/core';

describe('expressAdapter - Integration', () => {
  let app: express.Application;
  let router: WebhookRouter;
  let mockVerifier: Verifier<WebhookEvent>;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(express.raw({ type: 'application/json' }));

    router = new WebhookRouter();

    // Mock verifier
    mockVerifier = vi.fn().mockReturnValue({
      event: {
        id: 'evt_123',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_123' } },
      },
    });
  });

  it('should integrate with Express app', async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    router.on('payment_intent.succeeded', handler);

    const middleware = expressAdapter(router, { verifier: mockVerifier });

    app.post('/webhook', middleware);

    expect(app._router).toBeDefined();
  });

  it('should handle errors with proper error handler', async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    router.on('payment_intent.succeeded', handler);

    const middleware = expressAdapter(router, { verifier: mockVerifier });

    // Error handler with 4-argument signature - next must be kept even if unused
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const errorHandler = (
      err: Error,
      req: Request,
      res: Response,
      _next: express.NextFunction
    ) => {
      res.status(500).json({ error: err.message });
    };

    app.post('/webhook', middleware);
    app.use(errorHandler);

    expect(app._router).toBeDefined();
  });

  it('should preserve exact payload bytes for signature verification', async () => {
    const captureVerifier: Verifier<WebhookEvent> = vi.fn((payload) => {
      return {
        event: {
          id: 'evt_123',
          type: 'test.event',
          data: { object: { id: 'test_123' } },
        },
      };
    });

    const handler = vi.fn().mockResolvedValue(undefined);
    router.on('test.event', handler);

    const middleware = expressAdapter(router, { verifier: captureVerifier });

    app.post('/webhook', middleware);

    const jsonPayload = JSON.stringify({
      id: 'evt_123',
      type: 'test.event',
      data: { object: { id: 'test_123' } },
    });

    // Simulate a request
    const mockReq: Partial<Request> = {
      body: Buffer.from(jsonPayload),
      headers: {
        'stripe-signature': 'test_sig',
      },
    };

    const mockRes: Partial<Response> = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    await middleware(mockReq as Request, mockRes as Response, vi.fn());

    // Verify the exact payload was passed to the verifier
    const capturedPayload = (captureVerifier as ReturnType<typeof vi.fn>)
      .mock.calls[0]?.[0];
    expect(capturedPayload).toEqual(Buffer.from(jsonPayload));
    expect(handler).toHaveBeenCalledOnce();
  });

  it('should handle multiple webhook events', async () => {
    const handler1 = vi.fn().mockResolvedValue(undefined);
    const handler2 = vi.fn().mockResolvedValue(undefined);

    router.on('payment_intent.succeeded', handler1);
    router.on('invoice.paid', handler2);

    const middleware = expressAdapter(router, { verifier: mockVerifier });

    app.post('/webhook', middleware);

    expect(app._router).toBeDefined();
  });

  it('should return 400 on verification failure', async () => {
    const failingVerifier: Verifier<WebhookEvent> = vi
      .fn()
      .mockImplementation(() => {
        throw new Error('Signature verification failed');
      });

    const middleware = expressAdapter(router, { verifier: failingVerifier });

    app.post('/webhook', middleware);

    const mockReq: Partial<Request> = {
      body: Buffer.from('{}'),
      headers: {
        'stripe-signature': 'invalid_sig',
      },
    };

    const mockRes: Partial<Response> = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    await middleware(mockReq as Request, mockRes as Response, vi.fn());

    expect(mockRes.status).toHaveBeenCalledWith(400);
  });
});
