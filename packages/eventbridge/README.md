# @tayori/eventbridge

AWS EventBridge adapter for Tayori webhook router.

## Overview

`@tayori/eventbridge` enables you to process webhook events routed through AWS EventBridge. Instead of handling webhooks directly in Lambda, you can forward them to EventBridge and use Tayori's type-safe routing for event-driven architectures.

## Installation

```bash
npm install @tayori/eventbridge @tayori/core
# or
pnpm add @tayori/eventbridge @tayori/core
# or
yarn add @tayori/eventbridge @tayori/core
```

**Note**: `@tayori/core` is a peer dependency and must be installed separately.

## Features

- **Event-Driven Architecture**: Process webhooks through EventBridge event buses
- **Fan-Out Pattern**: Route webhook events to multiple Lambda functions
- **Type-Safe**: Full TypeScript support with EventBridge event types
- **Flexible Routing**: Use EventBridge rules to filter and route specific events
- **Decoupled Processing**: Separate webhook ingestion from business logic
- **Dead Letter Queue Support**: Built-in error handling with DLQ integration

## Architecture

```
Stripe/GitHub → API Gateway → Ingestion Lambda → EventBridge → Processing Lambda(s)
                                    ↓
                              Tayori Router
```

This pattern separates concerns:
1. **Ingestion Lambda**: Validates webhook signature, puts event on EventBridge
2. **EventBridge**: Routes events to appropriate processors based on rules
3. **Processing Lambda(s)**: Handle specific event types with Tayori router

## Quick Start

### Step 1: Create Ingestion Lambda

This Lambda receives webhooks and forwards them to EventBridge:

```typescript
import Stripe from 'stripe';
import { EventBridge } from '@aws-sdk/client-eventbridge';
import { createStripeVerifier } from '@tayori/stripe';
import { lambdaAdapter } from '@tayori/lambda';
import { WebhookRouter } from '@tayori/core';

const stripe = new Stripe(process.env.STRIPE_API_KEY!);
const eventBridge = new EventBridge({});
const router = new WebhookRouter();

// Forward all events to EventBridge
router.use(async (event, next) => {
  await eventBridge.putEvents({
    Entries: [{
      Source: 'stripe.webhook',
      DetailType: event.type,
      Detail: JSON.stringify(event),
      EventBusName: process.env.EVENT_BUS_NAME,
    }],
  });
  await next();
});

export const handler = lambdaAdapter(router, {
  verifier: createStripeVerifier(stripe, process.env.STRIPE_WEBHOOK_SECRET!),
});
```

### Step 2: Create Processing Lambda with EventBridge Adapter

```typescript
import { StripeWebhookRouter } from '@tayori/stripe';
import { eventBridgeAdapter } from '@tayori/eventbridge';

const router = new StripeWebhookRouter();

// Handle specific Stripe events
router.on('payment_intent.succeeded', async (event) => {
  console.log('Payment succeeded:', event.data.object.id);
  await processPayment(event.data.object);
});

router.on('customer.subscription.created', async (event) => {
  console.log('New subscription:', event.data.object.id);
  await provisionAccess(event.data.object);
});

export const handler = eventBridgeAdapter(router);
```

### Step 3: Configure EventBridge Rules

Using AWS SAM:

```yaml
# template.yaml
Resources:
  EventBus:
    Type: AWS::Events::EventBus
    Properties:
      Name: webhook-events

  # Route payment events
  PaymentRule:
    Type: AWS::Events::Rule
    Properties:
      EventBusName: !Ref EventBus
      EventPattern:
        source:
          - stripe.webhook
        detail-type:
          - payment_intent.succeeded
          - payment_intent.payment_failed
      Targets:
        - Arn: !GetAtt PaymentProcessorFunction.Arn
          Id: PaymentProcessor

  # Route subscription events
  SubscriptionRule:
    Type: AWS::Events::Rule
    Properties:
      EventBusName: !Ref EventBus
      EventPattern:
        source:
          - stripe.webhook
        detail-type:
          - prefix: customer.subscription
      Targets:
        - Arn: !GetAtt SubscriptionProcessorFunction.Arn
          Id: SubscriptionProcessor
```

## API Reference

### eventBridgeAdapter

Creates an EventBridge Lambda handler from a Tayori webhook router.

