import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { lambdaAdapter } from '../src/index.js';
import { WebhookRouter, type Verifier, type WebhookEvent } from '@tayori/core';

// Test helper to create strongly-typed mock events
function createMockEvent(
  overrides?: Partial<APIGatewayProxyEvent>
): APIGatewayProxyEvent {
  const defaults: APIGatewayProxyEvent = {
    resource: '/webhook',
    path: '/webhook',
    httpMethod: 'POST',
    headers: {
      'stripe-signature': 'test_signature',
    },
    multiValueHeaders: {},
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    pathParameters: null,
    stageVariables: null,
    requestContext: {
      resourceId: '123456',
      resourcePath: '/webhook',
      httpMethod: 'POST',
      extendedRequestId: 'test-id',
      requestTime: '09/Apr/2015:12:34:56 +0000',
      path: '/webhook',
      accountId: '123456789012',
      protocol: 'HTTP/1.1',
      stage: 'prod',
      domainPrefix: 'testPrefix',
      requestTimeEpoch: 1428582896000,
      requestId: 'test-request-id',
      identity: {
        sourceIp: '127.0.0.1',
        userAgent: 'test-agent',
      },
      apiId: 'api-id',
      domainName: 'test.com',
    },
    body: JSON.stringify({
      id: 'evt_123',
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_123' } },
    }),
    isBase64Encoded: false,
  };

  return {
    ...defaults,
    ...overrides,
  };
}

// Test helper to create strongly-typed mock context
function createMockContext(overrides?: Partial<Context>): Context {
  const defaults: Context = {
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

  return {
    ...defaults,
    ...overrides,
  };
}

describe('lambdaAdapter - Edge Cases', () => {
  let router: WebhookRouter;
  let mockVerifier: Verifier<WebhookEvent>;

  const testEvent = {
    id: 'evt_123',
    type: 'payment_intent.succeeded',
    data: { object: { id: 'pi_123' } },
  };

  beforeEach(() => {
    router = new WebhookRouter();
    mockVerifier = vi.fn().mockReturnValue({ event: testEvent });
  });

  it('should handle large request bodies (5MB)', async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    router.on('test.event', handler);

    const lambdaHandler = lambdaAdapter(router, {
      verifier: mockVerifier,
    });

    const largeEvent = createMockEvent({
      body: JSON.stringify({
        id: 'evt_large',
        type: 'test.event',
        data: {
          object: {
            content: 'x'.repeat(5 * 1024 * 1024), // 5MB - below 6MB Lambda limit
          },
        },
      }),
    });

    const context = createMockContext();

    const result = await lambdaHandler(largeEvent, context);

    expect(result.statusCode).toBe(200);
    expect(mockVerifier).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Object)
    );
  });

  it('should handle events with custom headers', async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    router.on('payment_intent.succeeded', handler);

    const lambdaHandler = lambdaAdapter(router, {
      verifier: mockVerifier,
    });

    const event = createMockEvent({
      headers: {
        'stripe-signature': 'custom_signature',
        'x-custom-header': 'custom-value',
      },
    });

    const context = createMockContext();

    const result = await lambdaHandler(event, context);

    expect(result.statusCode).toBe(200);
    expect(mockVerifier).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        'stripe-signature': 'custom_signature',
      })
    );
  });

  it('should handle base64 encoded bodies', async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    router.on('payment_intent.succeeded', handler);

    const lambdaHandler = lambdaAdapter(router, {
      verifier: mockVerifier,
    });

    const bodyBuffer = Buffer.from(JSON.stringify(testEvent));
    const base64Body = bodyBuffer.toString('base64');

    const event = createMockEvent({
      body: base64Body,
      isBase64Encoded: true,
    });

    const context = createMockContext();

    const result = await lambdaHandler(event, context);

    expect(result.statusCode).toBe(200);
  });

  it('should handle missing body gracefully', async () => {
    const lambdaHandler = lambdaAdapter(router, {
      verifier: mockVerifier,
    });

    const event = createMockEvent({
      body: null,
    });

    const context = createMockContext();

    const result = await lambdaHandler(event, context);

    expect(result.statusCode).toBe(400);
  });

  it('should handle verifier exceptions', async () => {
    const failingVerifier: Verifier<WebhookEvent> = vi
      .fn()
      .mockImplementation(() => {
        throw new Error('Signature verification failed');
      });

    const lambdaHandler = lambdaAdapter(router, {
      verifier: failingVerifier,
    });

    const event = createMockEvent();
    const context = createMockContext();

    const result = await lambdaHandler(event, context);

    expect(result.statusCode).toBe(400);
  });

  it('should handle multiple event handlers without race conditions', async () => {
    const handler1 = vi.fn().mockResolvedValue(undefined);
    const handler2 = vi.fn().mockResolvedValue(undefined);

    router.on('payment_intent.succeeded', handler1);
    router.on('payment_intent.succeeded', handler2);

    const lambdaHandler = lambdaAdapter(router, {
      verifier: mockVerifier,
    });

    const event = createMockEvent();
    const context = createMockContext();

    const result = await lambdaHandler(event, context);

    expect(result.statusCode).toBe(200);
    expect(handler1).toHaveBeenCalledOnce();
    expect(handler2).toHaveBeenCalledOnce();
  });
});
