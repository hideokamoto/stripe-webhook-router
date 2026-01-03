# @tayori/express

Express framework adapter for Tayori webhook router.

## Overview

`@tayori/express` provides a seamless integration between Tayori's type-safe webhook routing and the [Express](https://expressjs.com/) web framework. Built for Node.js applications with the familiar Express middleware pattern.

## Installation

```bash
npm install @tayori/express @tayori/core express
# or
pnpm add @tayori/express @tayori/core express
# or
yarn add @tayori/express @tayori/core express
```

**Note**: Both `@tayori/core` and `express` are peer dependencies and must be installed separately.

## Features

- **Express Middleware**: Integrates seamlessly with Express request/response cycle
- **Type-Safe**: Full TypeScript support with Express types
- **Error Handling**: Built-in error handling with customizable responses
- **Raw Body Support**: Automatically handles raw request bodies for signature verification
- **Flexible Configuration**: Customize success responses and error handling

## Quick Start

### With Stripe Webhooks

```typescript
import express from 'express';
import Stripe from 'stripe';
import { StripeWebhookRouter, createStripeVerifier } from '@tayori/stripe';
import { expressAdapter } from '@tayori/express';

const stripe = new Stripe(process.env.STRIPE_API_KEY!);
const router = new StripeWebhookRouter();

router.on('payment_intent.succeeded', async (event) => {
  console.log('Payment succeeded:', event.data.object.id);
});

router.on('customer.subscription.created', async (event) => {
  console.log('New subscription:', event.data.object.id);
});

const app = express();

// IMPORTANT: Use express.raw() to get the raw body for signature verification
app.post('/webhook',
  express.raw({ type: 'application/json' }),
  expressAdapter(router, {
    verifier: createStripeVerifier(stripe, process.env.STRIPE_WEBHOOK_SECRET!),
  })
);

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
```

### With Custom Webhooks

```typescript
import express from 'express';
import { WebhookRouter, type Verifier, type WebhookEvent } from '@tayori/core';
import { expressAdapter } from '@tayori/express';

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

const app = express();

app.post('/webhook',
  express.raw({ type: 'application/json' }),
  expressAdapter(router, {
    verifier: myVerifier,
  })
);

app.listen(3000);
```

## API Reference

### expressAdapter

Creates an Express middleware from a Tayori webhook router.

```typescript
function expressAdapter<TEventMap>(
  router: WebhookRouter<TEventMap>,
  options: ExpressAdapterOptions
): RequestHandler
```

**Parameters:**

- `router` - A `WebhookRouter` instance from `@tayori/core`
- `options` - Configuration options

**Returns:** An Express `RequestHandler` middleware

### ExpressAdapterOptions

```typescript
interface ExpressAdapterOptions {
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
   * Custom success response
   * @optional
   * @default { success: true }
   */
  successResponse?: unknown;
}
```

## Important: Raw Body Requirement

For webhook signature verification to work, you **must** use `express.raw()` middleware before the webhook handler:

```typescript
// ✅ Correct - raw body is available for verification
app.post('/webhook',
  express.raw({ type: 'application/json' }),
  expressAdapter(router, { verifier })
);

// ❌ Wrong - body will be parsed as JSON, verification will fail
app.use(express.json());
app.post('/webhook', expressAdapter(router, { verifier }));
```

### Mixing JSON and Raw Body Routes

If your app has other routes that need JSON parsing, you have two main options:

#### Option 1: Webhook Route Before Global JSON Middleware

Define webhook routes **before** applying `express.json()` globally:

```typescript
const app = express();

// ✅ Webhook route FIRST with raw body parser
app.post('/webhook',
  express.raw({ type: 'application/json' }),
  expressAdapter(router, { verifier })
);

// Then apply JSON parser for other routes
app.use(express.json());

// Other JSON routes
app.post('/api/users', (req, res) => {
  // req.body is parsed JSON
  res.json({ success: true });
});

app.listen(3000);
```

#### Option 2: Separate Routers for Different Body Parsers

Use separate `express.Router()` instances with different body parsers:

```typescript
const app = express();

// Webhook router with raw body parser
const webhookRouter = express.Router();
webhookRouter.post('/webhook',
  express.raw({ type: 'application/json' }),
  expressAdapter(router, { verifier })
);

// API router with JSON body parser
const apiRouter = express.Router();
apiRouter.use(express.json());
apiRouter.post('/users', (req, res) => {
  // req.body is parsed JSON
  res.json({ success: true });
});

// Mount both routers
app.use(webhookRouter);      // Webhook routes at root level
app.use('/api', apiRouter);  // API routes under /api

app.listen(3000);
```

## Advanced Usage

### Custom Error Handling