```typescript
function eventBridgeAdapter<TEventMap>(
  router: WebhookRouter<TEventMap>,
  options?: EventBridgeAdapterOptions
): Handler<EventBridgeEvent, void>
```

**Parameters:**

- `router` - A `WebhookRouter` instance from `@tayori/core`
- `options` - Optional configuration options

**Returns:** An AWS Lambda handler for EventBridge events

### EventBridgeAdapterOptions

```typescript
interface EventBridgeAdapterOptions {
  /**
   * Custom error handler
   * @optional
   */
  onError?: (error: Error, event?: WebhookEvent) => Promise<void> | void;

  /**
   * Custom event extractor from EventBridge event
   * @optional
   */
  extractEvent?: (event: EventBridgeEvent) => WebhookEvent;
}
```

## Usage Patterns

### Pattern 1: Single Event Bus with Multiple Processors

Each processor handles a group of related events:

```typescript
// payment-processor.ts
const router = new StripeWebhookRouter();

router.group('payment_intent', (r) => {
  r.on('succeeded', async (event) => { /* ... */ });
  r.on('payment_failed', async (event) => { /* ... */ });
  r.on('canceled', async (event) => { /* ... */ });
});

export const handler = eventBridgeAdapter(router);
```

```typescript
// subscription-processor.ts
const router = new StripeWebhookRouter();

router.group('customer.subscription', (r) => {
  r.on('created', async (event) => { /* ... */ });
  r.on('updated', async (event) => { /* ... */ });
  r.on('deleted', async (event) => { /* ... */ });
});

export const handler = eventBridgeAdapter(router);
```

### Pattern 2: Event Transformation

Transform EventBridge events before processing:

```typescript
export const handler = eventBridgeAdapter(router, {
  extractEvent: (ebEvent) => {
    const event = JSON.parse(ebEvent.detail);
    // Add custom metadata
    return {
      ...event,
      metadata: {
        receivedAt: ebEvent.time,
        account: ebEvent.account,
      },
    };
  },
});
```

### Pattern 3: Error Handling with DLQ

```typescript
export const handler = eventBridgeAdapter(router, {
  onError: async (error, event) => {
    console.error(`Failed to process ${event?.type}:`, error);

    // Log to CloudWatch Insights
    console.log(JSON.stringify({
      eventType: event?.type,
      eventId: event?.id,
      error: error.message,
      stack: error.stack,
    }));

    // Re-throw to send to DLQ
    throw error;
  },
});
```

Configure DLQ in SAM:

```yaml
ProcessorFunction:
  Type: AWS::Serverless::Function
  Properties:
    Handler: index.handler
    DeadLetterQueue:
      Type: SQS
      TargetArn: !GetAtt WebhookDLQ.Arn
    Events:
      WebhookEvent:
        Type: EventBridgeRule
        Properties:
          EventBusName: !Ref EventBus
          Pattern:
            source:
              - stripe.webhook
          RetryPolicy:
            MaximumRetryAttempts: 2
            MaximumEventAge: 3600
```

## Advanced Usage

### Multi-Region Event Processing

Replicate EventBridge events across regions:

```yaml
# Primary region event bus
PrimaryEventBus:
  Type: AWS::Events::EventBus
  Properties:
    Name: webhook-events

# Replicate to secondary region
EventReplication:
  Type: AWS::Events::Rule
  Properties:
    EventBusName: !Ref PrimaryEventBus
    EventPattern:
      source:
        - stripe.webhook
    Targets:
      - Arn: !Sub arn:aws:events:us-west-2:${AWS::AccountId}:event-bus/webhook-events
        RoleArn: !GetAtt EventBridgeReplicationRole.Arn
```

### Event Filtering

Filter events at the EventBridge level to reduce Lambda invocations:

```yaml
# Only process payments over $100
HighValuePaymentRule:
  Type: AWS::Events::Rule
  Properties:
    EventBusName: !Ref EventBus
    EventPattern:
      source:
        - stripe.webhook
      detail-type:
        - payment_intent.succeeded
      detail:
        data:
          object:
            amount:
              - numeric:
                  - ">="
                  - 10000  # $100.00 in cents
    Targets:
      - Arn: !GetAtt HighValueProcessorFunction.Arn
```

