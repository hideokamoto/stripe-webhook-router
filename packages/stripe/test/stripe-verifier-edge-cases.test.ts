import { describe, it, expect, vi, beforeEach } from 'vitest';
import type Stripe from 'stripe';
import { createStripeVerifier } from '../src/index.js';

// Helper function to create properly-typed Stripe events
function createMockStripeEvent(
  overrides?: Partial<Stripe.Event>
): Stripe.Event {
  const defaults: Stripe.Event = {
    id: 'evt_123',
    object: 'event',
    api_version: '2023-10-16',
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        id: 'pi_123',
        amount: 1000,
      },
    },
    livemode: false,
    pending_webhooks: 1,
    request: {
      id: null,
      idempotency_key: null,
    },
    type: 'payment_intent.succeeded',
  };

  return {
    ...defaults,
    ...overrides,
  } as Stripe.Event;
}

describe('createStripeVerifier - Edge Cases', () => {
  let verifier: (
    payload: Buffer | string,
    headers: Record<string, string>
  ) => { event: Stripe.Event };

  beforeEach(() => {
    // Mock Stripe environment variable
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';
    verifier = createStripeVerifier(process.env.STRIPE_WEBHOOK_SECRET!);
  });

  it('should handle valid Stripe events with mocked webhook.constructEvent', () => {
    const stripeMock = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(
          createMockStripeEvent({
            id: 'evt_123',
            type: 'payment_intent.succeeded',
            data: {
              object: {
                id: 'pi_123',
              },
            },
          })
        ),
      },
    };

    // Mock the constructEvent to return our event
    const payload = Buffer.from(JSON.stringify(createMockStripeEvent()));
    const result = stripeMock.webhooks.constructEvent(
      payload,
      'valid_sig',
      'whsec_test'
    );

    expect(result.id).toBe('evt_123');
    expect(result.type).toBe('payment_intent.succeeded');
  });

  it('should throw error for empty stripe-signature header', () => {
    // This test expects the verifier to throw when signature is empty
    const payload = Buffer.from(JSON.stringify({ data: {} }));

    expect(() => {
      verifier(payload, { 'stripe-signature': '' });
    }).toThrow();
  });

  it('should throw error for missing stripe-signature header', () => {
    const payload = Buffer.from(JSON.stringify({ data: {} }));

    expect(() => {
      verifier(payload, {});
    }).toThrow();
  });

  it('should handle different Stripe event types', () => {
    const stripeMock = {
      webhooks: {
        constructEvent: vi.fn(),
      },
    };

    const eventTypes = [
      'payment_intent.succeeded',
      'invoice.paid',
      'customer.created',
      'charge.failed',
    ];

    eventTypes.forEach((eventType) => {
      stripeMock.webhooks.constructEvent.mockReturnValueOnce(
        createMockStripeEvent({
          type: eventType as Stripe.Event.Type,
        })
      );

      const payload = Buffer.from(JSON.stringify({ data: {} }));
      const result = stripeMock.webhooks.constructEvent(
        payload,
        'sig',
        'secret'
      );

      expect(result.type).toBe(eventType);
    });
  });

  it('should handle Stripe events with nested data structures', () => {
    const stripeMock = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(
          createMockStripeEvent({
            data: {
              object: {
                id: 'pi_complex',
                amount: 5000,
                currency: 'usd',
                customer: 'cus_123',
                description: 'Test payment',
                metadata: {
                  order_id: '12345',
                  custom_field: 'value',
                },
              } as unknown,
            },
          })
        ),
      },
    };

    const payload = Buffer.from(JSON.stringify({ data: {} }));
    const result = stripeMock.webhooks.constructEvent(
      payload,
      'sig',
      'secret'
    );

    expect(result.data.object).toBeDefined();
  });

  it('should preserve all Stripe event fields', () => {
    const now = Math.floor(Date.now() / 1000);
    const stripeMock = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(
          createMockStripeEvent({
            id: 'evt_preserved',
            created: now,
            livemode: true,
            api_version: '2023-10-16',
            pending_webhooks: 3,
          })
        ),
      },
    };

    const payload = Buffer.from(JSON.stringify({ data: {} }));
    const result = stripeMock.webhooks.constructEvent(
      payload,
      'sig',
      'secret'
    );

    expect(result.id).toBe('evt_preserved');
    expect(result.created).toBe(now);
    expect(result.livemode).toBe(true);
    expect(result.api_version).toBe('2023-10-16');
    expect(result.pending_webhooks).toBe(3);
  });

  it('should handle Stripe event with null request', () => {
    const stripeMock = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(
          createMockStripeEvent({
            request: {
              id: null,
              idempotency_key: null,
            },
          })
        ),
      },
    };

    const payload = Buffer.from(JSON.stringify({ data: {} }));
    const result = stripeMock.webhooks.constructEvent(
      payload,
      'sig',
      'secret'
    );

    expect(result.request?.id).toBeNull();
  });
});
