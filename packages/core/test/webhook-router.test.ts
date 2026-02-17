import { describe, it, expect, vi } from 'vitest';
import { WebhookRouter } from '../src/index.js';

describe('WebhookRouter', () => {
  describe('instantiation', () => {
    it('should create a new instance', () => {
      const router = new WebhookRouter();
      expect(router).toBeInstanceOf(WebhookRouter);
    });
  });

  describe('on()', () => {
    it('should register a handler for a single event type', () => {
      const router = new WebhookRouter();
      const handler = vi.fn();

      const result = router.on('payment_intent.succeeded', handler);

      // Should return this for chaining
      expect(result).toBe(router);
    });

    it('should allow chaining multiple on() calls', () => {
      const router = new WebhookRouter();
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      const result = router
        .on('payment_intent.succeeded', handler1)
        .on('payment_intent.canceled', handler2);

      expect(result).toBe(router);
    });
  });

  describe('dispatch()', () => {
    it('should call the registered handler for matching event type', async () => {
      const router = new WebhookRouter();
      const handler = vi.fn().mockResolvedValue(undefined);

      router.on('payment_intent.succeeded', handler);

      const event = {
        id: 'evt_123',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_123' } },
      };

      await router.dispatch(event);

      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith(event);
    });

    it('should not call handlers for non-matching event types', async () => {
      const router = new WebhookRouter();
      const handler = vi.fn().mockResolvedValue(undefined);

      router.on('payment_intent.succeeded', handler);

      const event = {
        id: 'evt_123',
        type: 'payment_intent.canceled',
        data: { object: { id: 'pi_123' } },
      };

      await router.dispatch(event);

      expect(handler).not.toHaveBeenCalled();
    });

    it('should call multiple handlers for the same event type', async () => {
      const router = new WebhookRouter();
      const handler1 = vi.fn().mockResolvedValue(undefined);
      const handler2 = vi.fn().mockResolvedValue(undefined);

      router.on('payment_intent.succeeded', handler1);
      router.on('payment_intent.succeeded', handler2);

      const event = {
        id: 'evt_123',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_123' } },
      };

      await router.dispatch(event);

      expect(handler1).toHaveBeenCalledOnce();
      expect(handler2).toHaveBeenCalledOnce();
    });

    it('should handle events with no registered handlers gracefully', async () => {
      const router = new WebhookRouter();

      const event = {
        id: 'evt_123',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_123' } },
      };

      // Should not throw
      await expect(router.dispatch(event)).resolves.toBeUndefined();
    });
  });

  describe('on() with array of events', () => {
    it('should register a handler for multiple event types', async () => {
      const router = new WebhookRouter();
      const handler = vi.fn().mockResolvedValue(undefined);

      router.on(['invoice.paid', 'invoice.payment_failed'], handler);

      const paidEvent = {
        id: 'evt_123',
        type: 'invoice.paid',
        data: { object: { id: 'inv_123' } },
      };

      const failedEvent = {
        id: 'evt_456',
        type: 'invoice.payment_failed',
        data: { object: { id: 'inv_456' } },
      };

      await router.dispatch(paidEvent);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(paidEvent);

      await router.dispatch(failedEvent);
      expect(handler).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenLastCalledWith(failedEvent);
    });

    it('should not call handler for event types not in the array', async () => {
      const router = new WebhookRouter();
      const handler = vi.fn().mockResolvedValue(undefined);

      router.on(['invoice.paid', 'invoice.payment_failed'], handler);

      const otherEvent = {
        id: 'evt_789',
        type: 'invoice.created',
        data: { object: { id: 'inv_789' } },
      };

      await router.dispatch(otherEvent);
      expect(handler).not.toHaveBeenCalled();
    });

    it('should allow chaining with array syntax', () => {
      const router = new WebhookRouter();
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      const result = router
        .on(['invoice.paid', 'invoice.payment_failed'], handler1)
        .on('payment_intent.succeeded', handler2);

      expect(result).toBe(router);
    });
  });

  describe('use() middleware', () => {
    it('should execute middleware before handlers', async () => {
      const router = new WebhookRouter();
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
      router.on('payment_intent.succeeded', handler);

      const event = {
        id: 'evt_123',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_123' } },
      };

      await router.dispatch(event);

      expect(order).toEqual(['middleware-before', 'handler', 'middleware-after']);
      expect(middleware).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledOnce();
    });

    it('should execute multiple middlewares in order', async () => {
      const router = new WebhookRouter();
      const order: string[] = [];

      router.use(async (_event, next) => {
        order.push('middleware1-before');
        await next();
        order.push('middleware1-after');
      });

      router.use(async (_event, next) => {
        order.push('middleware2-before');
        await next();
        order.push('middleware2-after');
      });

      router.on('payment_intent.succeeded', async () => {
        order.push('handler');
      });

      const event = {
        id: 'evt_123',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_123' } },
      };

      await router.dispatch(event);

      expect(order).toEqual([
        'middleware1-before',
        'middleware2-before',
        'handler',
        'middleware2-after',
        'middleware1-after',
      ]);
    });

    it('should allow middleware to short-circuit by not calling next', async () => {
      const router = new WebhookRouter();
      const handler = vi.fn();

      router.use(async (_event, _next) => {
        // Intentionally not calling next()
      });

      router.on('payment_intent.succeeded', handler);

      const event = {
        id: 'evt_123',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_123' } },
      };

      await router.dispatch(event);

      expect(handler).not.toHaveBeenCalled();
    });

    it('should allow chaining use() calls', () => {
      const router = new WebhookRouter();
      const middleware1 = vi.fn();
      const middleware2 = vi.fn();

      const result = router
        .use(middleware1)
        .use(middleware2);

      expect(result).toBe(router);
    });
  });

  describe('route() nested router', () => {
    it('should mount a nested router with a prefix', async () => {
      const router = new WebhookRouter();
      const subscriptions = new WebhookRouter();

      const handler = vi.fn().mockResolvedValue(undefined);
      subscriptions.on('created', handler);

      router.route('customer.subscription', subscriptions);

      const event = {
        id: 'evt_123',
        type: 'customer.subscription.created',
        data: { object: { id: 'sub_123' } },
      };

      await router.dispatch(event);

      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith(event);
    });

    it('should support multiple handlers in nested router', async () => {
      const router = new WebhookRouter();
      const subscriptions = new WebhookRouter();

      const createdHandler = vi.fn().mockResolvedValue(undefined);
      const updatedHandler = vi.fn().mockResolvedValue(undefined);

      subscriptions.on('created', createdHandler);
      subscriptions.on('updated', updatedHandler);

      router.route('customer.subscription', subscriptions);

      await router.dispatch({
        id: 'evt_1',
        type: 'customer.subscription.created',
        data: { object: { id: 'sub_1' } },
      });

      await router.dispatch({
        id: 'evt_2',
        type: 'customer.subscription.updated',
        data: { object: { id: 'sub_2' } },
      });

      expect(createdHandler).toHaveBeenCalledOnce();
      expect(updatedHandler).toHaveBeenCalledOnce();
    });

    it('should allow chaining route() calls', () => {
      const router = new WebhookRouter();
      const sub1 = new WebhookRouter();
      const sub2 = new WebhookRouter();

      const result = router
        .route('customer.subscription', sub1)
        .route('invoice', sub2);

      expect(result).toBe(router);
    });
  });

  describe('group() syntax', () => {
    it('should register handlers with prefixed event types', async () => {
      const router = new WebhookRouter();
      const handler = vi.fn().mockResolvedValue(undefined);

      router.group('payment_intent', (group) => {
        group.on('succeeded', handler);
      });

      const event = {
        id: 'evt_123',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_123' } },
      };

      await router.dispatch(event);

      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith(event);
    });

    it('should support multiple handlers in group', async () => {
      const router = new WebhookRouter();
      const succeededHandler = vi.fn().mockResolvedValue(undefined);
      const canceledHandler = vi.fn().mockResolvedValue(undefined);

      router.group('payment_intent', (group) => {
        group.on('succeeded', succeededHandler);
        group.on('canceled', canceledHandler);
      });

      await router.dispatch({
        id: 'evt_1',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_1' } },
      });

      await router.dispatch({
        id: 'evt_2',
        type: 'payment_intent.canceled',
        data: { object: { id: 'pi_2' } },
      });

      expect(succeededHandler).toHaveBeenCalledOnce();
      expect(canceledHandler).toHaveBeenCalledOnce();
    });

    it('should support array syntax in group', async () => {
      const router = new WebhookRouter();
      const handler = vi.fn().mockResolvedValue(undefined);

      router.group('payment_intent', (group) => {
        group.on(['requires_action', 'requires_payment_method'], handler);
      });

      await router.dispatch({
        id: 'evt_1',
        type: 'payment_intent.requires_action',
        data: { object: { id: 'pi_1' } },
      });

      await router.dispatch({
        id: 'evt_2',
        type: 'payment_intent.requires_payment_method',
        data: { object: { id: 'pi_2' } },
      });

      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('should allow chaining group() calls', () => {
      const router = new WebhookRouter();

      const result = router
        .group('payment_intent', () => {})
        .group('invoice', () => {});

      expect(result).toBe(router);
    });
  });

  describe('fanout() parallel handlers', () => {
    it('should execute multiple handlers in parallel', async () => {
      const router = new WebhookRouter();
      const order: string[] = [];

      const handler1 = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        order.push('handler1');
      });

      const handler2 = vi.fn(async () => {
        order.push('handler2');
      });

      const handler3 = vi.fn(async () => {
        order.push('handler3');
      });

      router.fanout('payment_intent.succeeded', [handler1, handler2, handler3]);

      const event = {
        id: 'evt_123',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_123' } },
      };

      await router.dispatch(event);

      // All handlers should be called
      expect(handler1).toHaveBeenCalledOnce();
      expect(handler2).toHaveBeenCalledOnce();
      expect(handler3).toHaveBeenCalledOnce();

      // Verify parallel execution: handler2 and handler3 complete before handler1
      // because handler1 has a 10ms delay
      expect(order).toHaveLength(3);
      expect(order[2]).toBe('handler1'); // handler1 completes last due to delay
      expect(order.slice(0, 2)).toContain('handler2');
      expect(order.slice(0, 2)).toContain('handler3');
    });

    it('should handle errors in fanout with all-or-nothing strategy', async () => {
      const router = new WebhookRouter();

      const handler1 = vi.fn().mockResolvedValue(undefined);
      const handler2 = vi.fn().mockRejectedValue(new Error('Handler error'));
      const handler3 = vi.fn().mockResolvedValue(undefined);

      router.fanout('payment_intent.succeeded', [handler1, handler2, handler3], {
        strategy: 'all-or-nothing',
      });

      const event = {
        id: 'evt_123',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_123' } },
      };

      await expect(router.dispatch(event)).rejects.toThrow('Handler error');
    });

    it('should continue on errors with best-effort strategy', async () => {
      const router = new WebhookRouter();
      const errors: Error[] = [];

      const handler1 = vi.fn().mockResolvedValue(undefined);
      const handler2 = vi.fn().mockRejectedValue(new Error('Handler error'));
      const handler3 = vi.fn().mockResolvedValue(undefined);

      router.fanout('payment_intent.succeeded', [handler1, handler2, handler3], {
        strategy: 'best-effort',
        onError: (error) => errors.push(error),
      });

      const event = {
        id: 'evt_123',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_123' } },
      };

      await router.dispatch(event);

      // All handlers should be called
      expect(handler1).toHaveBeenCalledOnce();
      expect(handler2).toHaveBeenCalledOnce();
      expect(handler3).toHaveBeenCalledOnce();

      // Error should be captured
      expect(errors).toHaveLength(1);
      expect(errors[0]?.message).toBe('Handler error');
    });

    it('should allow chaining fanout() calls', () => {
      const router = new WebhookRouter();
      const handler = vi.fn();

      const result = router
        .fanout('payment_intent.succeeded', [handler])
        .fanout('payment_intent.canceled', [handler]);

      expect(result).toBe(router);
    });

    it('should handle empty handlers array', async () => {
      const router = new WebhookRouter();

      router.fanout('payment_intent.succeeded', []);

      const event = {
        id: 'evt_empty',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_empty' } },
      };

      // Should not throw with empty handlers
      await expect(router.dispatch(event)).resolves.toBeUndefined();
    });

    it('should handle fanout with all-or-nothing strategy on error', async () => {
      const router = new WebhookRouter();

      const handler1 = vi.fn().mockResolvedValue(undefined);
      const handler2 = vi.fn().mockRejectedValue(new Error('Fanout error'));

      router.fanout('payment_intent.succeeded', [handler1, handler2], {
        strategy: 'all-or-nothing',
      });

      const event = {
        id: 'evt_fanout_err',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_fanout_err' } },
      };

      await expect(router.dispatch(event)).rejects.toThrow('Fanout error');
    });

    it('should handle non-Error objects in fanout with best-effort strategy', async () => {
      const router = new WebhookRouter();
      const errors: Error[] = [];

      const handler1 = vi.fn().mockResolvedValue(undefined);
      const handler2 = vi.fn().mockRejectedValue('string error');

      router.fanout('payment_intent.succeeded', [handler1, handler2], {
        strategy: 'best-effort',
        onError: (error) => errors.push(error),
      });

      const event = {
        id: 'evt_str_err',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_str_err' } },
      };

      await router.dispatch(event);

      expect(errors).toHaveLength(1);
      expect(errors[0]?.message).toBe('string error');
    });
  });

  describe('error handling', () => {
    it('should propagate handler errors', async () => {
      const router = new WebhookRouter();
      const errorMessage = 'Handler failed unexpectedly';

      router.on('test.event', async () => {
        throw new Error(errorMessage);
      });

      const event = {
        id: 'evt_err',
        type: 'test.event',
        data: { object: {} },
      };

      await expect(router.dispatch(event)).rejects.toThrow(errorMessage);
    });

    it('should propagate middleware errors', async () => {
      const router = new WebhookRouter();
      const errorMessage = 'Middleware failed';

      router.use(async () => {
        throw new Error(errorMessage);
      });

      router.on('test.event', vi.fn());

      const event = {
        id: 'evt_mw_err',
        type: 'test.event',
        data: { object: {} },
      };

      await expect(router.dispatch(event)).rejects.toThrow(errorMessage);
    });

    it('should propagate errors from nested router handlers', async () => {
      const router = new WebhookRouter();
      const nested = new WebhookRouter();
      const errorMessage = 'Nested handler error';

      nested.on('created', async () => {
        throw new Error(errorMessage);
      });

      router.route('customer', nested);

      const event = {
        id: 'evt_nested_err',
        type: 'customer.created',
        data: { object: {} },
      };

      await expect(router.dispatch(event)).rejects.toThrow(errorMessage);
    });

    it('should handle errors in group handlers', async () => {
      const router = new WebhookRouter();
      const errorMessage = 'Group handler error';

      router.group('invoice', (group) => {
        group.on('paid', async () => {
          throw new Error(errorMessage);
        });
      });

      const event = {
        id: 'evt_group_err',
        type: 'invoice.paid',
        data: { object: {} },
      };

      await expect(router.dispatch(event)).rejects.toThrow(errorMessage);
    });

    it('should only call handlers before error occurs', async () => {
      const router = new WebhookRouter();
      const order: number[] = [];

      router.on('test.event', async () => { order.push(1); });
      router.on('test.event', async () => { throw new Error('Second handler failed'); });
      router.on('test.event', async () => { order.push(3); });

      const event = {
        id: 'evt_partial',
        type: 'test.event',
        data: { object: {} },
      };

      await expect(router.dispatch(event)).rejects.toThrow('Second handler failed');
      expect(order).toEqual([1]);
    });
  });

  describe('edge cases', () => {
    it('should handle empty event id', async () => {
      const router = new WebhookRouter();
      const handler = vi.fn().mockResolvedValue(undefined);

      router.on('test.event', handler);

      const event = {
        id: '',
        type: 'test.event',
        data: { object: {} },
      };

      await router.dispatch(event);

      expect(handler).toHaveBeenCalledWith(event);
    });

    it('should handle event with null data object', async () => {
      const router = new WebhookRouter();
      const handler = vi.fn().mockResolvedValue(undefined);

      router.on('test.event', handler);

      const event = {
        id: 'evt_null_data',
        type: 'test.event',
        data: { object: null },
      };

      await router.dispatch(event);

      expect(handler).toHaveBeenCalledWith(event);
    });

    it('should handle deeply nested router structure', async () => {
      const router = new WebhookRouter();
      const level1 = new WebhookRouter();
      const level2 = new WebhookRouter();

      const handler = vi.fn().mockResolvedValue(undefined);
      level2.on('event', handler);
      level1.route('level2', level2);
      router.route('level1', level1);

      const event = {
        id: 'evt_deep',
        type: 'level1.level2.event',
        data: { object: {} },
      };

      await router.dispatch(event);

      expect(handler).toHaveBeenCalledOnce();
    });

    it('should handle on() with empty array', async () => {
      const router = new WebhookRouter();
      const handler = vi.fn().mockResolvedValue(undefined);

      // Empty array should register nothing
      router.on([], handler);

      const event = {
        id: 'evt_empty_arr',
        type: 'any.event',
        data: { object: {} },
      };

      await router.dispatch(event);

      expect(handler).not.toHaveBeenCalled();
    });

    it('should handle multiple middlewares with errors after first completes', async () => {
      const router = new WebhookRouter();
      const order: string[] = [];

      router.use(async (_event, next) => {
        order.push('mw1-before');
        await next();
        order.push('mw1-after');
      });

      router.use(async () => {
        order.push('mw2-before');
        throw new Error('Middleware 2 failed');
      });

      router.on('test.event', async () => {
        order.push('handler');
      });

      const event = {
        id: 'evt_mw_chain_err',
        type: 'test.event',
        data: { object: {} },
      };

      await expect(router.dispatch(event)).rejects.toThrow('Middleware 2 failed');
      expect(order).toEqual(['mw1-before', 'mw2-before']);
    });

    it('should handle same handler registered for multiple events', async () => {
      const router = new WebhookRouter();
      const sharedHandler = vi.fn().mockResolvedValue(undefined);

      router.on('event.a', sharedHandler);
      router.on('event.b', sharedHandler);

      await router.dispatch({
        id: 'evt_a',
        type: 'event.a',
        data: { object: {} },
      });

      await router.dispatch({
        id: 'evt_b',
        type: 'event.b',
        data: { object: {} },
      });

      expect(sharedHandler).toHaveBeenCalledTimes(2);
    });

    it('should handle event type with special characters', async () => {
      const router = new WebhookRouter();
      const handler = vi.fn().mockResolvedValue(undefined);

      router.on('event_with.special-chars_123', handler);

      const event = {
        id: 'evt_special',
        type: 'event_with.special-chars_123',
        data: { object: {} },
      };

      await router.dispatch(event);

      expect(handler).toHaveBeenCalledOnce();
    });

    it('should handle concurrent dispatch calls', async () => {
      const router = new WebhookRouter();
      const results: string[] = [];

      router.on('async.event', async (event) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        results.push(event.id);
      });

      const events = [
        { id: 'evt_1', type: 'async.event', data: { object: {} } },
        { id: 'evt_2', type: 'async.event', data: { object: {} } },
        { id: 'evt_3', type: 'async.event', data: { object: {} } },
      ];

      await Promise.all(events.map((e) => router.dispatch(e)));

      expect(results).toHaveLength(3);
      expect(results).toContain('evt_1');
      expect(results).toContain('evt_2');
      expect(results).toContain('evt_3');
    });
  });

  describe('PrefixedRouter via group()', () => {
    it('should support use() on prefixed router', async () => {
      const router = new WebhookRouter();
      const order: string[] = [];

      router.group('payment', (group) => {
        group.use(async (_event, next) => {
          order.push('group-middleware');
          await next();
        });
        group.on('received', async () => {
          order.push('handler');
        });
      });

      // Note: middleware from group() is added to parent router
      const event = {
        id: 'evt_prefixed_mw',
        type: 'payment.received',
        data: { object: {} },
      };

      await router.dispatch(event);

      expect(order).toContain('group-middleware');
      expect(order).toContain('handler');
    });

    it('should support array syntax in prefixed router', async () => {
      const router = new WebhookRouter();
      const handler = vi.fn().mockResolvedValue(undefined);

      router.group('transfer', (group) => {
        group.on(['created', 'updated'], handler);
      });

      await router.dispatch({
        id: 'evt_1',
        type: 'transfer.created',
        data: { object: {} },
      });

      await router.dispatch({
        id: 'evt_2',
        type: 'transfer.updated',
        data: { object: {} },
      });

      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('should support chaining in prefixed router', () => {
      const router = new WebhookRouter();

      router.group('payout', (group) => {
        const result = group
          .on('created', vi.fn())
          .on('paid', vi.fn());

        expect(result).toBe(group);
      });
    });
  });

  describe('Fanout error handling refactor', () => {
    it('should separate all-or-nothing strategy clearly', async () => {
      const router = new WebhookRouter();
      const errors: unknown[] = [];

      const handler1 = vi.fn().mockResolvedValue(undefined);
      const handler2 = vi.fn().mockRejectedValue(new Error('Handler 2 failed'));
      const handler3 = vi.fn().mockResolvedValue(undefined);

      router.fanout('payment_intent.succeeded', [handler1, handler2, handler3], {
        strategy: 'all-or-nothing',
      });

      const event = {
        id: 'evt_all_or_nothing',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_test' } },
      };

      try {
        await router.dispatch(event);
      } catch (error) {
        errors.push(error);
      }

      expect(errors).toHaveLength(1);
      expect(errors[0]).toBeInstanceOf(Error);
      expect((errors[0] as Error).message).toBe('Handler 2 failed');
    });

    it('should separate best-effort strategy clearly', async () => {
      const router = new WebhookRouter();
      const capturedErrors: Error[] = [];

      const handler1 = vi.fn().mockResolvedValue(undefined);
      const handler2 = vi.fn().mockRejectedValue(new Error('Handler 2 failed'));
      const handler3 = vi.fn().mockResolvedValue(undefined);

      router.fanout('payment_intent.succeeded', [handler1, handler2, handler3], {
        strategy: 'best-effort',
        onError: (error) => capturedErrors.push(error),
      });

      const event = {
        id: 'evt_best_effort',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_test' } },
      };

      // Should not throw with best-effort strategy
      await expect(router.dispatch(event)).resolves.toBeUndefined();

      expect(handler1).toHaveBeenCalledOnce();
      expect(handler2).toHaveBeenCalledOnce();
      expect(handler3).toHaveBeenCalledOnce();
      expect(capturedErrors).toHaveLength(1);
      expect(capturedErrors[0]?.message).toBe('Handler 2 failed');
    });
  });

  describe('Empty string validation', () => {
    it('should reject empty string event type in on()', () => {
      const router = new WebhookRouter();
      const handler = vi.fn();

      expect(() => {
        router.on('', handler);
      }).toThrow('Event type cannot be an empty string or whitespace');
    });

    it('should reject whitespace-only event type in on()', () => {
      const router = new WebhookRouter();
      const handler = vi.fn();

      expect(() => {
        router.on('   ', handler);
      }).toThrow('Event type cannot be an empty string or whitespace');
    });

    it('should warn on empty array in on()', () => {
      const router = new WebhookRouter();
      const handler = vi.fn();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      router.on([], handler);

      expect(warnSpy).toHaveBeenCalledWith(
        'WebhookRouter.on(): Empty event array passed. No handlers registered.'
      );
      warnSpy.mockRestore();
    });

    it('should reject empty string prefix in route()', () => {
      const router = new WebhookRouter();
      const nested = new WebhookRouter();

      expect(() => {
        router.route('', nested);
      }).toThrow('Route prefix cannot be an empty string or whitespace');
    });

    it('should reject whitespace-only prefix in route()', () => {
      const router = new WebhookRouter();
      const nested = new WebhookRouter();

      expect(() => {
        router.route('   ', nested);
      }).toThrow('Route prefix cannot be an empty string or whitespace');
    });

    it('should reject empty string prefix in group()', () => {
      const router = new WebhookRouter();

      expect(() => {
        router.group('', () => {});
      }).toThrow('Group prefix cannot be an empty string or whitespace');
    });

    it('should reject whitespace-only prefix in group()', () => {
      const router = new WebhookRouter();

      expect(() => {
        router.group('   ', () => {});
      }).toThrow('Group prefix cannot be an empty string or whitespace');
    });

    it('should reject empty string event type in PrefixedRouter.on()', () => {
      const router = new WebhookRouter();
      const handler = vi.fn();

      expect(() => {
        router.group('test', (group) => {
          group.on('', handler);
        });
      }).toThrow('Event type cannot be an empty string or whitespace');
    });

    it('should warn on empty array in PrefixedRouter.on()', () => {
      const router = new WebhookRouter();
      const handler = vi.fn();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      router.group('test', (group) => {
        group.on([], handler);
      });

      expect(warnSpy).toHaveBeenCalledWith(
        'PrefixedRouter.on(): Empty event array passed. No handlers registered.'
      );
      warnSpy.mockRestore();
    });
  });

  describe('Middleware next() call prevention', () => {
    it('should detect multiple next() calls and throw error', async () => {
      const router = new WebhookRouter();

      router.use(async (_event, next) => {
        await next();
        // Try to call next again - should throw
        await next();
      });

      router.on('test.event', vi.fn().mockResolvedValue(undefined));

      const event = {
        id: 'evt_multi_next',
        type: 'test.event',
        data: { object: {} },
      };

      await expect(router.dispatch(event)).rejects.toThrow(
        'Middleware next() function called multiple times'
      );
    });

    it('should allow single next() call in middleware', async () => {
      const router = new WebhookRouter();
      const handler = vi.fn().mockResolvedValue(undefined);

      router.use(async (_event, next) => {
        await next();
      });

      router.on('test.event', handler);

      const event = {
        id: 'evt_single_next',
        type: 'test.event',
        data: { object: {} },
      };

      await expect(router.dispatch(event)).resolves.toBeUndefined();
      expect(handler).toHaveBeenCalledOnce();
    });

    it('should detect multiple next() calls across multiple middlewares', async () => {
      const router = new WebhookRouter();

      router.use(async (_event, next) => {
        await next();
        await next(); // Second call should trigger error
      });

      router.use(async (_event, next) => {
        await next();
      });

      router.on('test.event', vi.fn().mockResolvedValue(undefined));

      const event = {
        id: 'evt_multi_mw',
        type: 'test.event',
        data: { object: {} },
      };

      await expect(router.dispatch(event)).rejects.toThrow(
        'Middleware next() function called multiple times'
      );
    });

    it('should allow middleware to skip next() call entirely', async () => {
      const router = new WebhookRouter();
      const handler = vi.fn().mockResolvedValue(undefined);

      router.use(async () => {
        // Intentionally not calling next
      });

      router.on('test.event', handler);

      const event = {
        id: 'evt_skip_next',
        type: 'test.event',
        data: { object: {} },
      };

      await expect(router.dispatch(event)).resolves.toBeUndefined();
      // Handler should not be called because next was not called
      expect(handler).not.toHaveBeenCalled();
    });
  });
});