### Cross-Account Event Delivery

Send events to another AWS account:

```yaml
# Account A: Send events
CrossAccountRule:
  Type: AWS::Events::Rule
  Properties:
    EventBusName: !Ref EventBus
    EventPattern:
      source:
        - stripe.webhook
    Targets:
      - Arn: !Sub arn:aws:events:${AWS::Region}:OTHER-ACCOUNT-ID:event-bus/webhook-events
        RoleArn: !GetAtt CrossAccountRole.Arn

# Account B: Receive and process events
ReceiverEventBus:
  Type: AWS::Events::EventBus
  Properties:
    Name: webhook-events
```

## Monitoring and Observability

### CloudWatch Metrics

Track event processing:

```typescript
import { CloudWatch } from '@aws-sdk/client-cloudwatch';

const cloudwatch = new CloudWatch({});

router.use(async (event, next) => {
  const start = Date.now();
  try {
    await next();
    await cloudwatch.putMetricData({
      Namespace: 'Webhooks',
      MetricData: [{
        MetricName: 'ProcessingSuccess',
        Value: 1,
        Unit: 'Count',
        Dimensions: [{ Name: 'EventType', Value: event.type }],
      }],
    });
  } catch (error) {
    await cloudwatch.putMetricData({
      Namespace: 'Webhooks',
      MetricData: [{
        MetricName: 'ProcessingFailure',
        Value: 1,
        Unit: 'Count',
        Dimensions: [{ Name: 'EventType', Value: event.type }],
      }],
    });
    throw error;
  } finally {
    const duration = Date.now() - start;
    await cloudwatch.putMetricData({
      Namespace: 'Webhooks',
      MetricData: [{
        MetricName: 'ProcessingDuration',
        Value: duration,
        Unit: 'Milliseconds',
        Dimensions: [{ Name: 'EventType', Value: event.type }],
      }],
    });
  }
});
```

### X-Ray Tracing

Enable distributed tracing:

```typescript
import { captureAWS } from 'aws-xray-sdk-core';
import { EventBridge } from '@aws-sdk/client-eventbridge';

const eventBridge = captureAWS(new EventBridge({}));
```

## Testing

### Local Testing

Test with sample EventBridge events:

```typescript
import { describe, it, expect } from 'vitest';
import type { EventBridgeEvent } from 'aws-lambda';
import { eventBridgeAdapter } from '@tayori/eventbridge';

describe('EventBridge handler', () => {
  it('processes webhook events', async () => {
    const router = new StripeWebhookRouter();
    let processed = false;

    router.on('payment_intent.succeeded', async () => {
      processed = true;
    });

    const handler = eventBridgeAdapter(router);

    const event: EventBridgeEvent = {
      version: '0',
      id: 'test-id',
      'detail-type': 'payment_intent.succeeded',
      source: 'stripe.webhook',
      account: '123456789012',
      time: '2024-01-01T00:00:00Z',
      region: 'us-east-1',
      resources: [],
      detail: JSON.stringify({
        id: 'evt_123',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_123' } },
      }),
    };

    await handler(event, {} as any, () => {});
    expect(processed).toBe(true);
  });
});
```

## Benefits of EventBridge Pattern

1. **Decoupling**: Separate webhook validation from business logic
2. **Scalability**: EventBridge handles fan-out to multiple consumers
3. **Reliability**: Built-in retries and DLQ support
4. **Flexibility**: Easy to add new processors without changing ingestion
5. **Cross-Account/Region**: Route events across AWS accounts and regions
6. **Event Archive**: Enable EventBridge archive for event replay

## Requirements

- Node.js >= 18
- TypeScript >= 5.3
- AWS SDK for JavaScript v3

## Related Packages

- [`@tayori/core`](../core) - Core webhook routing logic
- [`@tayori/stripe`](../stripe) - Stripe-specific type definitions and verifier
- [`@tayori/lambda`](../lambda) - AWS Lambda adapter
- [`@tayori/hono`](../hono) - Hono framework adapter
- [`@tayori/express`](../express) - Express framework adapter
- [`@tayori/zod`](../zod) - Zod schema validation helpers

## Documentation

For more examples and guides, see the [main documentation](../../README.md).

## License

MIT
