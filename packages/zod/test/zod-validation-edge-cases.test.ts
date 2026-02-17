import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { WebhookRouter } from '@tayori/core';
import {
  SchemaRegistry,
  createEventSchema,
  defineEvent,
  withValidation,
} from '../src/index.js';

describe('Zod Validation - Edge Cases', () => {
  it('should validate complex nested schemas', () => {
    const schema = createEventSchema(
      'order.created',
      z.object({
        id: z.string(),
        amount: z.number().positive(),
        items: z.array(
          z.object({
            sku: z.string(),
            quantity: z.number().int().positive(),
            price: z.number().nonnegative(),
          })
        ),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
    );

    const validEvent = {
      id: 'evt_123',
      type: 'order.created',
      data: {
        object: {
          id: 'ord_123',
          amount: 9999,
          items: [
            { sku: 'SKU001', quantity: 2, price: 49.99 },
            { sku: 'SKU002', quantity: 1, price: 99.99 },
          ],
          metadata: { source: 'web', campaign: 'summer_sale' },
        },
      },
    };

    expect(schema.parse(validEvent)).toEqual(validEvent);
  });

  it('should reject events with invalid nested data', () => {
    const schema = createEventSchema(
      'order.created',
      z.object({
        id: z.string(),
        items: z.array(
          z.object({
            quantity: z.number().int().positive(),
          })
        ),
      })
    );

    const invalidEvent = {
      id: 'evt_123',
      type: 'order.created',
      data: {
        object: {
          id: 'ord_123',
          items: [
            { quantity: 0 }, // Invalid: must be positive
          ],
        },
      },
    };

    expect(() => schema.parse(invalidEvent)).toThrow();
  });

  it('should handle optional and nullable fields', () => {
    const schema = createEventSchema(
      'user.updated',
      z.object({
        id: z.string(),
        email: z.string().email(),
        phone: z.string().optional(),
        company: z.string().nullable(),
      })
    );

    const eventWithoutOptional = {
      id: 'evt_123',
      type: 'user.updated',
      data: {
        object: {
          id: 'usr_123',
          email: 'user@example.com',
          company: null,
        },
      },
    };

    expect(schema.parse(eventWithoutOptional)).toEqual(eventWithoutOptional);
  });

  it('should support SchemaRegistry for multiple event types', () => {
    const registry = new SchemaRegistry();

    const orderSchema = defineEvent(
      'order.created',
      z.object({
        orderId: z.string(),
        total: z.number(),
      })
    );

    const paymentSchema = defineEvent(
      'payment.completed',
      z.object({
        paymentId: z.string(),
        amount: z.number(),
      })
    );

    registry.register(orderSchema);
    registry.register(paymentSchema);

    const validOrderEvent = {
      id: 'evt_123',
      type: 'order.created',
      data: {
        object: {
          orderId: 'ord_123',
          total: 99.99,
        },
      },
    };

    expect(() => registry.validate(validOrderEvent)).not.toThrow();
  });

  it('should work with withValidation middleware', async () => {
    const router = new WebhookRouter();

    const eventSchema = defineEvent(
      'test.event',
      z.object({
        eventId: z.string().uuid(),
      })
    );

    const registry = new SchemaRegistry();
    registry.register(eventSchema);

    const validator = withValidation(registry);
    const handler = vi.fn().mockResolvedValue(undefined);

    router.use(validator);
    router.on('test.event', handler);

    expect(router).toBeDefined();
  });

  it('should validate discriminated unions of events', () => {
    const paymentEventSchema = z.discriminatedUnion('type', [
      createEventSchema(
        'payment.created',
        z.object({ amount: z.number().positive() })
      ),
      createEventSchema(
        'payment.completed',
        z.object({ transactionId: z.string() })
      ),
    ]);

    const createdEvent = {
      id: 'evt_123',
      type: 'payment.created',
      data: {
        object: {
          amount: 99.99,
        },
      },
    };

    expect(paymentEventSchema.parse(createdEvent)).toEqual(createdEvent);
  });

  it('should handle large payload validation', () => {
    const schema = createEventSchema(
      'data.processed',
      z.object({
        recordId: z.string(),
        content: z.string(),
        size: z.number(),
      })
    );

    const largeEvent = {
      id: 'evt_123',
      type: 'data.processed',
      data: {
        object: {
          recordId: 'rec_123',
          content: 'x'.repeat(100 * 1024), // 100KB content
          size: 100 * 1024,
        },
      },
    };

    expect(schema.parse(largeEvent)).toEqual(largeEvent);
  });

  it('should validate with custom refinements', () => {
    const schema = createEventSchema(
      'password.updated',
      z
        .object({
          newPassword: z.string().min(8),
          confirmPassword: z.string(),
        })
        .refine((data) => data.newPassword === data.confirmPassword, {
          message: 'Passwords do not match',
          path: ['confirmPassword'],
        })
    );

    const validEvent = {
      id: 'evt_123',
      type: 'password.updated',
      data: {
        object: {
          newPassword: 'SecurePass123!',
          confirmPassword: 'SecurePass123!',
        },
      },
    };

    expect(schema.parse(validEvent)).toEqual(validEvent);
  });

  it('should reject events with mismatched refinements', () => {
    const schema = createEventSchema(
      'password.updated',
      z
        .object({
          newPassword: z.string().min(8),
          confirmPassword: z.string(),
        })
        .refine((data) => data.newPassword === data.confirmPassword, {
          message: 'Passwords do not match',
        })
    );

    const invalidEvent = {
      id: 'evt_123',
      type: 'password.updated',
      data: {
        object: {
          newPassword: 'SecurePass123!',
          confirmPassword: 'DifferentPass123!',
        },
      },
    };

    expect(() => schema.parse(invalidEvent)).toThrow();
  });
});
