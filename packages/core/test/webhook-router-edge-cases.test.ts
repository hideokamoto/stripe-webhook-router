import { describe, it, expect, vi } from 'vitest';
import { WebhookRouter } from '../src/index.js';

describe('WebhookRouter - Edge Cases', () => {
  describe('empty string event type', () => {
    it('should register handlers for empty string event types', async () => {
      const router = new WebhookRouter();
      const handler = vi.fn().mockResolvedValue(undefined);

      router.on('', handler);

      const event = {
        id: 'evt_empty',
        type: '',
        data: { object: {} },
      };

      await router.dispatch(event);

      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith(event);
    });

    it('should not match empty event type with non-empty event types', async () => {
      const router = new WebhookRouter();
      const handler = vi.fn().mockResolvedValue(undefined);

      router.on('', handler);

      const event = {
        id: 'evt_nonempty',
        type: 'some.event',
        data: { object: {} },
      };

      await router.dispatch(event);

      expect(handler).not.toHaveBeenCalled();
    });

    it('should dispatch to correct handler when multiple empty handlers registered', async () => {
      const router = new WebhookRouter();
      const handler1 = vi.fn().mockResolvedValue(undefined);
      const handler2 = vi.fn().mockResolvedValue(undefined);

      router.on('', handler1);
      router.on('', handler2);

      const event = {
        id: 'evt_empty2',
        type: '',
        data: { object: {} },
      };

      await router.dispatch(event);

      expect(handler1).toHaveBeenCalledOnce();
      expect(handler2).toHaveBeenCalledOnce();
    });

    it('should allow empty string in array of event types', async () => {
      const router = new WebhookRouter();
      const handler = vi.fn().mockResolvedValue(undefined);

      router.on(['', 'some.event'], handler);

      const emptyEvent = {
        id: 'evt_1',
        type: '',
        data: { object: {} },
      };

      const otherEvent = {
        id: 'evt_2',
        type: 'some.event',
        data: { object: {} },
      };

      await router.dispatch(emptyEvent);
      await router.dispatch(otherEvent);

      expect(handler).toHaveBeenCalledTimes(2);
    });
  });

  describe('handler return values', () => {
    it('should accept handlers that return undefined', async () => {
      const router = new WebhookRouter();
      const handler = vi.fn(async () => undefined);

      router.on('test.event', handler);

      const event = {
        id: 'evt_undef',
        type: 'test.event',
        data: { object: {} },
      };

      await expect(router.dispatch(event)).resolves.toBeUndefined();
      expect(handler).toHaveBeenCalledOnce();
    });

    it('should accept handlers that explicitly return void', async () => {
      const router = new WebhookRouter();
      const handler = vi.fn(async (): Promise<void> => {});

      router.on('test.event', handler);

      const event = {
        id: 'evt_void',
        type: 'test.event',
        data: { object: {} },
      };

      await expect(router.dispatch(event)).resolves.toBeUndefined();
      expect(handler).toHaveBeenCalledOnce();
    });

    it('should accept handlers that return null', async () => {
      const router = new WebhookRouter();
      const handler = vi.fn(async () => null);

      router.on('test.event', handler);

      const event = {
        id: 'evt_null',
        type: 'test.event',
        data: { object: {} },
      };

      // Note: This tests that handlers returning non-void don't break the router
      // Even though return values are not used by the router
      await expect(router.dispatch(event)).resolves.toBeUndefined();
      expect(handler).toHaveBeenCalledOnce();
    });

    it('should accept handlers that return arbitrary values', async () => {
      const router = new WebhookRouter();
      const handler = vi.fn(async () => ({ status: 'processed' }));

      router.on('test.event', handler);

      const event = {
        id: 'evt_obj',
        type: 'test.event',
        data: { object: {} },
      };

      await expect(router.dispatch(event)).resolves.toBeUndefined();
      expect(handler).toHaveBeenCalledOnce();
    });

    it('should handle handlers with side effects', async () => {
      const router = new WebhookRouter();
      const sideEffects: string[] = [];

      const handler = vi.fn(async () => {
        sideEffects.push('effect');
        return undefined;
      });

      router.on('test.event', handler);

      const event = {
        id: 'evt_side',
        type: 'test.event',
        data: { object: {} },
      };

      await router.dispatch(event);

      expect(sideEffects).toEqual(['effect']);
      expect(handler).toHaveBeenCalledOnce();
    });

    it('should execute multiple handlers even with different return types', async () => {
      const router = new WebhookRouter();
      const results: unknown[] = [];

      const handler1 = vi.fn(async () => {
        results.push(undefined);
        return undefined;
      });

      const handler2 = vi.fn(async () => {
        results.push('string');
        return 'string';
      });

      const handler3 = vi.fn(async () => {
        results.push(123);
        return 123;
      });

      router.on('test.event', handler1);
      router.on('test.event', handler2);
      router.on('test.event', handler3);

      const event = {
        id: 'evt_mixed',
        type: 'test.event',
        data: { object: {} },
      };

      await router.dispatch(event);

      expect(handler1).toHaveBeenCalledOnce();
      expect(handler2).toHaveBeenCalledOnce();
      expect(handler3).toHaveBeenCalledOnce();
      expect(results).toEqual([undefined, 'string', 123]);
    });

    it('should ignore return values from fanout handlers', async () => {
      const router = new WebhookRouter();
      const handler1 = vi.fn(async () => ({ value: 1 }));
      const handler2 = vi.fn(async () => ({ value: 2 }));
      const handler3 = vi.fn(async () => ({ value: 3 }));

      router.fanout('test.event', [handler1, handler2, handler3]);

      const event = {
        id: 'evt_fanout_ret',
        type: 'test.event',
        data: { object: {} },
      };

      await expect(router.dispatch(event)).resolves.toBeUndefined();
      expect(handler1).toHaveBeenCalledOnce();
      expect(handler2).toHaveBeenCalledOnce();
      expect(handler3).toHaveBeenCalledOnce();
    });

    it('should handle async functions with delayed execution', async () => {
      const router = new WebhookRouter();
      const executionOrder: number[] = [];

      const handler = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        executionOrder.push(1);
        return undefined;
      });

      router.on('test.event', handler);

      const event = {
        id: 'evt_async',
        type: 'test.event',
        data: { object: {} },
      };

      await router.dispatch(event);

      expect(executionOrder).toEqual([1]);
      expect(handler).toHaveBeenCalledOnce();
    });

    it('should handle handlers that await multiple operations', async () => {
      const router = new WebhookRouter();
      const operations: string[] = [];

      const handler = vi.fn(async () => {
        await Promise.resolve();
        operations.push('op1');
        await Promise.resolve();
        operations.push('op2');
        return undefined;
      });

      router.on('test.event', handler);

      const event = {
        id: 'evt_multi_await',
        type: 'test.event',
        data: { object: {} },
      };

      await router.dispatch(event);

      expect(operations).toEqual(['op1', 'op2']);
      expect(handler).toHaveBeenCalledOnce();
    });
  });

  describe('event type variations', () => {
    it('should distinguish between similar event types', async () => {
      const router = new WebhookRouter();
      const handler1 = vi.fn().mockResolvedValue(undefined);
      const handler2 = vi.fn().mockResolvedValue(undefined);

      router.on('event.type', handler1);
      router.on('event.types', handler2);

      await router.dispatch({
        id: 'evt_1',
        type: 'event.type',
        data: { object: {} },
      });

      expect(handler1).toHaveBeenCalledOnce();
      expect(handler2).not.toHaveBeenCalled();
    });

    it('should be case-sensitive for event types', async () => {
      const router = new WebhookRouter();
      const handler1 = vi.fn().mockResolvedValue(undefined);
      const handler2 = vi.fn().mockResolvedValue(undefined);

      router.on('Event.Type', handler1);
      router.on('event.type', handler2);

      await router.dispatch({
        id: 'evt_case',
        type: 'event.type',
        data: { object: {} },
      });

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledOnce();
    });

    it('should handle event types with leading/trailing spaces', async () => {
      const router = new WebhookRouter();
      const handler1 = vi.fn().mockResolvedValue(undefined);
      const handler2 = vi.fn().mockResolvedValue(undefined);

      router.on(' event.type', handler1);
      router.on('event.type ', handler2);

      // The handlers registered with spaces will not match the exact event type
      await router.dispatch({
        id: 'evt_spaces',
        type: 'event.type',
        data: { object: {} },
      });

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });

    it('should handle very long event type names', async () => {
      const router = new WebhookRouter();
      const handler = vi.fn().mockResolvedValue(undefined);
      const longEventType = 'a'.repeat(1000);

      router.on(longEventType, handler);

      await router.dispatch({
        id: 'evt_long',
        type: longEventType,
        data: { object: {} },
      });

      expect(handler).toHaveBeenCalledOnce();
    });

    it('should handle event types with special characters', async () => {
      const router = new WebhookRouter();
      const handler = vi.fn().mockResolvedValue(undefined);

      router.on('event.type_special-123!@#$', handler);

      await router.dispatch({
        id: 'evt_special',
        type: 'event.type_special-123!@#$',
        data: { object: {} },
      });

      expect(handler).toHaveBeenCalledOnce();
    });
  });

  describe('data object edge cases', () => {
    it('should handle events with deeply nested data objects', async () => {
      const router = new WebhookRouter();
      const handler = vi.fn().mockResolvedValue(undefined);

      router.on('test.event', handler);

      const deepObject = { level1: { level2: { level3: { level4: 'deep' } } } };

      await router.dispatch({
        id: 'evt_deep',
        type: 'test.event',
        data: { object: deepObject },
      });

      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { object: deepObject },
        })
      );
    });

    it('should handle events with array data objects', async () => {
      const router = new WebhookRouter();
      const handler = vi.fn().mockResolvedValue(undefined);

      router.on('test.event', handler);

      await router.dispatch({
        id: 'evt_array',
        type: 'test.event',
        data: { object: [1, 2, 3] as unknown },
      });

      expect(handler).toHaveBeenCalledOnce();
    });

    it('should handle events with empty object', async () => {
      const router = new WebhookRouter();
      const handler = vi.fn().mockResolvedValue(undefined);

      router.on('test.event', handler);

      await router.dispatch({
        id: 'evt_empty_obj',
        type: 'test.event',
        data: { object: {} },
      });

      expect(handler).toHaveBeenCalledOnce();
    });
  });
});
