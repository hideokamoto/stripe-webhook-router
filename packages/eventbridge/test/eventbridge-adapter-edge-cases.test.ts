import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { EventBridgeEvent, Context } from 'aws-lambda';
import { eventBridgeAdapter } from '../src/index.js';
import { WebhookRouter, type WebhookEvent } from '@tayori/core';

// Lightweight test helper types
type MockEventBridgeEvent = Partial<EventBridgeEvent<string, unknown>>;
type MockContext = Partial<Context>;

// Helper to invoke adapter with typed mocks
function invokeAdapter(
  adapter: (event: EventBridgeEvent<string, unknown>, context: Context) => Promise<void>,
  event: MockEventBridgeEvent,
  context: MockContext
): Promise<void> {
  return adapter(
    event as EventBridgeEvent<string, unknown>,
    context as Context
  );
}

describe('eventBridgeAdapter - Edge Cases', () => {
  let mockContext: MockContext;
  let router: WebhookRouter;

  beforeEach(() => {
    mockContext = {
      callbackWaitsForEmptyEventLoop: false,
      functionName: 'test',
      functionVersion: '1',
      invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test',
      memoryLimitInMB: '128',
      awsRequestId: 'test-request-id',
      logGroupName: '/aws/lambda/test',
      logStreamName: '2021/01/01/[$LATEST]test',
      getRemainingTimeInMillis: () => 30000,
      done: vi.fn(),
      fail: vi.fn(),
      succeed: vi.fn(),
    };

    router = new WebhookRouter();
  });

  it('should handle large event payloads (100KB)', async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    router.on('test.event', handler);

    const adapter = eventBridgeAdapter(router);

    const largeEvent: MockEventBridgeEvent = {
      version: '0',
      id: 'evt_large',
      'detail-type': 'test.event',
      source: 'test',
      account: '123456789012',
      time: '2021-01-01T00:00:00Z',
      region: 'us-east-1',
      resources: [],
      detail: {
        id: 'evt_large',
        type: 'test.event',
        data: {
          object: {
            content: 'x'.repeat(100 * 1024), // 100KB
          },
        },
      },
    };

    await invokeAdapter(adapter, largeEvent, mockContext);

    expect(handler).toHaveBeenCalledOnce();
  });

  it('should handle events with multiple sequential handlers', async () => {
    vi.useFakeTimers();

    const handler1 = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }).mockResolvedValue(undefined);

    const handler2 = vi.fn().mockResolvedValue(undefined);

    router.on('test.event', handler1);
    router.on('test.event', handler2);

    const adapter = eventBridgeAdapter(router);

    const mockEvent: MockEventBridgeEvent = {
      version: '0',
      id: 'evt_123',
      'detail-type': 'test.event',
      source: 'test',
      account: '123456789012',
      time: '2021-01-01T00:00:00Z',
      region: 'us-east-1',
      resources: [],
      detail: {
        id: 'evt_123',
        type: 'test.event',
        data: { object: { id: 'test_123' } },
      },
    };

    await invokeAdapter(adapter, mockEvent, mockContext);
    vi.advanceTimersByTime(5);
    await vi.runAllTimersAsync();

    expect(handler1).toHaveBeenCalledOnce();
    expect(handler2).toHaveBeenCalledOnce();

    vi.useRealTimers();
  });

  it('should handle events with null detail', async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    router.on('test.event', handler);

    const adapter = eventBridgeAdapter(router);

    const mockEvent: MockEventBridgeEvent = {
      version: '0',
      id: 'evt_null',
      'detail-type': 'test.event',
      source: 'test',
      account: '123456789012',
      time: '2021-01-01T00:00:00Z',
      region: 'us-east-1',
      resources: [],
      detail: null,
    };

    await invokeAdapter(adapter, mockEvent, mockContext);

    // Handler should not be called if detail is null
    expect(handler).not.toHaveBeenCalled();
  });
});
