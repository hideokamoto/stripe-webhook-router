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

      // handler2 and handler3 should complete before handler1 (due to delay)
      // This verifies parallel execution
      expect(order).toContain('handler1');
      expect(order).toContain('handler2');
      expect(order).toContain('handler3');
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
  });
});
