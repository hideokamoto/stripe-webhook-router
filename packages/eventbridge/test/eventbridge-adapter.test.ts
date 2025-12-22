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

  describe('error handling', () => {
    it('should throw error without onError handler', async () => {
      const handler = vi.fn().mockRejectedValue(new Error('Handler failed'));
      router.on('payment_intent.succeeded', handler);

      const lambdaHandler = eventBridgeAdapter(router);

      const event: EventBridgeEvent<string, unknown> = {
        version: '0',
        id: 'evt_err_1',
        'detail-type': 'payment_intent.succeeded',
        source: 'stripe',
        account: '123456789012',
        time: '2021-01-01T00:00:00Z',
        region: 'us-east-1',
        resources: [],
        detail: {
          id: 'evt_err_1',
          type: 'payment_intent.succeeded',
          data: { object: { id: 'pi_err_1' } },
        },
      };

      await expect(lambdaHandler(event, mockContext)).rejects.toThrow('Handler failed');
    });

    it('should convert non-Error thrown values to Error', async () => {
      const handler = vi.fn().mockRejectedValue('string error');
      const onError = vi.fn();
      router.on('payment_intent.succeeded', handler);

      const lambdaHandler = eventBridgeAdapter(router, { onError });

      const event: EventBridgeEvent<string, unknown> = {
        version: '0',
        id: 'evt_str_err',
        'detail-type': 'payment_intent.succeeded',
        source: 'stripe',
        account: '123456789012',
        time: '2021-01-01T00:00:00Z',
        region: 'us-east-1',
        resources: [],
        detail: {
          id: 'evt_str_err',
          type: 'payment_intent.succeeded',
          data: { object: { id: 'pi_str_err' } },
        },
      };

      await expect(lambdaHandler(event, mockContext)).rejects.toThrow('string error');
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'string error' }),
        expect.any(Object)
      );
    });

    it('should pass webhook event to onError callback', async () => {
      const handler = vi.fn().mockRejectedValue(new Error('Test error'));
      const onError = vi.fn();
      router.on('invoice.paid', handler);

      const lambdaHandler = eventBridgeAdapter(router, { onError });

      const webhookEvent = {
        id: 'evt_webhook',
        type: 'invoice.paid',
        data: { object: { id: 'inv_123', amount: 5000 } },
      };

      const event: EventBridgeEvent<string, unknown> = {
        version: '0',
        id: 'evt_eb',
        'detail-type': 'invoice.paid',
        source: 'stripe',
        account: '123456789012',
        time: '2021-01-01T00:00:00Z',
        region: 'us-east-1',
        resources: [],
        detail: webhookEvent,
      };

      await expect(lambdaHandler(event, mockContext)).rejects.toThrow('Test error');
      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        webhookEvent
      );
    });
  });

  describe('edge cases', () => {
    it('should handle events with no registered handlers gracefully', async () => {
      const lambdaHandler = eventBridgeAdapter(router);

      const event: EventBridgeEvent<string, unknown> = {
        version: '0',
        id: 'evt_no_handler',
        'detail-type': 'unregistered.event',
        source: 'stripe',
        account: '123456789012',
        time: '2021-01-01T00:00:00Z',
        region: 'us-east-1',
        resources: [],
        detail: {
          id: 'evt_no_handler',
          type: 'unregistered.event',
          data: { object: {} },
        },
      };

      await expect(lambdaHandler(event, mockContext)).resolves.toBeUndefined();
    });

    it('should throw error when detail field is null', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      router.on('test.event', handler);

      const lambdaHandler = eventBridgeAdapter(router);

      const event: EventBridgeEvent<string, unknown> = {
        version: '0',
        id: 'evt_null_detail',
        'detail-type': 'test.event',
        source: 'stripe',
        account: '123456789012',
        time: '2021-01-01T00:00:00Z',
        region: 'us-east-1',
        resources: [],
        detail: null,
      };

      // With null detail, dispatch throws because it cannot read event.type
      await expect(lambdaHandler(event, mockContext)).rejects.toThrow();
      expect(handler).not.toHaveBeenCalled();
    });

    it('should handle multiple handlers for the same event', async () => {
      const order: number[] = [];
      const handler1 = vi.fn(async () => { order.push(1); });
      const handler2 = vi.fn(async () => { order.push(2); });

      router.on('customer.created', handler1);
      router.on('customer.created', handler2);

      const lambdaHandler = eventBridgeAdapter(router);

      const event: EventBridgeEvent<string, unknown> = {
        version: '0',
        id: 'evt_multi',
        'detail-type': 'customer.created',
        source: 'stripe',
        account: '123456789012',
        time: '2021-01-01T00:00:00Z',
        region: 'us-east-1',
        resources: [],
        detail: {
          id: 'evt_multi',
          type: 'customer.created',
          data: { object: { id: 'cus_multi' } },
        },
      };

      await lambdaHandler(event, mockContext);

      expect(handler1).toHaveBeenCalledOnce();
      expect(handler2).toHaveBeenCalledOnce();
      expect(order).toEqual([1, 2]);
    });

    it('should handle empty resources array', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      router.on('charge.captured', handler);

      const lambdaHandler = eventBridgeAdapter(router);

      const event: EventBridgeEvent<string, unknown> = {
        version: '0',
        id: 'evt_empty_res',
        'detail-type': 'charge.captured',
        source: 'stripe',
        account: '123456789012',
        time: '2021-01-01T00:00:00Z',
        region: 'us-east-1',
        resources: [],
        detail: {
          id: 'evt_empty_res',
          type: 'charge.captured',
          data: { object: { id: 'ch_123' } },
        },
      };

      await lambdaHandler(event, mockContext);

      expect(handler).toHaveBeenCalledOnce();
    });

    it('should handle detail with nested objects', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      router.on('checkout.session.completed', handler);

      const lambdaHandler = eventBridgeAdapter(router);

      const complexDetail = {
        id: 'evt_complex',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_123',
            customer: { id: 'cus_456', email: 'test@example.com' },
            line_items: [
              { id: 'li_1', price: { unit_amount: 1000 } },
              { id: 'li_2', price: { unit_amount: 2000 } },
            ],
            metadata: { order_id: 'ord_789' },
          },
        },
      };

      const event: EventBridgeEvent<string, unknown> = {
        version: '0',
        id: 'evt_complex',
        'detail-type': 'checkout.session.completed',
        source: 'stripe',
        account: '123456789012',
        time: '2021-01-01T00:00:00Z',
        region: 'us-east-1',
        resources: [],
        detail: complexDetail,
      };

      await lambdaHandler(event, mockContext);

      expect(handler).toHaveBeenCalledWith(complexDetail);
    });
  });

  describe('middleware integration', () => {
    it('should execute middleware before handlers', async () => {
      const order: string[] = [];

      router.use(async (_event, next) => {
        order.push('middleware-before');
        await next();
        order.push('middleware-after');
      });

      router.on('subscription_schedule.created', async () => {
        order.push('handler');
      });

      const lambdaHandler = eventBridgeAdapter(router);

      const event: EventBridgeEvent<string, unknown> = {
        version: '0',
        id: 'evt_mw',
        'detail-type': 'subscription_schedule.created',
        source: 'stripe',
        account: '123456789012',
        time: '2021-01-01T00:00:00Z',
        region: 'us-east-1',
        resources: [],
        detail: {
          id: 'evt_mw',
          type: 'subscription_schedule.created',
          data: { object: { id: 'ss_123' } },
        },
      };

      await lambdaHandler(event, mockContext);

      expect(order).toEqual(['middleware-before', 'handler', 'middleware-after']);
    });

    it('should allow middleware to short-circuit', async () => {
      const handler = vi.fn();

      router.use(async (_event, _next) => {
        // Not calling next - short-circuit
      });
      router.on('payment_method.attached', handler);

      const lambdaHandler = eventBridgeAdapter(router);

      const event: EventBridgeEvent<string, unknown> = {
        version: '0',
        id: 'evt_short',
        'detail-type': 'payment_method.attached',
        source: 'stripe',
        account: '123456789012',
        time: '2021-01-01T00:00:00Z',
        region: 'us-east-1',
        resources: [],
        detail: {
          id: 'evt_short',
          type: 'payment_method.attached',
          data: { object: { id: 'pm_123' } },
        },
      };

      await lambdaHandler(event, mockContext);

      expect(handler).not.toHaveBeenCalled();
    });
  });
});
