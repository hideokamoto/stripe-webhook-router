import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { honoAdapter } from '../src/index.js';
import { WebhookRouter, type Verifier, type WebhookEvent } from '@tayori/core';

describe('honoAdapter', () => {
  let router: WebhookRouter;
  let mockVerifier: Verifier<WebhookEvent>;

  const testEvent = {
    id: 'evt_123',
    type: 'payment_intent.succeeded',
    data: { object: { id: 'pi_123' } },
  };

  beforeEach(() => {
    router = new WebhookRouter();

    // Create mock verifier
    mockVerifier = vi.fn().mockReturnValue({ event: testEvent });
  });

  it('should return a Hono handler function', () => {
    const handler = honoAdapter(router, {
      verifier: mockVerifier,
    });

    expect(typeof handler).toBe('function');
  });

  it('should integrate with Hono app', async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    router.on('payment_intent.succeeded', handler);

    const app = new Hono();
    app.post('/webhook', honoAdapter(router, {
      verifier: mockVerifier,
    }));

    const body = JSON.stringify(testEvent);

    const req = new Request('http://localhost/webhook', {
      method: 'POST',
      body,
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'test_signature',
      },
    });

    const res = await app.request(req);

    expect(mockVerifier).toHaveBeenCalledWith(
      body,
      expect.objectContaining({
        'content-type': 'application/json',
        'stripe-signature': 'test_signature',
      })
    );
    expect(handler).toHaveBeenCalledOnce();
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json).toEqual({ received: true });
  });

  it('should return 400 when body is missing', async () => {
    const app = new Hono();
    app.post('/webhook', honoAdapter(router, {
      verifier: mockVerifier,
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

  it('should return 400 when verifier throws', async () => {
    (mockVerifier as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('Invalid signature');
    });

    const app = new Hono();
    app.post('/webhook', honoAdapter(router, {
      verifier: mockVerifier,
    }));

    const req = new Request('http://localhost/webhook', {
      method: 'POST',
      body: JSON.stringify(testEvent),
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'invalid_signature',
      },
    });

    const res = await app.request(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json).toEqual({ error: 'Invalid signature' });
  });

  it('should return 500 when handler throws', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('Handler error'));
    router.on('payment_intent.succeeded', handler);

    const app = new Hono();
    app.post('/webhook', honoAdapter(router, {
      verifier: mockVerifier,
    }));

    const req = new Request('http://localhost/webhook', {
      method: 'POST',
      body: JSON.stringify(testEvent),
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'test_signature',
      },
    });

    const res = await app.request(req);
    expect(res.status).toBe(500);
  });

  it('should call onError handler when dispatch fails', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('Handler error'));
    const onError = vi.fn();
    router.on('payment_intent.succeeded', handler);

    const app = new Hono();
    app.post('/webhook', honoAdapter(router, {
      verifier: mockVerifier,
      onError,
    }));

    const req = new Request('http://localhost/webhook', {
      method: 'POST',
      body: JSON.stringify(testEvent),
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'test_signature',
      },
    });

    await app.request(req);

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ type: 'payment_intent.succeeded' })
    );
  });

  it('should handle async onError handler', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('Handler error'));
    const onError = vi.fn().mockResolvedValue(undefined);
    router.on('payment_intent.succeeded', handler);

    const app = new Hono();
    app.post('/webhook', honoAdapter(router, {
      verifier: mockVerifier,
      onError,
    }));

    const req = new Request('http://localhost/webhook', {
      method: 'POST',
      body: JSON.stringify(testEvent),
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'test_signature',
      },
    });

    const res = await app.request(req);

    expect(onError).toHaveBeenCalled();
    expect(res.status).toBe(500);
  });

  it('should not crash if onError throws', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('Handler error'));
    const onError = vi.fn().mockRejectedValue(new Error('onError failed'));
    router.on('payment_intent.succeeded', handler);

    const app = new Hono();
    app.post('/webhook', honoAdapter(router, {
      verifier: mockVerifier,
      onError,
    }));

    const req = new Request('http://localhost/webhook', {
      method: 'POST',
      body: JSON.stringify(testEvent),
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'test_signature',
      },
    });

    const res = await app.request(req);

    expect(onError).toHaveBeenCalled();
    expect(res.status).toBe(500);
  });
});
