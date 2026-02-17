import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { EventBridgeEvent, Context } from 'aws-lambda';
import { eventBridgeAdapter } from '../src/index.js';
import { WebhookRouter, type WebhookEvent } from '@tayori/core';

describe('eventBridgeAdapter - Edge Cases', () => {
  let mockEvent: Partial<EventBridgeEvent<string, unknown>>;
  let mockContext: Partial<Context>;
  let router: WebhookRouter;

  const testEvent = {
    id: 'evt_123',
    type: 'test.event',
    data: { object: { id: 'test_123' } },
  };

  beforeEach(() => {
    mockEvent = {
      detail: testEvent,
      'detail-type': 'Test Event',
      source: 'custom.app',
      account: '123456789012',
      time: new Date().toISOString(),
      region: 'us-east-1',
      resources: [],
      version: '0',
      id: 'ebid_123',
    };

    mockContext = {
      functionName: 'test-function',
    };

    router = new WebhookRouter();
  });

  describe('missing or invalid detail', () => {
    it('should handle missing detail property', async () => {
      mockEvent.detail = undefined as unknown;

      const handler = eventBridgeAdapter(router);

      // Should throw when trying to dispatch
      await expect(
        handler(mockEvent as any, mockContext as any)
      ).rejects.toThrow();
    });

    it('should handle null detail', async () => {
      mockEvent.detail = null as unknown;

      const handler = eventBridgeAdapter(router);

      await expect(
        handler(mockEvent as any, mockContext as any)
      ).rejects.toThrow();
    });

    it('should handle detail as empty object', async () => {
      mockEvent.detail = {} as any;

      const handler = eventBridgeAdapter(router);

      // Empty object is passed through, resolves since no handlers match
      const result = handler(mockEvent as any, mockContext as any);
      await expect(result).resolves.toBeUndefined();
    });

    it('should handle detail missing required event properties', async () => {
      mockEvent.detail = { id: 'evt_123' } as any; // Missing type and data

      const handler = eventBridgeAdapter(router);

      // Even with missing properties, it processes without throwing
      const result = handler(mockEvent as any, mockContext as any);
      await expect(result).resolves.toBeUndefined();
    });
  });

  describe('handler invocation', () => {
    it('should call registered handler with extracted event', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      router.on('test.event', handler);

      const adapter = eventBridgeAdapter(router);

      await adapter(mockEvent as any, mockContext as any);

      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith(testEvent);
    });

    it('should not call handlers for unregistered event types', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      router.on('other.event', handler);

      const adapter = eventBridgeAdapter(router);

      await adapter(mockEvent as any, mockContext as any);

      expect(handler).not.toHaveBeenCalled();
    });

    it('should call multiple handlers for the same event', async () => {
      const handler1 = vi.fn().mockResolvedValue(undefined);
      const handler2 = vi.fn().mockResolvedValue(undefined);

      router.on('test.event', handler1);
      router.on('test.event', handler2);

      const adapter = eventBridgeAdapter(router);

      await adapter(mockEvent as any, mockContext as any);

      expect(handler1).toHaveBeenCalledOnce();
      expect(handler2).toHaveBeenCalledOnce();
    });
  });

  describe('error handling', () => {
    it('should propagate handler errors', async () => {
      const handler = vi.fn().mockRejectedValue(new Error('Handler failed'));
      router.on('test.event', handler);

      const adapter = eventBridgeAdapter(router);

      await expect(
        adapter(mockEvent as any, mockContext as any)
      ).rejects.toThrow('Handler failed');
    });

    it('should call onError handler when provided', async () => {
      const handler = vi.fn().mockRejectedValue(new Error('Test error'));
      const errorHandler = vi.fn();

      router.on('test.event', handler);

      const adapter = eventBridgeAdapter(router, { onError: errorHandler });

      await expect(
        adapter(mockEvent as any, mockContext as any)
      ).rejects.toThrow('Test error');

      expect(errorHandler).toHaveBeenCalledWith(
        expect.any(Error),
        testEvent as WebhookEvent
      );
    });

    it('should call onError even if it throws', async () => {
      const handler = vi.fn().mockRejectedValue(new Error('Handler error'));
      const errorHandler = vi.fn().mockImplementation(() => {
        throw new Error('onError failed');
      });

      router.on('test.event', handler);

      const adapter = eventBridgeAdapter(router, { onError: errorHandler });

      // If onError throws, that error will be propagated
      await expect(
        adapter(mockEvent as any, mockContext as any)
      ).rejects.toThrow('onError failed');

      expect(errorHandler).toHaveBeenCalled();
    });

    it('should handle handler throwing non-Error objects', async () => {
      const handler = vi.fn().mockImplementation(() => {
        throw 'string error';
      });

      router.on('test.event', handler);

      const adapter = eventBridgeAdapter(router);

      await expect(
        adapter(mockEvent as any, mockContext as any)
      ).rejects.toThrow();
    });

    it('should convert non-Error objects in onError handler', async () => {
      const handler = vi.fn().mockImplementation(() => {
        throw { custom: 'error' };
      });
      const errorHandler = vi.fn();

      router.on('test.event', handler);

      const adapter = eventBridgeAdapter(router, { onError: errorHandler });

      await expect(
        adapter(mockEvent as any, mockContext as any)
      ).rejects.toThrow();

      expect(errorHandler).toHaveBeenCalled();
    });
  });

  describe('event detail variations', () => {
    it('should handle large event details', async () => {
      const largeEvent: WebhookEvent = {
        id: 'evt_large',
        type: 'test.event',
        data: { object: { content: 'x'.repeat(10 * 1024 * 1024) } },
      };

      mockEvent.detail = largeEvent;

      const handler = vi.fn().mockResolvedValue(undefined);
      router.on('test.event', handler);

      const adapter = eventBridgeAdapter(router);

      await adapter(mockEvent as any, mockContext as any);

      expect(handler).toHaveBeenCalledOnce();
    });

    it('should handle event details with special characters', async () => {
      const specialEvent: WebhookEvent = {
        id: 'evt_special',
        type: 'test.event',
        data: { object: { text: '你好世界 🎉 \n\t\r' } },
      };

      mockEvent.detail = specialEvent;

      const handler = vi.fn().mockResolvedValue(undefined);
      router.on('test.event', handler);

      const adapter = eventBridgeAdapter(router);

      await adapter(mockEvent as any, mockContext as any);

      expect(handler).toHaveBeenCalledOnce();
    });

    it('should handle event details with deeply nested objects', async () => {
      const deepEvent: WebhookEvent = {
        id: 'evt_deep',
        type: 'test.event',
        data: {
          object: {
            level1: {
              level2: {
                level3: {
                  level4: 'deep value',
                },
              },
            },
          },
        },
      };

      mockEvent.detail = deepEvent;

      const handler = vi.fn().mockResolvedValue(undefined);
      router.on('test.event', handler);

      const adapter = eventBridgeAdapter(router);

      await adapter(mockEvent as any, mockContext as any);

      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith(deepEvent);
    });

    it('should handle event types with special characters', async () => {
      const specialTypeEvent: WebhookEvent = {
        id: 'evt_123',
        type: 'test_with.special-chars!@#',
        data: { object: {} },
      };

      mockEvent.detail = specialTypeEvent;

      const handler = vi.fn().mockResolvedValue(undefined);
      router.on('test_with.special-chars!@#', handler);

      const adapter = eventBridgeAdapter(router);

      await adapter(mockEvent as any, mockContext as any);

      expect(handler).toHaveBeenCalledOnce();
    });

    it('should handle empty string event type', async () => {
      const emptyTypeEvent: WebhookEvent = {
        id: 'evt_123',
        type: '',
        data: { object: {} },
      };

      mockEvent.detail = emptyTypeEvent;

      const handler = vi.fn().mockResolvedValue(undefined);
      router.on('', handler);

      const adapter = eventBridgeAdapter(router);

      await adapter(mockEvent as any, mockContext as any);

      expect(handler).toHaveBeenCalledOnce();
    });

    it('should handle event with null data object', async () => {
      const nullDataEvent: WebhookEvent = {
        id: 'evt_123',
        type: 'test.event',
        data: { object: null },
      };

      mockEvent.detail = nullDataEvent;

      const handler = vi.fn().mockResolvedValue(undefined);
      router.on('test.event', handler);

      const adapter = eventBridgeAdapter(router);

      await adapter(mockEvent as any, mockContext as any);

      expect(handler).toHaveBeenCalledOnce();
    });
  });

  describe('EventBridge event properties', () => {
    it('should not require EventBridge-specific properties', async () => {
      // EventBridge event properties are ignored, only detail is extracted
      const minimalEvent = {
        detail: testEvent,
      };

      const handler = vi.fn().mockResolvedValue(undefined);
      router.on('test.event', handler);

      const adapter = eventBridgeAdapter(router);

      await adapter(minimalEvent as any, mockContext as any);

      expect(handler).toHaveBeenCalledOnce();
    });

    it('should extract detail regardless of other EventBridge properties', async () => {
      const eventWithAllProps: EventBridgeEvent<string, unknown> = {
        detail: testEvent,
        'detail-type': 'Custom Event',
        source: 'custom.app',
        account: '123456789012',
        time: new Date().toISOString(),
        region: 'us-east-1',
        resources: ['arn:aws:service:region:account:resource'],
        version: '0',
        id: 'event-id',
      };

      const handler = vi.fn().mockResolvedValue(undefined);
      router.on('test.event', handler);

      const adapter = eventBridgeAdapter(router);

      await adapter(eventWithAllProps, mockContext as any);

      expect(handler).toHaveBeenCalledWith(testEvent);
    });
  });

  describe('context parameter', () => {
    it('should accept context but not use it', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      router.on('test.event', handler);

      const adapter = eventBridgeAdapter(router);

      const contextWithProps = {
        ...mockContext,
        functionName: 'test-fn',
        functionVersion: '$LATEST',
        invokedFunctionArn: 'arn:aws:lambda:region:account:function:test-fn',
        memoryLimitInMB: '128',
        awsRequestId: 'request-id',
        logGroupName: '/aws/lambda/test-fn',
        logStreamName: '2024/01/01/[$LATEST]hash',
        requestId: 'request-id',
        identity: {},
        clientContext: {},
      };

      await adapter(mockEvent as any, contextWithProps as any);

      expect(handler).toHaveBeenCalledOnce();
    });
  });

  describe('async operations', () => {
    it('should handle async handlers with delays', async () => {
      const handler = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      router.on('test.event', handler);

      const adapter = eventBridgeAdapter(router);

      await adapter(mockEvent as any, mockContext as any);

      expect(handler).toHaveBeenCalledOnce();
    });

    it('should handle multiple async handlers in sequence', async () => {
      const order: number[] = [];

      const handler1 = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        order.push(1);
      });

      const handler2 = vi.fn(async () => {
        order.push(2);
      });

      router.on('test.event', handler1);
      router.on('test.event', handler2);

      const adapter = eventBridgeAdapter(router);

      await adapter(mockEvent as any, mockContext as any);

      expect(order).toEqual([1, 2]);
    });
  });
});
