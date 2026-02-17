import { describe, it, expect, vi, beforeEach } from 'vitest';
import Stripe from 'stripe';
import { createStripeVerifier } from '../src/index.js';

describe('Stripe Verifier - Edge Cases', () => {
  let stripe: Stripe;
  let verifier: ReturnType<typeof createStripeVerifier>;
  const webhookSecret = 'whsec_test_secret_123';

  beforeEach(() => {
    stripe = new Stripe('sk_test_123', {
      apiVersion: '2024-04-10',
    });
    verifier = createStripeVerifier(stripe, webhookSecret);
  });

  describe('signature validation errors vs timestamp errors', () => {
    it('should throw specific error when signature is invalid', () => {
      const payload = JSON.stringify({ id: 'evt_123', type: 'payment_intent.succeeded' });

      const createEventSpy = vi.spyOn(stripe.webhooks, 'constructEvent').mockImplementation(() => {
        throw new Error('No signatures found matching the expected signature for payload');
      });

      expect(() => {
        verifier(payload, {
          'stripe-signature': 'invalid_signature_value',
        });
      }).toThrow('No signatures found matching the expected signature for payload');

      createEventSpy.mockRestore();
    });

    it('should throw specific error when timestamp is too old', () => {
      const payload = JSON.stringify({ id: 'evt_123', type: 'payment_intent.succeeded' });

      const createEventSpy = vi.spyOn(stripe.webhooks, 'constructEvent').mockImplementation(() => {
        throw new Error('Timestamp outside the tolerance zone');
      });

      expect(() => {
        verifier(payload, {
          'stripe-signature': 'timestamp_value.signature_value',
        });
      }).toThrow('Timestamp outside the tolerance zone');

      createEventSpy.mockRestore();
    });

    it('should distinguish between signature error and timestamp error', () => {
      const payload = JSON.stringify({ id: 'evt_123', type: 'payment_intent.succeeded' });

      let signatureError: Error | null = null;
      let timestampError: Error | null = null;

      // Mock signature error
      const sigSpy = vi.spyOn(stripe.webhooks, 'constructEvent').mockImplementation(() => {
        throw new Error('No signatures found matching the expected signature for payload');
      });

      try {
        verifier(payload, { 'stripe-signature': 'bad_sig' });
      } catch (e) {
        signatureError = e as Error;
      }

      sigSpy.mockRestore();

      // Mock timestamp error
      const timeSpy = vi.spyOn(stripe.webhooks, 'constructEvent').mockImplementation(() => {
        throw new Error('Timestamp outside the tolerance zone');
      });

      try {
        verifier(payload, { 'stripe-signature': 'old_timestamp.valid_sig' });
      } catch (e) {
        timestampError = e as Error;
      }

      timeSpy.mockRestore();

      expect(signatureError?.message).not.toBe(timestampError?.message);
      expect(signatureError?.message).toContain('signature');
      expect(timestampError?.message).toContain('Timestamp');
    });
  });

  describe('missing stripe-signature header', () => {
    it('should throw error when stripe-signature header is missing', () => {
      const payload = JSON.stringify({ id: 'evt_123', type: 'payment_intent.succeeded' });

      expect(() => {
        verifier(payload, {});
      }).toThrow('Missing stripe-signature header');
    });

    it('should throw error when stripe-signature header is undefined', () => {
      const payload = JSON.stringify({ id: 'evt_123', type: 'payment_intent.succeeded' });

      expect(() => {
        verifier(payload, {
          'stripe-signature': undefined,
        });
      }).toThrow('Missing stripe-signature header');
    });

    it('should throw error when stripe-signature header is empty string', () => {
      const payload = JSON.stringify({ id: 'evt_123', type: 'payment_intent.succeeded' });

      const createEventSpy = vi.spyOn(stripe.webhooks, 'constructEvent');

      // Empty string is provided but not exactly falsy in the check
      expect(() => {
        verifier(payload, {
          'stripe-signature': '',
        });
      }).toThrow();

      createEventSpy.mockRestore();
    });

    it('should check for stripe-signature in lowercase', () => {
      const payload = JSON.stringify({ id: 'evt_123', type: 'payment_intent.succeeded' });

      // Uppercase header key should not match
      expect(() => {
        verifier(payload, {
          'Stripe-Signature': 'valid_signature',
        });
      }).toThrow('Missing stripe-signature header');
    });

    it('should handle other headers without stripe-signature', () => {
      const payload = JSON.stringify({ id: 'evt_123', type: 'payment_intent.succeeded' });

      expect(() => {
        verifier(payload, {
          'x-custom-header': 'value',
          'content-type': 'application/json',
        });
      }).toThrow('Missing stripe-signature header');
    });
  });

  describe('payload variations', () => {
    it('should accept string payload', () => {
      const payload = JSON.stringify({ id: 'evt_123', type: 'payment_intent.succeeded' });

      const createEventSpy = vi.spyOn(stripe.webhooks, 'constructEvent').mockReturnValue({
        id: 'evt_123',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_123' } },
      } as any);

      const result = verifier(payload, {
        'stripe-signature': 'valid_sig',
      });

      expect(result.event).toBeDefined();
      expect(createEventSpy).toHaveBeenCalledWith(
        payload,
        'valid_sig',
        webhookSecret
      );

      createEventSpy.mockRestore();
    });

    it('should accept buffer payload', () => {
      const payload = Buffer.from(JSON.stringify({ id: 'evt_123', type: 'payment_intent.succeeded' }));

      const createEventSpy = vi.spyOn(stripe.webhooks, 'constructEvent').mockReturnValue({
        id: 'evt_123',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_123' } },
      } as any);

      const result = verifier(payload, {
        'stripe-signature': 'valid_sig',
      });

      expect(result.event).toBeDefined();
      expect(createEventSpy).toHaveBeenCalledWith(
        payload,
        'valid_sig',
        webhookSecret
      );

      createEventSpy.mockRestore();
    });

    it('should handle empty payload', () => {
      const createEventSpy = vi.spyOn(stripe.webhooks, 'constructEvent').mockImplementation(() => {
        throw new Error('Invalid payload');
      });

      expect(() => {
        verifier('', {
          'stripe-signature': 'sig',
        });
      }).toThrow('Invalid payload');

      createEventSpy.mockRestore();
    });

    it('should handle large payload', () => {
      const largePayload = JSON.stringify({
        id: 'evt_large',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_123', description: 'x'.repeat(10 * 1024 * 1024) } },
      });

      const createEventSpy = vi.spyOn(stripe.webhooks, 'constructEvent').mockReturnValue({
        id: 'evt_large',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_123' } },
      } as any);

      const result = verifier(largePayload, {
        'stripe-signature': 'sig',
      });

      expect(result.event).toBeDefined();
      expect(createEventSpy).toHaveBeenCalled();

      createEventSpy.mockRestore();
    });

    it('should handle payload with special characters', () => {
      const payloadWithSpecial = JSON.stringify({
        id: 'evt_special',
        type: 'payment_intent.succeeded',
        data: { object: { description: '你好 🎉 \n\t' } },
      });

      const createEventSpy = vi.spyOn(stripe.webhooks, 'constructEvent').mockReturnValue({
        id: 'evt_special',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_123' } },
      } as any);

      const result = verifier(payloadWithSpecial, {
        'stripe-signature': 'sig',
      });

      expect(result.event).toBeDefined();

      createEventSpy.mockRestore();
    });

    it('should handle payload with null bytes', () => {
      const payloadWithNull = 'payload\u0000with\u0000null';

      const createEventSpy = vi.spyOn(stripe.webhooks, 'constructEvent').mockImplementation(() => {
        throw new Error('Invalid payload format');
      });

      expect(() => {
        verifier(payloadWithNull, {
          'stripe-signature': 'sig',
        });
      }).toThrow('Invalid payload format');

      createEventSpy.mockRestore();
    });
  });

  describe('stripe-signature header variations', () => {
    it('should pass signature value to constructEvent', () => {
      const payload = JSON.stringify({ id: 'evt_123' });
      const signature = 'timestamp.signature_value';

      const createEventSpy = vi.spyOn(stripe.webhooks, 'constructEvent').mockReturnValue({
        id: 'evt_123',
        type: 'test.event',
        data: { object: {} },
      } as any);

      verifier(payload, { 'stripe-signature': signature });

      expect(createEventSpy).toHaveBeenCalledWith(
        payload,
        signature,
        webhookSecret
      );

      createEventSpy.mockRestore();
    });

    it('should handle signature with multiple parts', () => {
      const payload = JSON.stringify({ id: 'evt_123' });
      const signature = 't=1234567890,v1=signature_value,v0=old_signature';

      const createEventSpy = vi.spyOn(stripe.webhooks, 'constructEvent').mockReturnValue({
        id: 'evt_123',
        type: 'test.event',
        data: { object: {} },
      } as any);

      verifier(payload, { 'stripe-signature': signature });

      expect(createEventSpy).toHaveBeenCalledWith(payload, signature, webhookSecret);

      createEventSpy.mockRestore();
    });

    it('should handle very long signature', () => {
      const payload = JSON.stringify({ id: 'evt_123' });
      const signature = 't=1234567890,v1=' + 'a'.repeat(10000);

      const createEventSpy = vi.spyOn(stripe.webhooks, 'constructEvent').mockReturnValue({
        id: 'evt_123',
        type: 'test.event',
        data: { object: {} },
      } as any);

      verifier(payload, { 'stripe-signature': signature });

      expect(createEventSpy).toHaveBeenCalled();

      createEventSpy.mockRestore();
    });

    it('should handle signature with special characters', () => {
      const payload = JSON.stringify({ id: 'evt_123' });
      const signature = 't=1234567890,v1=signature+with/special=characters';

      const createEventSpy = vi.spyOn(stripe.webhooks, 'constructEvent').mockReturnValue({
        id: 'evt_123',
        type: 'test.event',
        data: { object: {} },
      } as any);

      verifier(payload, { 'stripe-signature': signature });

      expect(createEventSpy).toHaveBeenCalled();

      createEventSpy.mockRestore();
    });
  });

  describe('webhook secret variations', () => {
    it('should use provided webhook secret', () => {
      const payload = JSON.stringify({ id: 'evt_123' });
      const signature = 'sig_value';
      const customSecret = 'whsec_custom_secret_456';

      const customVerifier = createStripeVerifier(stripe, customSecret);

      const createEventSpy = vi.spyOn(stripe.webhooks, 'constructEvent').mockReturnValue({
        id: 'evt_123',
        type: 'test.event',
        data: { object: {} },
      } as any);

      customVerifier(payload, { 'stripe-signature': signature });

      expect(createEventSpy).toHaveBeenCalledWith(payload, signature, customSecret);

      createEventSpy.mockRestore();
    });

    it('should handle different webhook secret prefixes', () => {
      const payload = JSON.stringify({ id: 'evt_123' });
      const signature = 'sig_value';

      // Test with different prefixes (though whsec_ is the standard)
      const secrets = [
        'whsec_test_secret',
        'test_secret_without_prefix',
        'whsec_with_long_secret_value_12345',
      ];

      secrets.forEach((secret) => {
        const customVerifier = createStripeVerifier(stripe, secret);

        const createEventSpy = vi.spyOn(stripe.webhooks, 'constructEvent').mockReturnValue({
          id: 'evt_123',
          type: 'test.event',
          data: { object: {} },
        } as any);

        customVerifier(payload, { 'stripe-signature': signature });

        expect(createEventSpy).toHaveBeenCalledWith(payload, signature, secret);

        createEventSpy.mockRestore();
      });
    });
  });

  describe('result structure', () => {
    it('should return proper VerifyResult structure', () => {
      const payload = JSON.stringify({ id: 'evt_123', type: 'payment_intent.succeeded' });

      const mockEvent = {
        id: 'evt_123',
        type: 'payment_intent.succeeded',
        api_version: '2024-04-10',
        created: 1234567890,
        data: { object: { id: 'pi_123', amount: 1000 } },
        request: null,
      } as any;

      const createEventSpy = vi.spyOn(stripe.webhooks, 'constructEvent').mockReturnValue(mockEvent);

      const result = verifier(payload, { 'stripe-signature': 'sig' });

      expect(result).toHaveProperty('event');
      expect(result.event).toBe(mockEvent);

      createEventSpy.mockRestore();
    });

    it('should include complete Stripe event in result', () => {
      const payload = JSON.stringify({ id: 'evt_123' });

      const completeEvent = {
        id: 'evt_123',
        type: 'payment_intent.succeeded',
        api_version: '2024-04-10',
        created: 1234567890,
        livemode: false,
        pending_webhooks: 0,
        request: { id: null, idempotency_key: null },
        data: {
          object: {
            id: 'pi_123',
            object: 'payment_intent',
            amount: 2000,
            client_secret: 'pi_123_secret',
            created: 1234567890,
            currency: 'usd',
            customer: null,
            description: 'Test payment',
          },
          previous_attributes: {},
        },
      } as any;

      const createEventSpy = vi.spyOn(stripe.webhooks, 'constructEvent').mockReturnValue(completeEvent);

      const result = verifier(payload, { 'stripe-signature': 'sig' });

      expect(result.event).toEqual(completeEvent);

      createEventSpy.mockRestore();
    });
  });
});
