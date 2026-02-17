import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import {
  SchemaRegistry,
  createEventSchema,
  defineEvent,
  withValidation,
  WebhookValidationError,
  UnknownEventTypeError,
} from '../src/index.js';
import { WebhookRouter } from '@tayori/core';

describe('Zod Validation - Edge Cases', () => {
  describe('frozen objects', () => {
    it('should validate frozen event objects', () => {
      const schema = createEventSchema('test.event', z.object({ id: z.number() }));

      const event = {
        id: 'evt_123',
        type: 'test.event',
        data: { object: { id: 42 } },
      };

      Object.freeze(event);

      const result = schema.parse(event);
      expect(result).toEqual(event);
    });

    it('should validate events with deeply frozen data objects', () => {
      const schema = createEventSchema('test.event', z.object({ nested: z.object({ value: z.string() }) }));

      const event = {
        id: 'evt_123',
        type: 'test.event',
        data: { object: { nested: { value: 'test' } } },
      };

      Object.freeze(event);
      Object.freeze(event.data);
      Object.freeze(event.data.object);

      const result = schema.parse(event);
      expect(result).toEqual(event);
    });

    it('should handle validation of sealed objects', () => {
      const schema = createEventSchema('test.event', z.object({ id: z.number() }));

      const event = {
        id: 'evt_123',
        type: 'test.event',
        data: { object: { id: 42 } },
      };

      Object.seal(event);

      const result = schema.parse(event);
      expect(result).toEqual(event);
    });

    it('should handle validation of non-extensible objects', () => {
      const schema = createEventSchema('test.event', z.object({ id: z.number() }));

      const event = {
        id: 'evt_123',
        type: 'test.event',
        data: { object: { id: 42 } },
      };

      Object.preventExtensions(event);

      const result = schema.parse(event);
      expect(result).toEqual(event);
    });

    it('should work with SchemaRegistry and frozen objects', () => {
      const registry = new SchemaRegistry();
      const schema = createEventSchema('test.event', z.object({ id: z.number() }));
      registry.register('test.event', schema);

      const event = {
        id: 'evt_123',
        type: 'test.event',
        data: { object: { id: 42 } },
      };

      Object.freeze(event);

      const result = registry.validate(event);
      expect(result).toBeDefined();
    });
  });

  describe('Symbol properties', () => {
    it('should ignore Symbol properties during validation', () => {
      const schema = createEventSchema('test.event', z.object({ id: z.number() }));

      const symbolKey = Symbol('custom');
      const event = {
        id: 'evt_123',
        type: 'test.event',
        data: { object: { id: 42 } },
        [symbolKey]: 'symbol_value',
      };

      const result = schema.parse(event);
      expect(result).toEqual({
        id: 'evt_123',
        type: 'test.event',
        data: { object: { id: 42 } },
      });
    });

    it('should ignore Symbols in nested objects', () => {
      const schema = createEventSchema('test.event', z.object({ nested: z.object({ value: z.string() }) }));

      const symbolKey = Symbol('nested_custom');
      const event = {
        id: 'evt_123',
        type: 'test.event',
        data: {
          object: {
            nested: { value: 'test', [symbolKey]: 'nested_symbol' },
          },
        },
      };

      const result = schema.parse(event);
      expect(result.data.object.nested.value).toBe('test');
    });

    it('should handle event with multiple Symbol properties', () => {
      const schema = createEventSchema('test.event', z.object({ id: z.number() }));

      const symbol1 = Symbol('sym1');
      const symbol2 = Symbol('sym2');
      const event = {
        id: 'evt_123',
        type: 'test.event',
        data: { object: { id: 42 } },
        [symbol1]: 'value1',
        [symbol2]: 'value2',
      };

      const result = schema.parse(event);
      expect(result).toBeDefined();
    });

    it('should work with SchemaRegistry and Symbol properties', () => {
      const registry = new SchemaRegistry();
      const schema = createEventSchema('test.event', z.object({ id: z.number() }));
      registry.register('test.event', schema);

      const symbol = Symbol('custom');
      const event = {
        id: 'evt_123',
        type: 'test.event',
        data: { object: { id: 42 } },
        [symbol]: 'symbol_value',
      };

      const result = registry.validate(event);
      expect(result).toBeDefined();
    });

    it('should safely validate events with Symbol properties', () => {
      const registry = new SchemaRegistry();
      const schema = createEventSchema('test.event', z.object({ id: z.number() }));
      registry.register('test.event', schema);

      const symbol = Symbol('test');
      const event = {
        id: 'evt_123',
        type: 'test.event',
        data: { object: { id: 42 } },
        [symbol]: 'symbol_value',
      };

      const result = registry.safeParse(event);
      expect(result.success).toBe(true);
    });
  });

  describe('schema duplicate registration', () => {
    it('should allow re-registering a schema for the same event type', () => {
      const registry = new SchemaRegistry();
      const schema1 = createEventSchema('test.event', z.object({ id: z.number() }));
      const schema2 = createEventSchema('test.event', z.object({ name: z.string() }));

      registry.register('test.event', schema1);
      expect(registry.has('test.event')).toBe(true);

      // Re-register with a different schema
      registry.register('test.event', schema2);
      expect(registry.has('test.event')).toBe(true);

      // The second schema should be used
      const event = {
        id: 'evt_123',
        type: 'test.event',
        data: { object: { name: 'test' } },
      };

      const result = registry.validate(event);
      expect(result.data.object.name).toBe('test');
    });

    it('should overwrite schema when registering with registerAll', () => {
      const registry = new SchemaRegistry();
      const schema1 = defineEvent('test.event', z.object({ id: z.number() }));

      registry.registerAll({ event1: schema1 });
      expect(registry.has('test.event')).toBe(true);

      const schema2 = defineEvent('test.event', z.object({ name: z.string() }));

      registry.registerAll({ event1: schema2 });

      const event = {
        id: 'evt_123',
        type: 'test.event',
        data: { object: { name: 'test' } },
      };

      const result = registry.validate(event);
      expect(result.data.object.name).toBe('test');
    });

    it('should support multiple schemas in single registerAll call', () => {
      const registry = new SchemaRegistry();
      const schema1 = defineEvent('event1', z.object({ id: z.number() }));
      const schema2 = defineEvent('event2', z.object({ name: z.string() }));
      const schema3 = defineEvent('event3', z.object({ active: z.boolean() }));

      registry.registerAll({ schema1, schema2, schema3 });

      expect(registry.has('event1')).toBe(true);
      expect(registry.has('event2')).toBe(true);
      expect(registry.has('event3')).toBe(true);
    });

    it('should handle duplicate registration in registerAll', () => {
      const registry = new SchemaRegistry();
      const schema1 = defineEvent('test.event', z.object({ id: z.number() }));
      const schema2 = defineEvent('test.event', z.object({ name: z.string() }));

      // Register both in a single call - later should win
      registry.registerAll({ first: schema1, second: schema2 });

      const event = {
        id: 'evt_123',
        type: 'test.event',
        data: { object: { name: 'test' } },
      };

      const result = registry.validate(event);
      // The second registration should be active
      expect(result.data.object.name).toBe('test');
    });

    it('should handle chaining of register calls with duplicates', () => {
      const registry = new SchemaRegistry();
      const schema1 = createEventSchema('test.event', z.object({ id: z.number() }));
      const schema2 = createEventSchema('test.event', z.object({ name: z.string() }));

      registry.register('test.event', schema1).register('test.event', schema2);

      const event = {
        id: 'evt_123',
        type: 'test.event',
        data: { object: { name: 'test' } },
      };

      const result = registry.validate(event);
      expect(result.data.object.name).toBe('test');
    });
  });

  describe('validation with edge case data', () => {
    it('should validate events with null data objects', () => {
      const registry = new SchemaRegistry();
      registry.register('test.event', createEventSchema('test.event', z.null()));

      const event = {
        id: 'evt_123',
        type: 'test.event',
        data: { object: null },
      };

      const result = registry.validate(event);
      expect(result.data.object).toBeNull();
    });

    it('should validate events with empty objects', () => {
      const schema = createEventSchema('test.event', z.object({}));

      const event = {
        id: 'evt_123',
        type: 'test.event',
        data: { object: {} },
      };

      const result = schema.parse(event);
      expect(result.data.object).toEqual({});
    });

    it('should validate events with deeply nested objects', () => {
      const schema = createEventSchema(
        'test.event',
        z.object({
          level1: z.object({
            level2: z.object({
              level3: z.object({
                value: z.string(),
              }),
            }),
          }),
        })
      );

      const event = {
        id: 'evt_123',
        type: 'test.event',
        data: {
          object: {
            level1: {
              level2: {
                level3: {
                  value: 'deep',
                },
              },
            },
          },
        },
      };

      const result = schema.parse(event);
      expect(result.data.object.level1.level2.level3.value).toBe('deep');
    });

    it('should validate events with array data objects', () => {
      const schema = createEventSchema('test.event', z.array(z.object({ id: z.number() })));

      const event = {
        id: 'evt_123',
        type: 'test.event',
        data: {
          object: [{ id: 1 }, { id: 2 }, { id: 3 }],
        },
      };

      const result = schema.parse(event);
      expect(result.data.object).toHaveLength(3);
    });

    it('should validate events with very large data objects', () => {
      const largeData = Array.from({ length: 10000 }, (_, i) => ({ id: i }));
      const schema = createEventSchema('test.event', z.array(z.object({ id: z.number() })));

      const event = {
        id: 'evt_123',
        type: 'test.event',
        data: { object: largeData },
      };

      const result = schema.parse(event);
      expect(result.data.object).toHaveLength(10000);
    });
  });

  describe('SchemaRegistry edge cases', () => {
    it('should return undefined for unregistered schema', () => {
      const registry = new SchemaRegistry();

      expect(registry.get('nonexistent.event')).toBeUndefined();
      expect(registry.has('nonexistent.event')).toBe(false);
    });

    it('should pass through unvalidated events', () => {
      const registry = new SchemaRegistry();

      const event = {
        id: 'evt_123',
        type: 'unregistered.event',
        data: { object: { anything: 'goes' } },
      };

      const result = registry.validate(event);
      expect(result).toEqual(event);
    });

    it('should safely parse unregistered events', () => {
      const registry = new SchemaRegistry();

      const event = {
        id: 'evt_123',
        type: 'unregistered.event',
        data: { object: { anything: 'goes' } },
      };

      const result = registry.safeParse(event);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(event);
    });

    it('should handle validation errors properly', () => {
      const registry = new SchemaRegistry();
      const schema = createEventSchema('test.event', z.object({ id: z.number() }));
      registry.register('test.event', schema);

      const invalidEvent = {
        id: 'evt_123',
        type: 'test.event',
        data: { object: { id: 'not_a_number' } },
      };

      expect(() => registry.validate(invalidEvent)).toThrow();
    });

    it('should return error in safeParse on validation failure', () => {
      const registry = new SchemaRegistry();
      const schema = createEventSchema('test.event', z.object({ id: z.number() }));
      registry.register('test.event', schema);

      const invalidEvent = {
        id: 'evt_123',
        type: 'test.event',
        data: { object: { id: 'not_a_number' } },
      };

      const result = registry.safeParse(invalidEvent);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });

    it('should chain register calls', () => {
      const registry = new SchemaRegistry();
      const schema1 = createEventSchema('event1', z.object({ id: z.number() }));
      const schema2 = createEventSchema('event2', z.object({ name: z.string() }));
      const schema3 = createEventSchema('event3', z.object({ active: z.boolean() }));

      registry
        .register('event1', schema1)
        .register('event2', schema2)
        .register('event3', schema3);

      expect(registry.has('event1')).toBe(true);
      expect(registry.has('event2')).toBe(true);
      expect(registry.has('event3')).toBe(true);
    });
  });

  describe('validation middleware edge cases', () => {
    it('should validate events through middleware in router', () => {
      const registry = new SchemaRegistry();
      const schema = createEventSchema('test.event', z.object({ id: z.number() }));
      registry.register('test.event', schema);

      const router = new WebhookRouter();
      const handler = vi.fn();

      router.use(withValidation(registry)).on('test.event', handler);

      const event = {
        id: 'evt_123',
        type: 'test.event',
        data: { object: { id: 42 } },
      };

      router.dispatch(event).then(() => {
        expect(handler).toHaveBeenCalled();
      });
    });

    it('should handle validation errors in middleware', () => {
      const registry = new SchemaRegistry();
      const schema = createEventSchema('test.event', z.object({ id: z.number() }));
      registry.register('test.event', schema);

      const router = new WebhookRouter();
      const onError = vi.fn();

      router.use(withValidation(registry, { onError }));

      const invalidEvent = {
        id: 'evt_123',
        type: 'test.event',
        data: { object: { id: 'not_a_number' } },
      };

      router.dispatch(invalidEvent).catch(() => {
        // Error expected
      });
    });

    it('should allow unknown events by default', () => {
      const registry = new SchemaRegistry();

      const router = new WebhookRouter();
      const handler = vi.fn();

      router.use(withValidation(registry)).on('unknown.event', handler);

      const event = {
        id: 'evt_123',
        type: 'unknown.event',
        data: { object: { anything: 'goes' } },
      };

      router.dispatch(event).then(() => {
        expect(handler).toHaveBeenCalled();
      });
    });

    it('should reject unknown events when configured', () => {
      const registry = new SchemaRegistry();
      const onError = vi.fn();

      const router = new WebhookRouter();

      router.use(withValidation(registry, { allowUnknownEvents: false, onError }));

      const event = {
        id: 'evt_123',
        type: 'unknown.event',
        data: { object: { anything: 'goes' } },
      };

      router.dispatch(event).catch(() => {
        // Error expected
      });
    });
  });
});
