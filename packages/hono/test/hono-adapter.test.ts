import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { honoAdapter } from '../src/index.js';
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

describe('honoAdapter', () => {
  let router: WebhookRouter;

  beforeEach(() => {
    router = new WebhookRouter();
  });

  it('should return a Hono handler function', () => {
    const handler = honoAdapter(router, {
      webhookSecret: 'whsec_test',
    });

    expect(typeof handler).toBe('function');
  });

  it('should integrate with Hono app', async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    router.on('payment_intent.succeeded', handler);

    const app = new Hono();
    app.post('/webhook', honoAdapter(router, {
      webhookSecret: 'whsec_test',
      skipVerification: true,
    }));

    const body = JSON.stringify({
      id: 'evt_123',
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_123' } },
    });

    const req = new Request('http://localhost/webhook', {
      method: 'POST',
      body,
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'test_signature',
      },
    });

    const res = await app.request(req);

    expect(handler).toHaveBeenCalledOnce();
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json).toEqual({ received: true });
  });

  it('should return 400 when body is missing', async () => {
    const app = new Hono();
    app.post('/webhook', honoAdapter(router, {
      webhookSecret: 'whsec_test',
      skipVerification: true,
    }));

    const req = new Request('http://localhost/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const res = await app.request(req);
    expect(res.status).toBe(400);
  });

  it('should return 400 when signature is missing', async () => {
    const app = new Hono();
    app.post('/webhook', honoAdapter(router, {
      webhookSecret: 'whsec_test',
    }));

    const req = new Request('http://localhost/webhook', {
      method: 'POST',
      body: JSON.stringify({ id: 'evt_123', type: 'test', data: {} }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const res = await app.request(req);
    expect(res.status).toBe(400);
  });
});
