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
});
