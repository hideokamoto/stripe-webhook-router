import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { EventBridgeEvent, Context } from 'aws-lambda';
import { eventBridgeAdapter } from '../src/index.js';
import { WebhookRouter } from '@tayori/core';

describe('eventBridgeAdapter', () => {
  let mockContext: Context;
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

  it('should return a Lambda handler function', () => {
    const handler = eventBridgeAdapter(router);
    expect(typeof handler).toBe('function');
  });

  it('should call handlers for matching event type', async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    router.on('payment_intent.succeeded', handler);

    const lambdaHandler = eventBridgeAdapter(router);

    const event: EventBridgeEvent<string, unknown> = {
      version: '0',
      id: 'evt_123',
      'detail-type': 'payment_intent.succeeded',
      source: 'stripe',
      account: '123456789012',
      time: '2021-01-01T00:00:00Z',
      region: 'us-east-1',
      resources: [],
      detail: {
        id: 'evt_123',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_123' } },
      },
    };

    await lambdaHandler(event, mockContext);

    expect(handler).toHaveBeenCalledOnce();
  });

  it('should extract event from detail field', async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    router.on('invoice.paid', handler);

    const lambdaHandler = eventBridgeAdapter(router);

    const stripeEvent = {
      id: 'evt_456',
      type: 'invoice.paid',
      data: { object: { id: 'inv_123', amount_paid: 1000 } },
    };

    const event: EventBridgeEvent<string, unknown> = {
      version: '0',
      id: 'test-id',
      'detail-type': 'invoice.paid',
      source: 'stripe',
      account: '123456789012',
      time: '2021-01-01T00:00:00Z',
      region: 'us-east-1',
      resources: [],
      detail: stripeEvent,
    };

    await lambdaHandler(event, mockContext);

    expect(handler).toHaveBeenCalledWith(stripeEvent);
  });

  it('should not call handlers for non-matching events', async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    router.on('payment_intent.succeeded', handler);

    const lambdaHandler = eventBridgeAdapter(router);

    const event: EventBridgeEvent<string, unknown> = {
      version: '0',
      id: 'evt_789',
      'detail-type': 'invoice.paid',
      source: 'stripe',
      account: '123456789012',
      time: '2021-01-01T00:00:00Z',
      region: 'us-east-1',
      resources: [],
      detail: {
        id: 'evt_789',
        type: 'invoice.paid',
        data: { object: { id: 'inv_789' } },
      },
    };

    await lambdaHandler(event, mockContext);

    expect(handler).not.toHaveBeenCalled();
  });

  it('should call custom onError handler when provided', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('Handler error'));
    const onError = vi.fn();
    router.on('payment_intent.succeeded', handler);

    const lambdaHandler = eventBridgeAdapter(router, { onError });

    const event: EventBridgeEvent<string, unknown> = {
      version: '0',
      id: 'evt_123',
      'detail-type': 'payment_intent.succeeded',
      source: 'stripe',
      account: '123456789012',
      time: '2021-01-01T00:00:00Z',
      region: 'us-east-1',
      resources: [],
      detail: {
        id: 'evt_123',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_123' } },
      },
    };

    await expect(lambdaHandler(event, mockContext)).rejects.toThrow('Handler error');
    expect(onError).toHaveBeenCalled();
  });
});
