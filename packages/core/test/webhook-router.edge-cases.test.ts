/**
 * Edge case tests for WebhookRouter
 *
 * This test file demonstrates TDD best practices by covering edge cases
 * and boundary conditions that the main test file doesn't cover.
 */
import { describe, it, expect, vi } from 'vitest';
import { WebhookRouter } from '../src/index.js';

describe('WebhookRouter - Edge Cases', () => {
  describe('on() method edge cases', () => {
    it('should handle empty array of event types', () => {
      const router = new WebhookRouter();
      const handler = vi.fn().mockResolvedValue(undefined);

      // Empty array should not cause an error
      router.on([], handler);

      expect(router).toBeInstanceOf(WebhookRouter);
    });

    it('should allow registering the same handler multiple times for the same event', async () => {
      const router = new WebhookRouter();
      const handler = vi.fn().mockResolvedValue(undefined);

      router.on('test.event', handler);
      router.on('test.event', handler);

      await router.dispatch({
        id: 'evt_1',
        type: 'test.event',
        data: { object: {} },
      });

      // Handler should be called twice
      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('should handle event names with many dots', async () => {
      const router = new WebhookRouter();
      const handler = vi.fn().mockResolvedValue(undefined);

      router.on('event.with.many.dots.in.name', handler);

      await router.dispatch({
        id: 'evt_1',
        type: 'event.with.many.dots.in.name',
        data: { object: {} },
      });

      expect(handler).toHaveBeenCalledOnce();
    });

    it('should handle empty string as event name', async () => {
      const router = new WebhookRouter();
      const handler = vi.fn().mockResolvedValue(undefined);

      router.on('', handler);

      await router.dispatch({
        id: 'evt_1',
        type: '',
        data: { object: {} },
      });

      expect(handler).toHaveBeenCalledOnce();
    });

    it('should handle event names with special characters', async () => {
      const router = new WebhookRouter();
      const handler = vi.fn().mockResolvedValue(undefined);

      const specialEventName = 'event-with_special.chars:123';
      router.on(specialEventName, handler);

      await router.dispatch({
        id: 'evt_1',
        type: specialEventName,
        data: { object: {} },
      });

      expect(handler).toHaveBeenCalledOnce();
    });
  });

  describe('dispatch() method edge cases', () => {
    it('should execute handlers in registration order', async () => {
      const router = new WebhookRouter();
      const order: number[] = [];

      const handler1 = vi.fn(async () => {
        order.push(1);
      });
      const handler2 = vi.fn(async () => {
        order.push(2);
      });
      const handler3 = vi.fn(async () => {
        order.push(3);
      });

      router.on('test.event', handler1);
      router.on('test.event', handler2);
      router.on('test.event', handler3);

      await router.dispatch({
        id: 'evt_1',
        type: 'test.event',
        data: { object: {} },
      });

      expect(order).toEqual([1, 2, 3]);
    });

    it('should stop execution when a handler throws an error', async () => {
      const router = new WebhookRouter();
      const handler1 = vi.fn().mockResolvedValue(undefined);
      const handler2 = vi.fn().mockRejectedValue(new Error('Handler error'));
      const handler3 = vi.fn().mockResolvedValue(undefined);

      router.on('test.event', handler1);
      router.on('test.event', handler2);
      router.on('test.event', handler3);

      await expect(
        router.dispatch({
          id: 'evt_1',
          type: 'test.event',
          data: { object: {} },
        })
      ).rejects.toThrow('Handler error');

      expect(handler1).toHaveBeenCalledOnce();
      expect(handler2).toHaveBeenCalledOnce();
      // handler3 should not be called because handler2 threw
      expect(handler3).not.toHaveBeenCalled();
    });

    it('should handle dispatching the same event multiple times', async () => {
      const router = new WebhookRouter();
      const handler = vi.fn().mockResolvedValue(undefined);

      router.on('test.event', handler);

      const event = {
        id: 'evt_1',
        type: 'test.event',
        data: { object: {} },
      };

      await router.dispatch(event);
      await router.dispatch(event);
      await router.dispatch(event);

      expect(handler).toHaveBeenCalledTimes(3);
    });

    it('should handle concurrent dispatches', async () => {
      const router = new WebhookRouter();
      const handler = vi.fn().mockResolvedValue(undefined);

      router.on('test.event', handler);

      const event = {
        id: 'evt_1',
        type: 'test.event',
        data: { object: {} },
      };

      // Dispatch multiple events concurrently
      await Promise.all([
        router.dispatch(event),
        router.dispatch(event),
        router.dispatch(event),
      ]);

      expect(handler).toHaveBeenCalledTimes(3);
    });
  });

  describe('use() middleware edge cases', () => {
    it('should propagate errors thrown by middleware', async () => {
      const router = new WebhookRouter();
      const handler = vi.fn().mockResolvedValue(undefined);

      router.use(async (_event, _next) => {
        throw new Error('Middleware error');
      });

      router.on('test.event', handler);

      await expect(
        router.dispatch({
          id: 'evt_1',
          type: 'test.event',
          data: { object: {} },
        })
      ).rejects.toThrow('Middleware error');

      // Handler should not be called
      expect(handler).not.toHaveBeenCalled();
    });

    it('should allow middleware to modify the event object', async () => {
      const router = new WebhookRouter();
      const handler = vi.fn().mockResolvedValue(undefined);

      router.use(async (event, next) => {
        // Middleware can add properties to the event
        (event as any).middlewareProcessed = true;
        await next();
      });

      router.on('test.event', handler);

      await router.dispatch({
        id: 'evt_1',
        type: 'test.event',
        data: { object: {} },
      });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          middlewareProcessed: true,
        })
      );
    });

    it('should wrap all handlers when multiple handlers are registered', async () => {
      const router = new WebhookRouter();
      const order: string[] = [];

      router.use(async (_event, next) => {
        order.push('middleware-before');
        await next();
        order.push('middleware-after');
      });

      const handler1 = vi.fn(async () => {
        order.push('handler1');
      });
      const handler2 = vi.fn(async () => {
        order.push('handler2');
      });

      router.on('test.event', handler1);
      router.on('test.event', handler2);

      await router.dispatch({
        id: 'evt_1',
        type: 'test.event',
        data: { object: {} },
      });

      // Middleware should wrap all handlers
      expect(order).toEqual([
        'middleware-before',
        'handler1',
        'handler2',
        'middleware-after',
      ]);
    });

    it('should handle errors in middleware after calling next', async () => {
      const router = new WebhookRouter();
      const handler = vi.fn().mockResolvedValue(undefined);

      router.use(async (_event, next) => {
        await next();
        throw new Error('Post-processing error');
      });

      router.on('test.event', handler);

      await expect(
        router.dispatch({
          id: 'evt_1',
          type: 'test.event',
          data: { object: {} },
        })
      ).rejects.toThrow('Post-processing error');

      // Handler should still be called
      expect(handler).toHaveBeenCalledOnce();
    });
  });

  describe('route() nested router edge cases', () => {
    it('should support deep nesting (3 levels)', async () => {
      const router = new WebhookRouter();
      const level1 = new WebhookRouter();
      const level2 = new WebhookRouter();

      const handler = vi.fn().mockResolvedValue(undefined);
      level2.on('created', handler);

      level1.route('subscription', level2);
      router.route('customer', level1);

      await router.dispatch({
        id: 'evt_1',
        type: 'customer.subscription.created',
        data: { object: {} },
      });

      expect(handler).toHaveBeenCalledOnce();
    });

    it('should not inherit middleware from nested router', async () => {
      const router = new WebhookRouter();
      const nested = new WebhookRouter();
      const nestedMiddleware = vi.fn(async (_event, next) => await next());

      nested.use(nestedMiddleware);
      nested.on('created', vi.fn().mockResolvedValue(undefined));

      router.route('customer', nested);

      await router.dispatch({
        id: 'evt_1',
        type: 'customer.created',
        data: { object: {} },
      });

      // Nested router's middleware should not be executed
      // because route() only copies handlers, not middleware
      expect(nestedMiddleware).not.toHaveBeenCalled();
    });
  });

  describe('group() syntax edge cases', () => {
    it('should support nested groups', async () => {
      const router = new WebhookRouter();
      const handler = vi.fn().mockResolvedValue(undefined);

      router.group('customer', (customer) => {
        customer.on('created', handler);
      });

      await router.dispatch({
        id: 'evt_1',
        type: 'customer.created',
        data: { object: {} },
      });

      expect(handler).toHaveBeenCalledOnce();
    });

    it('should handle empty prefix', async () => {
      const router = new WebhookRouter();
      const handler = vi.fn().mockResolvedValue(undefined);

      router.group('', (group) => {
        group.on('test.event', handler);
      });

      await router.dispatch({
        id: 'evt_1',
        type: '.test.event', // Note the leading dot
        data: { object: {} },
      });

      expect(handler).toHaveBeenCalledOnce();
    });
  });

  describe('fanout() parallel handlers edge cases', () => {
    it('should handle empty handler array', async () => {
      const router = new WebhookRouter();

      router.fanout('test.event', []);

      // Should not throw
      await expect(
        router.dispatch({
          id: 'evt_1',
          type: 'test.event',
          data: { object: {} },
        })
      ).resolves.toBeUndefined();
    });

    it('should work with single handler', async () => {
      const router = new WebhookRouter();
      const handler = vi.fn().mockResolvedValue(undefined);

      router.fanout('test.event', [handler]);

      await router.dispatch({
        id: 'evt_1',
        type: 'test.event',
        data: { object: {} },
      });

      expect(handler).toHaveBeenCalledOnce();
    });

    it('should handle multiple errors in all-or-nothing strategy', async () => {
      const router = new WebhookRouter();

      const handler1 = vi.fn().mockRejectedValue(new Error('Error 1'));
      const handler2 = vi.fn().mockRejectedValue(new Error('Error 2'));
      const handler3 = vi.fn().mockResolvedValue(undefined);

      router.fanout('test.event', [handler1, handler2, handler3], {
        strategy: 'all-or-nothing',
      });

      await expect(
        router.dispatch({
          id: 'evt_1',
          type: 'test.event',
          data: { object: {} },
        })
      ).rejects.toThrow();

      // All handlers should be called in parallel
      expect(handler1).toHaveBeenCalledOnce();
      expect(handler2).toHaveBeenCalledOnce();
      expect(handler3).toHaveBeenCalledOnce();
    });

    it('should collect all errors in best-effort strategy', async () => {
      const router = new WebhookRouter();
      const errors: Error[] = [];

      const handler1 = vi.fn().mockRejectedValue(new Error('Error 1'));
      const handler2 = vi.fn().mockRejectedValue(new Error('Error 2'));
      const handler3 = vi.fn().mockResolvedValue(undefined);

      router.fanout('test.event', [handler1, handler2, handler3], {
        strategy: 'best-effort',
        onError: (error) => errors.push(error),
      });

      await router.dispatch({
        id: 'evt_1',
        type: 'test.event',
        data: { object: {} },
      });

      expect(errors).toHaveLength(2);
      expect(errors[0]?.message).toBe('Error 1');
      expect(errors[1]?.message).toBe('Error 2');
    });

    it('should not crash when onError is not provided in best-effort mode', async () => {
      const router = new WebhookRouter();

      const handler1 = vi.fn().mockRejectedValue(new Error('Error 1'));
      const handler2 = vi.fn().mockResolvedValue(undefined);

      router.fanout('test.event', [handler1, handler2], {
        strategy: 'best-effort',
        // No onError callback
      });

      // Should not throw
      await expect(
        router.dispatch({
          id: 'evt_1',
          type: 'test.event',
          data: { object: {} },
        })
      ).resolves.toBeUndefined();
    });

    it('should execute handlers truly in parallel', async () => {
      const router = new WebhookRouter();
      const startTimes: number[] = [];
      const endTimes: number[] = [];

      const createDelayedHandler = (delay: number, index: number) => {
        return vi.fn(async () => {
          startTimes[index] = Date.now();
          await new Promise((resolve) => setTimeout(resolve, delay));
          endTimes[index] = Date.now();
        });
      };

      const handler1 = createDelayedHandler(50, 0);
      const handler2 = createDelayedHandler(50, 1);
      const handler3 = createDelayedHandler(50, 2);

      router.fanout('test.event', [handler1, handler2, handler3]);

      const overallStart = Date.now();
      await router.dispatch({
        id: 'evt_1',
        type: 'test.event',
        data: { object: {} },
      });
      const overallEnd = Date.now();

      // If running in parallel, total time should be ~50ms, not 150ms
      const totalTime = overallEnd - overallStart;
      expect(totalTime).toBeLessThan(100); // Should be less than sequential execution

      // All handlers should have started at roughly the same time
      const maxStartTimeDiff = Math.max(...startTimes) - Math.min(...startTimes);
      expect(maxStartTimeDiff).toBeLessThan(20); // Started within 20ms of each other
    });
  });

  describe('stress tests', () => {
    it('should handle many handlers for the same event', async () => {
      const router = new WebhookRouter();
      const handlerCount = 100;
      const handlers = Array.from({ length: handlerCount }, () =>
        vi.fn().mockResolvedValue(undefined)
      );

      handlers.forEach((handler) => router.on('test.event', handler));

      await router.dispatch({
        id: 'evt_1',
        type: 'test.event',
        data: { object: {} },
      });

      handlers.forEach((handler) => {
        expect(handler).toHaveBeenCalledOnce();
      });
    });

    it('should handle many different event types', async () => {
      const router = new WebhookRouter();
      const eventCount = 100;

      const handlers = Array.from({ length: eventCount }, (_, i) => {
        const handler = vi.fn().mockResolvedValue(undefined);
        router.on(`event.${i}`, handler);
        return handler;
      });

      // Dispatch all events
      for (let i = 0; i < eventCount; i++) {
        await router.dispatch({
          id: `evt_${i}`,
          type: `event.${i}`,
          data: { object: {} },
        });
      }

      // Each handler should be called once
      handlers.forEach((handler) => {
        expect(handler).toHaveBeenCalledOnce();
      });
    });

    it('should handle large event payloads', async () => {
      const router = new WebhookRouter();
      const handler = vi.fn().mockResolvedValue(undefined);

      router.on('test.event', handler);

      // Create a large payload
      const largeData = {
        object: {
          items: Array.from({ length: 1000 }, (_, i) => ({
            id: `item_${i}`,
            data: 'x'.repeat(1000),
          })),
        },
      };

      await router.dispatch({
        id: 'evt_1',
        type: 'test.event',
        data: largeData,
      });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          data: largeData,
        })
      );
    });
  });
});
