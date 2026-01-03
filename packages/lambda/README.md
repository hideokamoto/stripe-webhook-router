# @tayori/lambda

AWS Lambda adapter for Tayori webhook router.

## Overview

`@tayori/lambda` provides a seamless integration between Tayori's type-safe webhook routing and AWS Lambda. Perfect for serverless webhook handlers with API Gateway or Lambda Function URLs.

## Installation

```bash
npm install @tayori/lambda @tayori/core
# or
pnpm add @tayori/lambda @tayori/core
# or
yarn add @tayori/lambda @tayori/core
```

**Note**: `@tayori/core` is a peer dependency and must be installed separately.

## Features

- **Serverless-Ready**: Optimized for AWS Lambda cold starts
- **API Gateway Support**: Works with both REST API and HTTP API
- **Function URLs**: Compatible with Lambda Function URLs
- **Type-Safe**: Full TypeScript support with AWS Lambda types
- **Error Handling**: Built-in error handling with proper HTTP responses
- **Base64 Decoding**: Automatic handling of base64-encoded payloads

## Quick Start

### With Stripe Webhooks

```typescript
import Stripe from 'stripe';
import { StripeWebhookRouter, createStripeVerifier } from '@tayori/stripe';
import { lambdaAdapter } from '@tayori/lambda';

const stripe = new Stripe(process.env.STRIPE_API_KEY!);
const router = new StripeWebhookRouter();

router.on('payment_intent.succeeded', async (event) => {
  console.log('Payment succeeded:', event.data.object.id);
  // Update database, send email, etc.
});

router.on('customer.subscription.created', async (event) => {
  console.log('New subscription:', event.data.object.id);
  // Provision access, send welcome email, etc.
});

export const handler = lambdaAdapter(router, {
  verifier: createStripeVerifier(stripe, process.env.STRIPE_WEBHOOK_SECRET!),
});
```

### With Custom Webhooks

```typescript
import { WebhookRouter, type Verifier, type WebhookEvent } from '@tayori/core';
import { lambdaAdapter } from '@tayori/lambda';

// Define your event types
interface MyEvent extends WebhookEvent {
  type: 'my.event';
  data: { object: { id: string; message: string } };
}

type MyEventMap = {
  'my.event': MyEvent;
};

// Create a custom verifier
const myVerifier: Verifier = (payload, headers) => {
  // Verify signature and parse payload
  const body = JSON.parse(payload.toString());
  return {
    event: {
      id: body.id,
      type: body.type,
      data: { object: body.data },
    },
  };
};

const router = new WebhookRouter<MyEventMap>();

router.on('my.event', async (event) => {
  console.log('Custom event:', event.data.object.message);
});

export const handler = lambdaAdapter(router, {
  verifier: myVerifier,
});
```

## API Reference

### lambdaAdapter

Creates an AWS Lambda handler from a Tayori webhook router.

```typescript
function lambdaAdapter<TEventMap>(
  router: WebhookRouter<TEventMap>,
  options: LambdaAdapterOptions
): Handler<APIGatewayProxyEvent, APIGatewayProxyResult>
```

**Parameters:**

- `router` - A `WebhookRouter` instance from `@tayori/core`
- `options` - Configuration options

**Returns:** An AWS Lambda `Handler` function

### LambdaAdapterOptions

```typescript
interface LambdaAdapterOptions {
  /**
   * Verifier function for webhook signature validation
   * @required
   */
  verifier: Verifier;

  /**
   * Custom error handler
   * @optional
   */
  onError?: (error: Error, event?: WebhookEvent) => Promise<void> | void;

  /**
   * Custom success response body
   * @optional
   * @default { success: true }
   */
  successResponse?: unknown;
}
```

## AWS Deployment

### With AWS SAM

```yaml
# template.yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Resources:
  WebhookFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: index.handler
      Runtime: nodejs18.x
      Environment:
        Variables:
          STRIPE_API_KEY: !Ref StripeApiKey
          STRIPE_WEBHOOK_SECRET: !Ref StripeWebhookSecret
      Events:
        Webhook:
          Type: Api
          Properties:
            Path: /webhook
            Method: post

Parameters:
  StripeApiKey:
    Type: String
    NoEcho: true
  StripeWebhookSecret:
    Type: String
    NoEcho: true
```

Deploy:

```bash
sam build
sam deploy --guided
```

### With Serverless Framework

```yaml
# serverless.yml
service: stripe-webhooks

provider:
  name: aws
  runtime: nodejs18.x
  environment:
    STRIPE_API_KEY: ${env:STRIPE_API_KEY}
    STRIPE_WEBHOOK_SECRET: ${env:STRIPE_WEBHOOK_SECRET}

functions:
  webhook:
    handler: index.handler
    events:
      - httpApi:
          path: /webhook
          method: post
```

Deploy:

```bash
serverless deploy
```

### With CDK

```typescript
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';

const webhookFn = new lambda.Function(this, 'WebhookHandler', {
  runtime: lambda.Runtime.NODEJS_18_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('dist'),
  environment: {
    STRIPE_API_KEY: process.env.STRIPE_API_KEY!,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET!,
  },
});

const api = new apigateway.RestApi(this, 'WebhookApi');
const webhookResource = api.root.addResource('webhook');
webhookResource.addMethod('POST', new apigateway.LambdaIntegration(webhookFn));
```

### With Lambda Function URLs

```typescript
// Lambda function code (no changes needed)
import { lambdaAdapter } from '@tayori/lambda';
// ... rest of your code

export const handler = lambdaAdapter(router, { verifier });
```

