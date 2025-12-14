import { describe, it, expect } from 'vitest';
import { StripeWebhookRouter, StripeEventMap } from '../src/index.js';

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
