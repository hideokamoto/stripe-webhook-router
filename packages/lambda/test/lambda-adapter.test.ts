import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { lambdaAdapter } from '../src/index.js';
import { WebhookRouter } from '@and-subscribe/core';

// Mock stripe
vi.mock('stripe', () => {
  return {
    default: class Stripe {
      webhooks = {
        constructEvent: vi.fn(),
      };
    },
  };
});

describe('lambdaAdapter', () => {
  let mockEvent: Partial<APIGatewayProxyEvent>;
  let mockContext: Context;
  let router: WebhookRouter;

  beforeEach(() => {
    const eventBody = {
      id: 'evt_123',
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_123' } },
    };

    mockEvent = {
      body: JSON.stringify(eventBody),
      headers: {
        'stripe-signature': 'test_signature',
      },
      isBase64Encoded: false,
    };

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
    const handler = lambdaAdapter(router, {
      webhookSecret: 'whsec_test',
    });

    expect(typeof handler).toBe('function');
  });

  it('should return 200 and call handlers when event matches', async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    router.on('payment_intent.succeeded', handler);

    const lambdaHandler = lambdaAdapter(router, {
      webhookSecret: 'whsec_test',
      skipVerification: true,
    });

    const result = await lambdaHandler(mockEvent as APIGatewayProxyEvent, mockContext);

    expect(handler).toHaveBeenCalledOnce();
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({ received: true });
  });

  it('should return 400 when body is missing', async () => {
    mockEvent.body = null;

    const lambdaHandler = lambdaAdapter(router, {
      webhookSecret: 'whsec_test',
      skipVerification: true,
    });

    const result = await lambdaHandler(mockEvent as APIGatewayProxyEvent, mockContext);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toHaveProperty('error');
  });

  it('should return 400 when signature is missing', async () => {
    mockEvent.headers = {};

    const lambdaHandler = lambdaAdapter(router, {
      webhookSecret: 'whsec_test',
    });

    const result = await lambdaHandler(mockEvent as APIGatewayProxyEvent, mockContext);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toHaveProperty('error');
  });

  it('should handle base64 encoded bodies', async () => {
    const eventBody = {
      id: 'evt_123',
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_123' } },
    };
    mockEvent.body = Buffer.from(JSON.stringify(eventBody)).toString('base64');
    mockEvent.isBase64Encoded = true;

    const handler = vi.fn().mockResolvedValue(undefined);
    router.on('payment_intent.succeeded', handler);

    const lambdaHandler = lambdaAdapter(router, {
      webhookSecret: 'whsec_test',
      skipVerification: true,
    });

    const result = await lambdaHandler(mockEvent as APIGatewayProxyEvent, mockContext);

    expect(handler).toHaveBeenCalledOnce();
    expect(result.statusCode).toBe(200);
  });

  it('should return 500 when handler throws', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('Handler error'));
    router.on('payment_intent.succeeded', handler);

    const lambdaHandler = lambdaAdapter(router, {
      webhookSecret: 'whsec_test',
      skipVerification: true,
    });

    const result = await lambdaHandler(mockEvent as APIGatewayProxyEvent, mockContext);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toHaveProperty('error');
  });

  it('should call custom onError handler when provided', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('Handler error'));
    const onError = vi.fn();
    router.on('payment_intent.succeeded', handler);

    const lambdaHandler = lambdaAdapter(router, {
      webhookSecret: 'whsec_test',
      skipVerification: true,
      onError,
    });

    await lambdaHandler(mockEvent as APIGatewayProxyEvent, mockContext);

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ type: 'payment_intent.succeeded' })
    );
  });
});
