import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { lambdaAdapter } from '../src/index.js';
import { WebhookRouter } from '@tayori/core';
import type Stripe from 'stripe';

describe('lambdaAdapter', () => {
  let mockEvent: Partial<APIGatewayProxyEvent>;
  let mockContext: Context;
  let router: WebhookRouter;
  let mockStripe: Stripe;

  const testEvent = {
    id: 'evt_123',
    type: 'payment_intent.succeeded',
    data: { object: { id: 'pi_123' } },
  };

  beforeEach(() => {
    mockEvent = {
      body: JSON.stringify(testEvent),
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

    // Create mock Stripe instance with constructEvent
    mockStripe = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(testEvent),
      },
    } as unknown as Stripe;
  });

  it('should return a Lambda handler function', () => {
    const handler = lambdaAdapter(router, {
      stripe: mockStripe,
      webhookSecret: 'whsec_test',
    });

    expect(typeof handler).toBe('function');
  });

  it('should return 200 and call handlers when event matches', async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    router.on('payment_intent.succeeded', handler);

    const lambdaHandler = lambdaAdapter(router, {
      stripe: mockStripe,
      webhookSecret: 'whsec_test',
    });

    const result = await lambdaHandler(mockEvent as APIGatewayProxyEvent, mockContext);

    expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
      JSON.stringify(testEvent),
      'test_signature',
      'whsec_test'
    );
    expect(handler).toHaveBeenCalledOnce();
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({ received: true });
  });

  it('should return 400 when body is missing', async () => {
    mockEvent.body = null;

    const lambdaHandler = lambdaAdapter(router, {
      stripe: mockStripe,
      webhookSecret: 'whsec_test',
    });

    const result = await lambdaHandler(mockEvent as APIGatewayProxyEvent, mockContext);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toHaveProperty('error');
  });

  it('should return 400 when signature is missing', async () => {
    mockEvent.headers = {};

    const lambdaHandler = lambdaAdapter(router, {
      stripe: mockStripe,
      webhookSecret: 'whsec_test',
    });

    const result = await lambdaHandler(mockEvent as APIGatewayProxyEvent, mockContext);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toHaveProperty('error');
  });

  it('should return 400 when signature verification fails', async () => {
    (mockStripe.webhooks.constructEvent as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('Invalid signature');
    });

    const lambdaHandler = lambdaAdapter(router, {
      stripe: mockStripe,
      webhookSecret: 'whsec_test',
    });

    const result = await lambdaHandler(mockEvent as APIGatewayProxyEvent, mockContext);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({ error: 'Invalid signature' });
  });

  it('should handle base64 encoded bodies', async () => {
    mockEvent.body = Buffer.from(JSON.stringify(testEvent)).toString('base64');
    mockEvent.isBase64Encoded = true;

    const handler = vi.fn().mockResolvedValue(undefined);
    router.on('payment_intent.succeeded', handler);

    const lambdaHandler = lambdaAdapter(router, {
      stripe: mockStripe,
      webhookSecret: 'whsec_test',
    });

    const result = await lambdaHandler(mockEvent as APIGatewayProxyEvent, mockContext);

    expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
      JSON.stringify(testEvent), // Decoded from base64
      'test_signature',
      'whsec_test'
    );
    expect(handler).toHaveBeenCalledOnce();
    expect(result.statusCode).toBe(200);
  });

  it('should return 500 when handler throws', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('Handler error'));
    router.on('payment_intent.succeeded', handler);

    const lambdaHandler = lambdaAdapter(router, {
      stripe: mockStripe,
      webhookSecret: 'whsec_test',
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
      stripe: mockStripe,
      webhookSecret: 'whsec_test',
      onError,
    });

    await lambdaHandler(mockEvent as APIGatewayProxyEvent, mockContext);

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ type: 'payment_intent.succeeded' })
    );
  });

  it('should handle async onError handler', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('Handler error'));
    const onError = vi.fn().mockResolvedValue(undefined);
    router.on('payment_intent.succeeded', handler);

    const lambdaHandler = lambdaAdapter(router, {
      stripe: mockStripe,
      webhookSecret: 'whsec_test',
      onError,
    });

    const result = await lambdaHandler(mockEvent as APIGatewayProxyEvent, mockContext);

    expect(onError).toHaveBeenCalled();
    expect(result.statusCode).toBe(500);
  });

  it('should not crash if onError throws', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('Handler error'));
    const onError = vi.fn().mockRejectedValue(new Error('onError failed'));
    router.on('payment_intent.succeeded', handler);

    const lambdaHandler = lambdaAdapter(router, {
      stripe: mockStripe,
      webhookSecret: 'whsec_test',
      onError,
    });

    const result = await lambdaHandler(mockEvent as APIGatewayProxyEvent, mockContext);

    expect(onError).toHaveBeenCalled();
    expect(result.statusCode).toBe(500);
  });
});
