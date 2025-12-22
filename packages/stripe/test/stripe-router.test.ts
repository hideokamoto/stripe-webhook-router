import { describe, it, expect, vi } from 'vitest';
import { StripeWebhookRouter, StripeEventMap, createStripeVerifier } from '../src/index.js';
import type Stripe from 'stripe';

describe('StripeWebhookRouter', () => {
  it('should create an instance with Stripe type safety', () => {
    const router = new StripeWebhookRouter();
    expect(router).toBeInstanceOf(StripeWebhookRouter);
  });

  it('should allow registering handlers for Stripe events', () => {
    const router = new StripeWebhookRouter();

    // This tests type safety - if the event name is invalid, it would be a compile error
    router.on('payment_intent.succeeded', async (event) => {
      // Type inference should work here
      expect(event.type).toBe('payment_intent.succeeded');
    });
  });

  it('should export StripeEventMap type', () => {
    // This is a type-level test - verifying the type is exported
    type TestEventType = StripeEventMap['payment_intent.succeeded'];
    // The type should exist if this compiles
    expect(true).toBe(true);
  });

  describe('dispatch()', () => {
    it('should dispatch events to registered handlers', async () => {
      const router = new StripeWebhookRouter();
      const handler = vi.fn().mockResolvedValue(undefined);

      router.on('payment_intent.succeeded', handler);

      const event = {
        id: 'evt_123',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_123', amount: 1000 } },
      } as unknown as Stripe.PaymentIntentSucceededEvent;

      await router.dispatch(event);

      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith(event);
    });

    it('should not call handlers for non-matching Stripe events', async () => {
      const router = new StripeWebhookRouter();
      const handler = vi.fn().mockResolvedValue(undefined);

      router.on('payment_intent.succeeded', handler);

      const event = {
        id: 'evt_456',
        type: 'payment_intent.canceled',
        data: { object: { id: 'pi_456' } },
      } as unknown as Stripe.PaymentIntentCanceledEvent;

      await router.dispatch(event);

      expect(handler).not.toHaveBeenCalled();
    });

    it('should call multiple handlers for the same event type in order', async () => {
      const router = new StripeWebhookRouter();
      const order: number[] = [];

      const handler1 = vi.fn(async () => { order.push(1); });
      const handler2 = vi.fn(async () => { order.push(2); });

      router.on('customer.created', handler1);
      router.on('customer.created', handler2);

      const event = {
        id: 'evt_789',
        type: 'customer.created',
        data: { object: { id: 'cus_123' } },
      } as unknown as Stripe.CustomerCreatedEvent;

      await router.dispatch(event);

      expect(handler1).toHaveBeenCalledOnce();
      expect(handler2).toHaveBeenCalledOnce();
      expect(order).toEqual([1, 2]);
    });
  });

  describe('on() with array syntax', () => {
    it('should register handler for multiple Stripe event types', async () => {
      const router = new StripeWebhookRouter();
      const handler = vi.fn().mockResolvedValue(undefined);

      router.on(['invoice.paid', 'invoice.payment_failed'], handler);

      const paidEvent = {
        id: 'evt_1',
        type: 'invoice.paid',
        data: { object: { id: 'inv_1' } },
      } as unknown as Stripe.InvoicePaidEvent;

      const failedEvent = {
        id: 'evt_2',
        type: 'invoice.payment_failed',
        data: { object: { id: 'inv_2' } },
      } as unknown as Stripe.InvoicePaymentFailedEvent;

      await router.dispatch(paidEvent);
      expect(handler).toHaveBeenCalledTimes(1);

      await router.dispatch(failedEvent);
      expect(handler).toHaveBeenCalledTimes(2);
    });
  });

  describe('chaining', () => {
    it('should support method chaining with on()', () => {
      const router = new StripeWebhookRouter();
      const handler = vi.fn();

      const result = router
        .on('payment_intent.succeeded', handler)
        .on('payment_intent.canceled', handler)
        .on('customer.created', handler);

      expect(result).toBe(router);
    });

    it('should support method chaining with use()', () => {
      const router = new StripeWebhookRouter();
      const middleware = vi.fn(async (_event, next) => { await next(); });
      const handler = vi.fn();

      const result = router
        .use(middleware)
        .on('payment_intent.succeeded', handler);

      expect(result).toBe(router);
    });
  });

  describe('group()', () => {
    it('should register handlers with prefixed Stripe event types', async () => {
      const router = new StripeWebhookRouter();
      const handler = vi.fn().mockResolvedValue(undefined);

      router.group('customer.subscription', (group) => {
        group.on('created', handler);
      });

      const event = {
        id: 'evt_sub_1',
        type: 'customer.subscription.created',
        data: { object: { id: 'sub_123' } },
      } as unknown as Stripe.CustomerSubscriptionCreatedEvent;

      await router.dispatch(event);

      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith(event);
    });

    it('should handle multiple events in a group', async () => {
      const router = new StripeWebhookRouter();
      const createdHandler = vi.fn().mockResolvedValue(undefined);
      const deletedHandler = vi.fn().mockResolvedValue(undefined);

      router.group('customer.subscription', (group) => {
        group.on('created', createdHandler);
        group.on('deleted', deletedHandler);
      });

      await router.dispatch({
        id: 'evt_1',
        type: 'customer.subscription.created',
        data: { object: { id: 'sub_1' } },
      } as unknown as Stripe.CustomerSubscriptionCreatedEvent);

      await router.dispatch({
        id: 'evt_2',
        type: 'customer.subscription.deleted',
        data: { object: { id: 'sub_2' } },
      } as unknown as Stripe.CustomerSubscriptionDeletedEvent);

      expect(createdHandler).toHaveBeenCalledOnce();
      expect(deletedHandler).toHaveBeenCalledOnce();
    });
  });

  describe('middleware', () => {
    it('should execute middleware before Stripe event handlers', async () => {
      const router = new StripeWebhookRouter();
      const order: string[] = [];

      const middleware = vi.fn(async (_event, next) => {
        order.push('middleware-before');
        await next();
        order.push('middleware-after');
      });

      const handler = vi.fn(async () => {
        order.push('handler');
      });

      router.use(middleware);
      router.on('charge.succeeded', handler);

      const event = {
        id: 'evt_charge',
        type: 'charge.succeeded',
        data: { object: { id: 'ch_123', amount: 5000 } },
      } as unknown as Stripe.ChargeSucceededEvent;

      await router.dispatch(event);

      expect(order).toEqual(['middleware-before', 'handler', 'middleware-after']);
    });

    it('should allow middleware to short-circuit dispatch', async () => {
      const router = new StripeWebhookRouter();
      const handler = vi.fn();

      router.use(async (_event, _next) => {
        // Intentionally not calling next() - short-circuit
      });
      router.on('charge.succeeded', handler);

      const event = {
        id: 'evt_charge',
        type: 'charge.succeeded',
        data: { object: { id: 'ch_123' } },
      } as unknown as Stripe.ChargeSucceededEvent;

      await router.dispatch(event);

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('fanout()', () => {
    it('should execute multiple handlers in parallel for Stripe events', async () => {
      const router = new StripeWebhookRouter();
      const handler1 = vi.fn().mockResolvedValue(undefined);
      const handler2 = vi.fn().mockResolvedValue(undefined);
      const handler3 = vi.fn().mockResolvedValue(undefined);

      router.fanout('checkout.session.completed', [handler1, handler2, handler3]);

      const event = {
        id: 'evt_cs',
        type: 'checkout.session.completed',
        data: { object: { id: 'cs_123' } },
      } as unknown as Stripe.CheckoutSessionCompletedEvent;

      await router.dispatch(event);

      expect(handler1).toHaveBeenCalledOnce();
      expect(handler2).toHaveBeenCalledOnce();
      expect(handler3).toHaveBeenCalledOnce();
    });

    it('should handle errors with best-effort strategy', async () => {
      const router = new StripeWebhookRouter();
      const errors: Error[] = [];

      const handler1 = vi.fn().mockResolvedValue(undefined);
      const handler2 = vi.fn().mockRejectedValue(new Error('Handler 2 failed'));
      const handler3 = vi.fn().mockResolvedValue(undefined);

      router.fanout('refund.created', [handler1, handler2, handler3], {
        strategy: 'best-effort',
        onError: (error) => errors.push(error),
      });

      const event = {
        id: 'evt_refund',
        type: 'refund.created',
        data: { object: { id: 're_123' } },
      } as unknown as Stripe.RefundCreatedEvent;

      await router.dispatch(event);

      expect(handler1).toHaveBeenCalledOnce();
      expect(handler2).toHaveBeenCalledOnce();
      expect(handler3).toHaveBeenCalledOnce();
      expect(errors).toHaveLength(1);
      expect(errors[0]?.message).toBe('Handler 2 failed');
    });
  });

  describe('error handling', () => {
    it('should propagate handler errors', async () => {
      const router = new StripeWebhookRouter();
      const errorMessage = 'Handler processing failed';

      router.on('payment_intent.succeeded', async () => {
        throw new Error(errorMessage);
      });

      const event = {
        id: 'evt_err',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_err' } },
      } as unknown as Stripe.PaymentIntentSucceededEvent;

      await expect(router.dispatch(event)).rejects.toThrow(errorMessage);
    });

    it('should propagate middleware errors', async () => {
      const router = new StripeWebhookRouter();
      const errorMessage = 'Middleware failed';

      router.use(async () => {
        throw new Error(errorMessage);
      });
      router.on('payment_intent.succeeded', vi.fn());

      const event = {
        id: 'evt_err',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_err' } },
      } as unknown as Stripe.PaymentIntentSucceededEvent;

      await expect(router.dispatch(event)).rejects.toThrow(errorMessage);
    });
  });
});

describe('createStripeVerifier', () => {
  const testEvent = {
    id: 'evt_123',
    type: 'payment_intent.succeeded',
    data: { object: { id: 'pi_123' } },
  };

  it('should create a verifier function', () => {
    const mockStripe = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(testEvent),
      },
    } as unknown as Stripe;

    const verifier = createStripeVerifier(mockStripe, 'whsec_test');
    expect(typeof verifier).toBe('function');
  });

  it('should call stripe.webhooks.constructEvent with correct params', () => {
    const mockStripe = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(testEvent),
      },
    } as unknown as Stripe;

    const verifier = createStripeVerifier(mockStripe, 'whsec_test');
    const payload = JSON.stringify(testEvent);
    const headers = { 'stripe-signature': 'test_sig' };

    const result = verifier(payload, headers);

    expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
      payload,
      'test_sig',
      'whsec_test'
    );
    expect(result.event).toBe(testEvent);
  });

  it('should work with Buffer payload', () => {
    const mockStripe = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(testEvent),
      },
    } as unknown as Stripe;

    const verifier = createStripeVerifier(mockStripe, 'whsec_test');
    const payload = Buffer.from(JSON.stringify(testEvent));
    const headers = { 'stripe-signature': 'test_sig' };

    const result = verifier(payload, headers);

    expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
      payload,
      'test_sig',
      'whsec_test'
    );
    expect(result.event).toBe(testEvent);
  });

  it('should throw when stripe-signature header is missing', () => {
    const mockStripe = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(testEvent),
      },
    } as unknown as Stripe;

    const verifier = createStripeVerifier(mockStripe, 'whsec_test');

    expect(() => verifier('{}', {})).toThrow('Missing stripe-signature header');
    expect(() => verifier('{}', { 'stripe-signature': undefined })).toThrow(
      'Missing stripe-signature header'
    );
  });

  it('should propagate errors from constructEvent', () => {
    const mockStripe = {
      webhooks: {
        constructEvent: vi.fn().mockImplementation(() => {
          throw new Error('Invalid signature');
        }),
      },
    } as unknown as Stripe;

    const verifier = createStripeVerifier(mockStripe, 'whsec_test');
    const headers = { 'stripe-signature': 'invalid_sig' };

    expect(() => verifier('{}', headers)).toThrow('Invalid signature');
  });

  describe('edge cases', () => {
    it('should handle empty string payload', () => {
      const mockStripe = {
        webhooks: {
          constructEvent: vi.fn().mockReturnValue(testEvent),
        },
      } as unknown as Stripe;

      const verifier = createStripeVerifier(mockStripe, 'whsec_test');
      const headers = { 'stripe-signature': 'test_sig' };

      const result = verifier('', headers);

      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
        '',
        'test_sig',
        'whsec_test'
      );
      expect(result.event).toBe(testEvent);
    });

    it('should treat empty string signature as missing', () => {
      const mockStripe = {
        webhooks: {
          constructEvent: vi.fn().mockReturnValue(testEvent),
        },
      } as unknown as Stripe;

      const verifier = createStripeVerifier(mockStripe, 'whsec_test');
      // Empty string is falsy, so it's treated as missing signature
      const headers = { 'stripe-signature': '' };

      // Empty signature is treated as missing
      expect(() => verifier('{}', headers)).toThrow('Missing stripe-signature header');
      // constructEvent should not be called
      expect(mockStripe.webhooks.constructEvent).not.toHaveBeenCalled();
    });

    it('should handle signature with whitespace', () => {
      const mockStripe = {
        webhooks: {
          constructEvent: vi.fn().mockReturnValue(testEvent),
        },
      } as unknown as Stripe;

      const verifier = createStripeVerifier(mockStripe, 'whsec_test');
      const headers = { 'stripe-signature': '  t=123,v1=abc  ' };

      verifier('{}', headers);

      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
        '{}',
        '  t=123,v1=abc  ',
        'whsec_test'
      );
    });

    it('should return VerifyResult with correct event type', () => {
      const typedEvent: Stripe.PaymentIntentSucceededEvent = {
        id: 'evt_typed',
        type: 'payment_intent.succeeded',
        object: 'event',
        api_version: '2023-10-16',
        created: 1234567890,
        livemode: false,
        pending_webhooks: 0,
        request: { id: null, idempotency_key: null },
        data: { object: { id: 'pi_typed' } as unknown as Stripe.PaymentIntent },
      };

      const mockStripe = {
        webhooks: {
          constructEvent: vi.fn().mockReturnValue(typedEvent),
        },
      } as unknown as Stripe;

      const verifier = createStripeVerifier(mockStripe, 'whsec_test');
      const headers = { 'stripe-signature': 'test_sig' };

      const result = verifier('{}', headers);

      expect(result.event).toBe(typedEvent);
      expect(result.event.type).toBe('payment_intent.succeeded');
    });

    it('should handle Stripe webhook secret with special characters', () => {
      const mockStripe = {
        webhooks: {
          constructEvent: vi.fn().mockReturnValue(testEvent),
        },
      } as unknown as Stripe;

      const specialSecret = 'whsec_test+special/chars=123';
      const verifier = createStripeVerifier(mockStripe, specialSecret);
      const headers = { 'stripe-signature': 'test_sig' };

      verifier('{}', headers);

      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
        '{}',
        'test_sig',
        specialSecret
      );
    });

    it('should handle large payload', () => {
      const mockStripe = {
        webhooks: {
          constructEvent: vi.fn().mockReturnValue(testEvent),
        },
      } as unknown as Stripe;

      const verifier = createStripeVerifier(mockStripe, 'whsec_test');
      const largePayload = JSON.stringify({ data: 'x'.repeat(10000) });
      const headers = { 'stripe-signature': 'test_sig' };

      const result = verifier(largePayload, headers);

      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
        largePayload,
        'test_sig',
        'whsec_test'
      );
      expect(result.event).toBe(testEvent);
    });

    it('should handle JSON payload with unicode characters', () => {
      const mockStripe = {
        webhooks: {
          constructEvent: vi.fn().mockReturnValue(testEvent),
        },
      } as unknown as Stripe;

      const verifier = createStripeVerifier(mockStripe, 'whsec_test');
      const unicodePayload = JSON.stringify({ name: '日本語テスト 🎉' });
      const headers = { 'stripe-signature': 'test_sig' };

      const result = verifier(unicodePayload, headers);

      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
        unicodePayload,
        'test_sig',
        'whsec_test'
      );
      expect(result.event).toBe(testEvent);
    });

    it('should handle additional headers without affecting verification', () => {
      const mockStripe = {
        webhooks: {
          constructEvent: vi.fn().mockReturnValue(testEvent),
        },
      } as unknown as Stripe;

      const verifier = createStripeVerifier(mockStripe, 'whsec_test');
      const headers = {
        'stripe-signature': 'test_sig',
        'content-type': 'application/json',
        'x-custom-header': 'custom-value',
      };

      const result = verifier('{}', headers);

      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
        '{}',
        'test_sig',
        'whsec_test'
      );
      expect(result.event).toBe(testEvent);
    });
  });
});