```bash
# Create function
aws lambda create-function \
  --function-name stripe-webhook-handler \
  --runtime nodejs18.x \
  --handler index.handler \
  --zip-file fileb://function.zip \
  --role arn:aws:iam::ACCOUNT:role/lambda-role

# Create Function URL
aws lambda create-function-url-config \
  --function-name stripe-webhook-handler \
  --auth-type NONE

# Get the URL
aws lambda get-function-url-config \
  --function-name stripe-webhook-handler
```

## Advanced Usage

### Custom Error Handling

```typescript
export const handler = lambdaAdapter(router, {
  verifier: createStripeVerifier(stripe, secret),
  onError: async (error, event) => {
    // Log to CloudWatch
    console.error(`Webhook error for ${event?.type}:`, error);

    // Send to external monitoring
    await sendToDatadog({
      event: 'webhook.error',
      eventType: event?.type,
      error: error.message,
    });
  },
});
```

### Custom Success Response

```typescript
export const handler = lambdaAdapter(router, {
  verifier: createStripeVerifier(stripe, secret),
  successResponse: {
    status: 'processed',
    timestamp: Date.now(),
  },
});
```

### Multiple Event Types

```typescript
const router = new StripeWebhookRouter();

// Payment events
router.group('payment_intent', (r) => {
  r.on('succeeded', async (event) => {
    await processPayment(event.data.object);
  });

  r.on('payment_failed', async (event) => {
    await notifyPaymentFailure(event.data.object);
  });
});

// Subscription events
router.group('customer.subscription', (r) => {
  r.on('created', async (event) => {
    await provisionAccess(event.data.object);
  });

  r.on('deleted', async (event) => {
    await revokeAccess(event.data.object);
  });
});

export const handler = lambdaAdapter(router, {
  verifier: createStripeVerifier(stripe, secret),
});
```

## Response Format

### Success Response (200)

```json
{
  "statusCode": 200,
  "headers": {
    "Content-Type": "application/json"
  },
  "body": "{\"success\":true}"
}
```

### Verification Failed (401)

```json
{
  "statusCode": 401,
  "headers": {
    "Content-Type": "application/json"
  },
  "body": "{\"error\":\"Webhook verification failed\"}"
}
```

### Processing Error (500)

```json
{
  "statusCode": 500,
  "headers": {
    "Content-Type": "application/json"
  },
  "body": "{\"error\":\"Webhook processing failed\"}"
}
```

## Testing

### Local Testing with SAM CLI

```bash
# Start local API
sam local start-api

# Send test webhook
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d @test-event.json
```

### Unit Testing

```typescript
import { describe, it, expect } from 'vitest';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { StripeWebhookRouter } from '@tayori/stripe';
import { lambdaAdapter } from '@tayori/lambda';

describe('Lambda webhook handler', () => {
  it('processes webhook events', async () => {
    const router = new StripeWebhookRouter();
    let processed = false;

    router.on('payment_intent.succeeded', async () => {
      processed = true;
    });

    const handler = lambdaAdapter(router, {
      verifier: mockVerifier,
    });

    const event: APIGatewayProxyEvent = {
      body: JSON.stringify(mockPayload),
      headers: { 'stripe-signature': 'mock-sig' },
      // ... other required fields
    };

    const result = await handler(event, {} as Context, () => {});

    expect(result.statusCode).toBe(200);
    expect(processed).toBe(true);
  });
});
```

### Integration Testing with Stripe CLI

```bash
# Forward webhooks to local Lambda
stripe listen --forward-to http://localhost:3000/webhook

# Trigger test events
stripe trigger payment_intent.succeeded
```

## Performance Optimization

### Minimize Cold Starts

```typescript
// Initialize Stripe client outside handler
const stripe = new Stripe(process.env.STRIPE_API_KEY!);
const router = new StripeWebhookRouter();

// Configure handlers outside
router.on('payment_intent.succeeded', async (event) => {
  // Handler logic
});

// Export handler (called on each invocation)
export const handler = lambdaAdapter(router, {
  verifier: createStripeVerifier(stripe, process.env.STRIPE_WEBHOOK_SECRET!),
});
```

### Use Lambda Layers

Package common dependencies in Lambda Layers:

```bash
# Create layer
mkdir -p layer/nodejs
cd layer/nodejs
npm install stripe @tayori/stripe @tayori/lambda @tayori/core

# Package layer
cd ..
zip -r layer.zip nodejs/
```

## Common Patterns

### DynamoDB Integration

```typescript
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';

const ddb = DynamoDBDocument.from(new DynamoDB({}));

router.on('customer.subscription.created', async (event) => {
  await ddb.put({
    TableName: 'Subscriptions',
    Item: {
      id: event.data.object.id,
      customerId: event.data.object.customer,
      status: event.data.object.status,
      createdAt: Date.now(),
    },
  });
});
```

### SQS Integration

```typescript
import { SQS } from '@aws-sdk/client-sqs';

const sqs = new SQS({});

router.on('payment_intent.succeeded', async (event) => {
  await sqs.sendMessage({
    QueueUrl: process.env.QUEUE_URL!,
    MessageBody: JSON.stringify({
      type: 'payment.process',
      paymentIntentId: event.data.object.id,
    }),
  });
});
```

## Requirements

- Node.js >= 18
- TypeScript >= 5.3
- AWS Lambda runtime compatible with Node.js 18+

## Related Packages

- [`@tayori/core`](../core) - Core webhook routing logic
- [`@tayori/stripe`](../stripe) - Stripe-specific type definitions and verifier
- [`@tayori/hono`](../hono) - Hono framework adapter
- [`@tayori/express`](../express) - Express framework adapter
- [`@tayori/eventbridge`](../eventbridge) - AWS EventBridge adapter
- [`@tayori/zod`](../zod) - Zod schema validation helpers

## Documentation

For more examples and guides, see the [main documentation](../../README.md).

## License

MIT
