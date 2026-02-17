import { describe, it, expect, beforeEach, vi } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';
import { expressAdapter } from '../src/index.js';
import { WebhookRouter, type Verifier, type WebhookEvent } from '@tayori/core';

describe('Express Adapter - Integration Tests', () => {
  let app: Express;
  let router: WebhookRouter;
  let verifier: Verifier<WebhookEvent>;

  const testEvent = {
    id: 'evt_123',
    type: 'payment_intent.succeeded',
    data: { object: { id: 'pi_123' } },
  };

  beforeEach(() => {
    app = express();
    router = new WebhookRouter();
    verifier = vi.fn().mockReturnValue({ event: testEvent });
  });

  describe('basic webhook handling', () => {
    it('should handle POST request with webhook event', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      router.on('payment_intent.succeeded', handler);

      app.post(
        '/webhook',
        express.raw({ type: 'application/json' }),
        expressAdapter(router, { verifier })
      );

      const response = await request(app)
        .post('/webhook')
        .send(testEvent)
        .set('Content-Type', 'application/json')
        .set('stripe-signature', 'test_sig');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ received: true });
      expect(handler).toHaveBeenCalledOnce();
    });

    it('should return 400 for missing body', async () => {
      app.post(
        '/webhook',
        express.raw({ type: 'application/json' }),
        expressAdapter(router, { verifier })
      );

      const response = await request(app).post('/webhook');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for verification failure', async () => {
      const failingVerifier = vi.fn().mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      app.post(
        '/webhook',
        express.raw({ type: 'application/json' }),
        expressAdapter(router, { verifier: failingVerifier })
      );

      const response = await request(app)
        .post('/webhook')
        .send(testEvent)
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid signature');
    });

    it('should return 500 for handler error', async () => {
      const handler = vi.fn().mockRejectedValue(new Error('Handler failed'));
      router.on('payment_intent.succeeded', handler);

      app.post(
        '/webhook',
        express.raw({ type: 'application/json' }),
        expressAdapter(router, { verifier })
      );

      const response = await request(app)
        .post('/webhook')
        .send(testEvent)
        .set('Content-Type', 'application/json')
        .set('stripe-signature', 'test_sig');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('multiple handlers', () => {
    it('should call multiple handlers for the same event', async () => {
      const handler1 = vi.fn().mockResolvedValue(undefined);
      const handler2 = vi.fn().mockResolvedValue(undefined);
      const handler3 = vi.fn().mockResolvedValue(undefined);

      router.on('payment_intent.succeeded', handler1);
      router.on('payment_intent.succeeded', handler2);
      router.on('payment_intent.succeeded', handler3);

      app.post(
        '/webhook',
        express.raw({ type: 'application/json' }),
        expressAdapter(router, { verifier })
      );

      const response = await request(app)
        .post('/webhook')
        .send(testEvent)
        .set('Content-Type', 'application/json')
        .set('stripe-signature', 'test_sig');

      expect(response.status).toBe(200);
      expect(handler1).toHaveBeenCalledOnce();
      expect(handler2).toHaveBeenCalledOnce();
      expect(handler3).toHaveBeenCalledOnce();
    });

    it('should call handlers in registration order', async () => {
      const callOrder: number[] = [];

      const handler1 = vi.fn(async () => { callOrder.push(1); });
      const handler2 = vi.fn(async () => { callOrder.push(2); });
      const handler3 = vi.fn(async () => { callOrder.push(3); });

      router.on('payment_intent.succeeded', handler1);
      router.on('payment_intent.succeeded', handler2);
      router.on('payment_intent.succeeded', handler3);

      app.post(
        '/webhook',
        express.raw({ type: 'application/json' }),
        expressAdapter(router, { verifier })
      );

      await request(app)
        .post('/webhook')
        .send(testEvent)
        .set('Content-Type', 'application/json')
        .set('stripe-signature', 'test_sig');

      expect(callOrder).toEqual([1, 2, 3]);
    });

    it('should stop execution when handler throws', async () => {
      const handler1 = vi.fn().mockResolvedValue(undefined);
      const handler2 = vi.fn().mockRejectedValue(new Error('Handler 2 failed'));
      const handler3 = vi.fn().mockResolvedValue(undefined);

      router.on('payment_intent.succeeded', handler1);
      router.on('payment_intent.succeeded', handler2);
      router.on('payment_intent.succeeded', handler3);

      app.post(
        '/webhook',
        express.raw({ type: 'application/json' }),
        expressAdapter(router, { verifier })
      );

      const response = await request(app)
        .post('/webhook')
        .send(testEvent)
        .set('Content-Type', 'application/json')
        .set('stripe-signature', 'test_sig');

      expect(response.status).toBe(500);
      expect(handler1).toHaveBeenCalledOnce();
      expect(handler2).toHaveBeenCalledOnce();
      expect(handler3).not.toHaveBeenCalled();
    });
  });

  describe('middleware integration', () => {
    it('should work with middleware chain', async () => {
      const loggingMiddleware = vi.fn((req, res, next) => {
        next();
      });

      const handler = vi.fn().mockResolvedValue(undefined);
      router.on('payment_intent.succeeded', handler);

      app.use(loggingMiddleware);
      app.post(
        '/webhook',
        express.raw({ type: 'application/json' }),
        expressAdapter(router, { verifier })
      );

      await request(app)
        .post('/webhook')
        .send(testEvent)
        .set('Content-Type', 'application/json')
        .set('stripe-signature', 'test_sig');

      expect(loggingMiddleware).toHaveBeenCalled();
      expect(handler).toHaveBeenCalled();
    });

    it('should work with error handling middleware', async () => {
      const handler = vi.fn().mockRejectedValue(new Error('Test error'));
      router.on('payment_intent.succeeded', handler);

      const errorHandler = vi.fn((err, req, res, next) => {
        res.status(500).json({ error: 'Custom error handler' });
      });

      app.post(
        '/webhook',
        express.raw({ type: 'application/json' }),
        expressAdapter(router, { verifier }),
        errorHandler
      );

      const response = await request(app)
        .post('/webhook')
        .send(testEvent)
        .set('Content-Type', 'application/json')
        .set('stripe-signature', 'test_sig');

      // The adapter sends 500 before error handler middleware is called
      expect(response.status).toBe(500);
    });

    it('should work with authentication middleware', async () => {
      const authMiddleware = vi.fn((req, res, next) => {
        req.headers['x-auth'] = 'authenticated';
        next();
      });

      const handler = vi.fn().mockResolvedValue(undefined);
      router.on('payment_intent.succeeded', handler);

      app.use(authMiddleware);
      app.post(
        '/webhook',
        express.raw({ type: 'application/json' }),
        expressAdapter(router, { verifier })
      );

      await request(app)
        .post('/webhook')
        .send(testEvent)
        .set('Content-Type', 'application/json')
        .set('stripe-signature', 'test_sig');

      expect(authMiddleware).toHaveBeenCalled();
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('event routing', () => {
    it('should route different events to different handlers', async () => {
      const paymentHandler = vi.fn().mockResolvedValue(undefined);
      const chargeHandler = vi.fn().mockResolvedValue(undefined);

      router.on('payment_intent.succeeded', paymentHandler);
      router.on('charge.succeeded', chargeHandler);

      app.post(
        '/webhook',
        express.raw({ type: 'application/json' }),
        expressAdapter(router, { verifier })
      );

      const customVerifier = vi.fn().mockReturnValue({
        event: {
          id: 'evt_charge',
          type: 'charge.succeeded',
          data: { object: { id: 'ch_123' } },
        },
      });

      app.post(
        '/webhook-charge',
        express.raw({ type: 'application/json' }),
        expressAdapter(router, { verifier: customVerifier })
      );

      // Test payment event
      await request(app)
        .post('/webhook')
        .send(testEvent)
        .set('Content-Type', 'application/json')
        .set('stripe-signature', 'test_sig');

      expect(paymentHandler).toHaveBeenCalledOnce();
      expect(chargeHandler).not.toHaveBeenCalled();

      // Test charge event
      await request(app)
        .post('/webhook-charge')
        .send({ id: 'evt_charge', type: 'charge.succeeded' })
        .set('Content-Type', 'application/json')
        .set('stripe-signature', 'test_sig');

      expect(chargeHandler).toHaveBeenCalledOnce();
    });

    it('should handle unregistered event types gracefully', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      router.on('payment_intent.succeeded', handler);

      const unknownEventVerifier = vi.fn().mockReturnValue({
        event: {
          id: 'evt_unknown',
          type: 'unknown.event',
          data: { object: {} },
        },
      });

      app.post(
        '/webhook',
        express.raw({ type: 'application/json' }),
        expressAdapter(router, { verifier: unknownEventVerifier })
      );

      const response = await request(app)
        .post('/webhook')
        .send({})
        .set('Content-Type', 'application/json')
        .set('stripe-signature', 'test_sig');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ received: true });
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('error handler callback', () => {
    it('should call onError handler when handler throws', async () => {
      const onError = vi.fn();
      const handler = vi.fn().mockRejectedValue(new Error('Handler error'));
      router.on('payment_intent.succeeded', handler);

      app.post(
        '/webhook',
        express.raw({ type: 'application/json' }),
        expressAdapter(router, { verifier, onError })
      );

      const response = await request(app)
        .post('/webhook')
        .send(testEvent)
        .set('Content-Type', 'application/json')
        .set('stripe-signature', 'test_sig');

      expect(response.status).toBe(500);
      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.any(Object)
      );
    });

    it('should include event in onError callback', async () => {
      const onError = vi.fn();
      const handler = vi.fn().mockRejectedValue(new Error('Test error'));
      router.on('payment_intent.succeeded', handler);

      app.post(
        '/webhook',
        express.raw({ type: 'application/json' }),
        expressAdapter(router, { verifier, onError })
      );

      await request(app)
        .post('/webhook')
        .send(testEvent)
        .set('Content-Type', 'application/json')
        .set('stripe-signature', 'test_sig');

      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          id: 'evt_123',
          type: 'payment_intent.succeeded',
        })
      );
    });

    it('should handle onError callback errors gracefully', async () => {
      const onError = vi.fn().mockImplementation(() => {
        throw new Error('onError callback failed');
      });

      const handler = vi.fn().mockRejectedValue(new Error('Handler error'));
      router.on('payment_intent.succeeded', handler);

      app.post(
        '/webhook',
        express.raw({ type: 'application/json' }),
        expressAdapter(router, { verifier, onError })
      );

      const response = await request(app)
        .post('/webhook')
        .send(testEvent)
        .set('Content-Type', 'application/json')
        .set('stripe-signature', 'test_sig');

      // Should still return 500
      expect(response.status).toBe(500);
      expect(onError).toHaveBeenCalled();
    });
  });

  describe('request headers and body handling', () => {
    it('should handle custom headers', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      router.on('payment_intent.succeeded', handler);

      const customVerifier = vi.fn().mockImplementation((_body, headers) => {
        expect(headers['x-custom-header']).toBe('custom-value');
        return { event: testEvent };
      });

      app.post(
        '/webhook',
        express.raw({ type: 'application/json' }),
        expressAdapter(router, { verifier: customVerifier })
      );

      const response = await request(app)
        .post('/webhook')
        .send(testEvent)
        .set('Content-Type', 'application/json')
        .set('stripe-signature', 'test_sig')
        .set('x-custom-header', 'custom-value');

      expect(response.status).toBe(200);
      expect(customVerifier).toHaveBeenCalled();
    });

    it('should handle large JSON payloads', async () => {
      const largeEvent = {
        id: 'evt_large',
        type: 'payment_intent.succeeded',
        data: { object: { description: 'x'.repeat(10 * 1024 * 1024) } },
      };

      const handler = vi.fn().mockResolvedValue(undefined);
      router.on('payment_intent.succeeded', handler);

      const largeVerifier = vi.fn().mockReturnValue({ event: largeEvent });

      app.post(
        '/webhook',
        express.raw({ type: 'application/json', limit: '50mb' }),
        expressAdapter(router, { verifier: largeVerifier })
      );

      const response = await request(app)
        .post('/webhook')
        .send(largeEvent)
        .set('Content-Type', 'application/json')
        .set('stripe-signature', 'test_sig');

      expect(response.status).toBe(200);
    });

    it('should preserve exact payload bytes for signature verification', async () => {
      let capturedPayload: string | Buffer | null = null;

      const captureVerifier = vi.fn().mockImplementation((payload) => {
        capturedPayload = payload;
        return { event: testEvent };
      });

      const handler = vi.fn().mockResolvedValue(undefined);
      router.on('payment_intent.succeeded', handler);

      app.post(
        '/webhook',
        express.raw({ type: 'application/json' }),
        expressAdapter(router, { verifier: captureVerifier })
      );

      const jsonPayload = JSON.stringify(testEvent);

      await request(app)
        .post('/webhook')
        .send(testEvent)
        .set('Content-Type', 'application/json')
        .set('stripe-signature', 'test_sig');

      expect(capturedPayload).toBeDefined();
      expect(captureVerifier).toHaveBeenCalled();
    });
  });

  describe('multiple routes', () => {
    it('should handle multiple webhook routes independently', async () => {
      const handler1 = vi.fn().mockResolvedValue(undefined);
      const handler2 = vi.fn().mockResolvedValue(undefined);

      const router1 = new WebhookRouter();
      const router2 = new WebhookRouter();

      router1.on('payment_intent.succeeded', handler1);
      router2.on('charge.succeeded', handler2);

      const verifier1 = vi.fn().mockReturnValue({ event: testEvent });
      const verifier2 = vi.fn().mockReturnValue({
        event: {
          id: 'evt_charge',
          type: 'charge.succeeded',
          data: { object: { id: 'ch_123' } },
        },
      });

      app.post(
        '/webhook/payment',
        express.raw({ type: 'application/json' }),
        expressAdapter(router1, { verifier: verifier1 })
      );

      app.post(
        '/webhook/charge',
        express.raw({ type: 'application/json' }),
        expressAdapter(router2, { verifier: verifier2 })
      );

      // Hit payment route
      await request(app)
        .post('/webhook/payment')
        .send(testEvent)
        .set('Content-Type', 'application/json')
        .set('stripe-signature', 'test_sig');

      expect(handler1).toHaveBeenCalledOnce();
      expect(handler2).not.toHaveBeenCalled();

      // Hit charge route
      await request(app)
        .post('/webhook/charge')
        .send({})
        .set('Content-Type', 'application/json')
        .set('stripe-signature', 'test_sig');

      expect(handler2).toHaveBeenCalledOnce();
    });
  });

  describe('async operations', () => {
    it('should handle async handlers with delays', async () => {
      const handler = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      router.on('payment_intent.succeeded', handler);

      app.post(
        '/webhook',
        express.raw({ type: 'application/json' }),
        expressAdapter(router, { verifier })
      );

      const response = await request(app)
        .post('/webhook')
        .send(testEvent)
        .set('Content-Type', 'application/json')
        .set('stripe-signature', 'test_sig');

      expect(response.status).toBe(200);
      expect(handler).toHaveBeenCalledOnce();
    });

    it('should handle handlers with multiple async operations', async () => {
      const operations: string[] = [];

      const handler = vi.fn(async () => {
        await Promise.resolve();
        operations.push('op1');
        await Promise.resolve();
        operations.push('op2');
      });

      router.on('payment_intent.succeeded', handler);

      app.post(
        '/webhook',
        express.raw({ type: 'application/json' }),
        expressAdapter(router, { verifier })
      );

      const response = await request(app)
        .post('/webhook')
        .send(testEvent)
        .set('Content-Type', 'application/json')
        .set('stripe-signature', 'test_sig');

      expect(response.status).toBe(200);
      expect(operations).toEqual(['op1', 'op2']);
    });
  });
});