```typescript
app.post('/webhook',
  express.raw({ type: 'application/json' }),
  expressAdapter(router, {
    verifier: createStripeVerifier(stripe, secret),
    onError: async (error, event) => {
      // Log to monitoring service
      console.error(`Webhook error for ${event?.type}:`, error);

      // Send to error tracking
      await Sentry.captureException(error, {
        tags: {
          eventType: event?.type,
          eventId: event?.id,
        },
      });
    },
  })
);
```

### Custom Success Response

```typescript
app.post('/webhook',
  express.raw({ type: 'application/json' }),
  expressAdapter(router, {
    verifier: createStripeVerifier(stripe, secret),
    successResponse: {
      status: 'ok',
      processed: true,
      timestamp: Date.now(),
    },
  })
);
```

### Multiple Webhook Endpoints

```typescript
const app = express();

// Stripe webhooks
const stripeRouter = new StripeWebhookRouter();
stripeRouter.on('payment_intent.succeeded', async (event) => {
  // Handle payment
});

app.post('/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  expressAdapter(stripeRouter, {
    verifier: createStripeVerifier(stripe, stripeSecret),
  })
);

// GitHub webhooks
const githubRouter = new WebhookRouter<GitHubEventMap>();
githubRouter.on('push', async (event) => {
  // Handle push
});

app.post('/webhooks/github',
  express.raw({ type: 'application/json' }),
  expressAdapter(githubRouter, {
    verifier: createGitHubVerifier(githubSecret),
  })
);

app.listen(3000);
```

### With Express Router

```typescript
import { Router } from 'express';

const webhookRouter = Router();

const stripeRouter = new StripeWebhookRouter();
stripeRouter.on('charge.succeeded', async (event) => {
  console.log('Charge:', event.data.object.id);
});

webhookRouter.post('/stripe',
  express.raw({ type: 'application/json' }),
  expressAdapter(stripeRouter, {
    verifier: createStripeVerifier(stripe, secret),
  })
);

const app = express();
app.use('/webhooks', webhookRouter);
app.listen(3000);
```

## Error Responses

The adapter automatically returns appropriate HTTP responses:

### Success (200 OK)

```json
{
  "success": true
}
```

### Verification Failed (401 Unauthorized)

```json
{
  "error": "Webhook verification failed"
}
```

### Handler Error (500 Internal Server Error)

```json
{
  "error": "Webhook processing failed"
}
```

## Testing

### Unit Testing with Supertest

```typescript
import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { StripeWebhookRouter } from '@tayori/stripe';
import { expressAdapter } from '@tayori/express';

describe('Webhook handler', () => {
  it('processes payment_intent.succeeded events', async () => {
    const router = new StripeWebhookRouter();
    let processed = false;

    router.on('payment_intent.succeeded', async () => {
      processed = true;
    });

    const app = express();
    app.post('/webhook',
      express.raw({ type: 'application/json' }),
      expressAdapter(router, {
        verifier: mockVerifier,
      })
    );

    const response = await request(app)
      .post('/webhook')
      .send(mockPayload)
      .expect(200);

    expect(response.body).toEqual({ success: true });
    expect(processed).toBe(true);
  });
});
```

### Integration Testing with Stripe CLI

Test with the Stripe CLI for realistic webhook events:

```bash
# Terminal 1: Start your Express server
npm start

# Terminal 2: Forward webhooks from Stripe CLI
stripe listen --forward-to localhost:3000/webhook

# Terminal 3: Trigger test events
stripe trigger payment_intent.succeeded
stripe trigger customer.subscription.created
```

## Common Patterns

### Async Processing with Queues

```typescript
import { Queue } from 'bullmq';

const queue = new Queue('webhooks');

router.on('payment_intent.succeeded', async (event) => {
  // Add to queue for async processing
  await queue.add('process-payment', {
    paymentIntentId: event.data.object.id,
    amount: event.data.object.amount,
  });
});
```

### Database Integration

```typescript
import { db } from './database';

router.on('customer.subscription.created', async (event) => {
  const subscription = event.data.object;

  await db.subscription.create({
    data: {
      stripeId: subscription.id,
      customerId: subscription.customer,
      status: subscription.status,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    },
  });
});
```

## Requirements

- Node.js >= 18
- TypeScript >= 5.3
- Express >= 4.0.0

## Related Packages

- [`@tayori/core`](../core) - Core webhook routing logic
- [`@tayori/stripe`](../stripe) - Stripe-specific type definitions and verifier
- [`@tayori/hono`](../hono) - Hono framework adapter
- [`@tayori/lambda`](../lambda) - AWS Lambda adapter
- [`@tayori/eventbridge`](../eventbridge) - AWS EventBridge adapter
- [`@tayori/zod`](../zod) - Zod schema validation helpers

## Documentation

For more examples and guides, see the [main documentation](../../README.md).

## License

MIT
