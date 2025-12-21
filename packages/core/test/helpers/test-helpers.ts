/**
 * Test helpers and utilities for WebhookRouter tests
 *
 * This file provides factory functions and utilities to reduce
 * code duplication in tests and follow DRY principles.
 */
import { vi } from 'vitest';
import type { WebhookEvent, EventHandler } from '../../src/index.js';

/**
 * Creates a test webhook event with optional overrides
 *
 * @example
 * ```typescript
 * const event = createTestEvent({ type: 'payment_intent.succeeded' });
 * ```
 */
export function createTestEvent(
  overrides: Partial<WebhookEvent> = {}
): WebhookEvent {
  return {
    id: 'evt_test_123',
    type: 'test.event',
    data: { object: {} },
    ...overrides,
  };
}

/**
 * Creates multiple test events
 *
 * @example
 * ```typescript
 * const events = createManyTestEvents(10, { type: 'invoice.paid' });
 * ```
 */
export function createManyTestEvents(
  count: number,
  overrides: Partial<WebhookEvent> = {}
): WebhookEvent[] {
  return Array.from({ length: count }, (_, i) =>
    createTestEvent({
      id: `evt_${i}`,
      ...overrides,
    })
  );
}

/**
 * Handler behavior types
 */
export type HandlerBehavior =
  | 'success'
  | 'error'
  | 'slow'
  | { delay: number }
  | { error: Error };

/**
 * Creates a mock event handler with configurable behavior
 *
 * @example
 * ```typescript
 * const successHandler = createMockHandler('success');
 * const errorHandler = createMockHandler('error');
 * const slowHandler = createMockHandler({ delay: 100 });
 * ```
 */
export function createMockHandler<T extends WebhookEvent = WebhookEvent>(
  behavior: HandlerBehavior = 'success'
): ReturnType<typeof vi.fn<[T], Promise<void>>> {
  const handler = vi.fn<[T], Promise<void>>();

  if (behavior === 'success') {
    handler.mockResolvedValue(undefined);
  } else if (behavior === 'error') {
    handler.mockRejectedValue(new Error('Mock handler error'));
  } else if (behavior === 'slow') {
    handler.mockImplementation(async () => {
      await delay(100);
    });
  } else if (typeof behavior === 'object' && 'delay' in behavior) {
    handler.mockImplementation(async () => {
      await delay(behavior.delay);
    });
  } else if (typeof behavior === 'object' && 'error' in behavior) {
    handler.mockRejectedValue(behavior.error);
  }

  return handler;
}

/**
 * Creates a mock handler that tracks call order
 *
 * @example
 * ```typescript
 * const order: string[] = [];
 * const handler1 = createOrderTrackingHandler('handler1', order);
 * const handler2 = createOrderTrackingHandler('handler2', order);
 * // After calling: order === ['handler1', 'handler2']
 * ```
 */
export function createOrderTrackingHandler<T extends WebhookEvent = WebhookEvent>(
  name: string,
  orderArray: string[]
): ReturnType<typeof vi.fn<[T], Promise<void>>> {
  return vi.fn<[T], Promise<void>>().mockImplementation(async () => {
    orderArray.push(name);
  });
}

/**
 * Creates a mock handler that tracks timing
 *
 * @example
 * ```typescript
 * const timing: TimingInfo[] = [];
 * const handler = createTimingTrackingHandler(0, timing, { delay: 50 });
 * // After calling: timing[0] contains start and end times
 * ```
 */
export interface TimingInfo {
  index: number;
  startTime: number;
  endTime: number;
  duration: number;
}

export function createTimingTrackingHandler<T extends WebhookEvent = WebhookEvent>(
  index: number,
  timingArray: TimingInfo[],
  options: { delay?: number } = {}
): ReturnType<typeof vi.fn<[T], Promise<void>>> {
  return vi.fn<[T], Promise<void>>().mockImplementation(async () => {
    const startTime = Date.now();

    if (options.delay) {
      await delay(options.delay);
    }

    const endTime = Date.now();

    timingArray[index] = {
      index,
      startTime,
      endTime,
      duration: endTime - startTime,
    };
  });
}

/**
 * Helper function to create a delay
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Creates a mock middleware function
 *
 * @example
 * ```typescript
 * const middleware = createMockMiddleware('before', 'after', order);
 * ```
 */
export function createMockMiddleware(
  beforeLabel: string,
  afterLabel: string,
  orderArray: string[]
): ReturnType<typeof vi.fn> {
  return vi.fn(async (_event: WebhookEvent, next: () => Promise<void>) => {
    orderArray.push(beforeLabel);
    await next();
    orderArray.push(afterLabel);
  });
}

/**
 * Creates a mock middleware that modifies the event
 *
 * @example
 * ```typescript
 * const middleware = createEventModifyingMiddleware({ processed: true });
 * ```
 */
export function createEventModifyingMiddleware(
  modifications: Record<string, any>
): ReturnType<typeof vi.fn> {
  return vi.fn(async (event: WebhookEvent, next: () => Promise<void>) => {
    Object.assign(event, modifications);
    await next();
  });
}

/**
 * Assertion helper to check if handlers were called in order
 *
 * @example
 * ```typescript
 * expectCallOrder([handler1, handler2, handler3]);
 * ```
 */
export function expectCallOrder(handlers: Array<ReturnType<typeof vi.fn>>): void {
  const callTimes = handlers.map((handler) => {
    const calls = handler.mock.invocationCallOrder;
    return calls[0] ?? Infinity;
  });

  const sortedCallTimes = [...callTimes].sort((a, b) => a - b);

  expect(callTimes).toEqual(sortedCallTimes);
}

/**
 * Assertion helper to check if all handlers were called
 *
 * @example
 * ```typescript
 * expectAllCalled([handler1, handler2], 1);
 * ```
 */
export function expectAllCalled(
  handlers: Array<ReturnType<typeof vi.fn>>,
  times = 1
): void {
  handlers.forEach((handler) => {
    expect(handler).toHaveBeenCalledTimes(times);
  });
}

/**
 * Assertion helper to check if handlers were NOT called
 *
 * @example
 * ```typescript
 * expectNoneCalled([handler1, handler2]);
 * ```
 */
export function expectNoneCalled(handlers: Array<ReturnType<typeof vi.fn>>): void {
  handlers.forEach((handler) => {
    expect(handler).not.toHaveBeenCalled();
  });
}

/**
 * Waits for all promises to settle (useful for testing concurrent operations)
 *
 * @example
 * ```typescript
 * await waitForAll([promise1, promise2, promise3]);
 * ```
 */
export async function waitForAll<T>(promises: Promise<T>[]): Promise<void> {
  await Promise.allSettled(promises);
}

/**
 * Measures the execution time of an async function
 *
 * @example
 * ```typescript
 * const { result, duration } = await measureExecutionTime(async () => {
 *   await router.dispatch(event);
 * });
 * console.log(`Took ${duration}ms`);
 * ```
 */
export async function measureExecutionTime<T>(
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const start = Date.now();
  const result = await fn();
  const duration = Date.now() - start;

  return { result, duration };
}

/**
 * Creates a spy that can track method calls on an object
 *
 * @example
 * ```typescript
 * const router = new WebhookRouter();
 * const dispatchSpy = createSpy(router, 'dispatch');
 * ```
 */
export function createSpy<T extends object, K extends keyof T>(
  obj: T,
  method: K
): ReturnType<typeof vi.spyOn> {
  return vi.spyOn(obj, method as any);
}
