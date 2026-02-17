# @tayori/core

Type-safe webhook routing framework for any event source.

## Overview

`@tayori/core` provides the foundational routing logic for building type-safe webhook handlers. It offers a flexible, framework-agnostic API for routing webhook events with full TypeScript support, middleware capabilities, and flexible routing patterns.

## Installation

```bash
npm install @tayori/core
# or
pnpm add @tayori/core
# or
yarn add @tayori/core
```

## Features

- **Type-Safe Event Routing**: Generic event type definitions for full IDE autocomplete
- **Middleware Support**: Add logging, error handling, and other cross-cutting concerns
- **Flexible Routing**: Group handlers, mount nested routers, and fanout patterns
- **Pluggable Verification**: Bring your own verifier for any webhook provider
- **Framework Agnostic**: Works with any HTTP framework via adapters

## Quick Start

### Basic Usage

```typescript
import { WebhookRouter, type WebhookEvent, type Verifier } from '@tayori/core';

// Define your event types
interface MyEvent extends WebhookEvent {
  type: 'my.event';
  data: { object: { id: string; name: string } };
}

type MyEventMap = {
  'my.event': MyEvent;
};

// Create a router
const router = new WebhookRouter<MyEventMap>();

// Register event handlers
router.on('my.event', async (event) => {
  console.log('Event received:', event.data.object);
});

// Dispatch events
await router.dispatch({
  id: '123',
  type: 'my.event',
  data: { object: { id: '1', name: 'Test' } },
});
```

### With a Custom Verifier

```typescript
import crypto from 'crypto';

// Create a verifier for GitHub webhooks
function createGitHubVerifier(secret: string): Verifier {
  return (payload, headers) => {
    const signature = headers['x-hub-signature-256'];
    if (!signature) {
      throw new Error('Missing x-hub-signature-256 header');
    }

    const hmac = crypto.createHmac('sha256', secret);
    const digest = 'sha256=' + hmac.update(payload).digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))) {
      throw new Error('Invalid signature');
    }

    const body = JSON.parse(payload.toString());
    return {
      event: {
        id: headers['x-github-delivery'] ?? crypto.randomUUID(),
        type: headers['x-github-event'] ?? 'unknown',
        data: { object: body },
      },
    };
  };
}
```

## API Reference

### WebhookRouter

The main router class for handling webhook events.

#### `on(event, handler)`

Register a handler for a specific event type.

```typescript
router.on('payment.succeeded', async (event) => {
  // Handle payment success
});

// Multiple events with the same handler
router.on(['order.created', 'order.updated'], async (event) => {
  // Handle order events
});
```

#### `use(middleware)`

Register middleware that runs before event handlers.

```typescript
router.use(async (event, next) => {
  console.log(`Processing ${event.type}`);
  await next();
});
```

#### `group(prefix, callback)`

Group related event handlers with a common prefix.

```typescript
router.group('payment', (r) => {
  r.on('succeeded', async (event) => {
    // Handles 'payment.succeeded'
  });

  r.on('failed', async (event) => {
    // Handles 'payment.failed'
  });
});
```

#### `route(prefix, router)`

Mount a nested router under a prefix.

```typescript
const paymentRouter = new WebhookRouter();
paymentRouter.on('succeeded', async (event) => { /* ... */ });
paymentRouter.on('failed', async (event) => { /* ... */ });

const mainRouter = new WebhookRouter();
mainRouter.route('payment', paymentRouter);
// paymentRouter handlers are now available as 'payment.succeeded', 'payment.failed'
```

#### `fanout(event, handlers, options)`

Execute multiple handlers in parallel for the same event.

```typescript
router.fanout('user.created', [
  async (event) => await sendWelcomeEmail(event),
  async (event) => await createAnalyticsProfile(event),
  async (event) => await notifySlack(event),
], {
  strategy: 'best-effort', // Continue even if some handlers fail
  onError: (error) => console.error('Handler failed:', error),
});
```

**Strategies:**
- `all-or-nothing` (default): All handlers must succeed or the entire operation fails
- `best-effort`: Continue executing handlers even if some fail

#### `dispatch(event)`

Dispatch an event to registered handlers.

```typescript
await router.dispatch({
  id: '123',
  type: 'payment.succeeded',
  data: { object: { amount: 1000 } },
});
```

### Types

#### WebhookEvent

Base interface for all webhook events.

```typescript
interface WebhookEvent {
  id: string;
  type: string;
  data: { object: unknown };
}
```

#### EventHandler<T>

Handler function type for processing events.

```typescript
type EventHandler<T extends WebhookEvent> = (event: T) => Promise<void>;
```

#### Middleware<T>

Middleware function type for cross-cutting concerns.

```typescript
type Middleware<T extends WebhookEvent> = (
  event: T,
  next: () => Promise<void>
) => Promise<void>;
```

#### Verifier<T>

Function type for verifying webhook signatures and parsing payloads.

```typescript
type Verifier<T extends WebhookEvent> = (
  payload: string | Buffer,
  headers: Record<string, string | undefined>
) => VerifyResult<T> | Promise<VerifyResult<T>>;
```

## Advanced Usage

### Multiple Handlers per Event

Register multiple handlers for the same event type:

```typescript
router.on('user.created', async (event) => {
  await sendWelcomeEmail(event);
});

router.on('user.created', async (event) => {
  await createUserProfile(event);
});

router.on('user.created', async (event) => {
  await trackSignup(event);
});
// All three handlers will execute sequentially
```

### Middleware Examples

#### Logging Middleware

```typescript
router.use(async (event, next) => {
  const start = Date.now();
  console.log(`[${event.type}] Processing event ${event.id}`);

  await next();

  const duration = Date.now() - start;
  console.log(`[${event.type}] Completed in ${duration}ms`);
});
```

#### Error Handling Middleware

```typescript
router.use(async (event, next) => {
  try {
    await next();
  } catch (error) {
    console.error(`Error processing ${event.type}:`, error);
    // Send to error tracking service
    await Sentry.captureException(error, {
      tags: { eventType: event.type, eventId: event.id },
    });
    throw error;
  }
});
```

## Known Limitations

### Group Middleware Scope

There is a known limitation with the `group().use()` method that differs from expected behavior:

**Current Behavior**: Middleware registered within a `group()` using `.use()` applies to the **entire router**, not just handlers within that group.

```typescript
const router = new WebhookRouter();

router.use(async (event, next) => {
  console.log('Router-level middleware');
  await next();
});

router.group('payment', (group) => {
  // ⚠️ This middleware runs for ALL events, not just 'payment.*'
  group.use(async (event, next) => {
    console.log('Group middleware - runs for ALL events');
    await next();
  });

  group.on('succeeded', async (event) => {
    console.log('Handler executed');
  });
});

// Both middlewares run for 'payment.succeeded' AND 'user.created'
await router.dispatch({ type: 'payment.succeeded', ... });
await router.dispatch({ type: 'user.created', ... });
```

**Workaround**: To apply middleware only to specific events within a group, use one of these alternatives:

1. **Event-level filtering in router middleware**:
```typescript
router.use(async (event, next) => {
  if (event.type.startsWith('payment.')) {
    console.log('Only for payment events');
  }
  await next();
});
```

2. **Handler-level error handling**:
```typescript
router.group('payment', (group) => {
  group.on('succeeded', async (event) => {
    try {
      // Your handler logic
    } catch (error) {
      console.error('Error in payment handler:', error);
      throw error;
    }
  });
});
```

3. **Separate routers for different concerns**:
```typescript
const paymentRouter = new WebhookRouter();
paymentRouter.use(async (event, next) => {
  console.log('Only for payment events');
  await next();
});

paymentRouter.on('succeeded', async (event) => {
  // Handle payment success
});

const mainRouter = new WebhookRouter();
mainRouter.route('payment', paymentRouter);
```

## Using with Framework Adapters

`@tayori/core` is framework-agnostic. Use it with framework-specific adapters:

- [`@tayori/hono`](../hono) - Hono framework
- [`@tayori/express`](../express) - Express framework
- [`@tayori/lambda`](../lambda) - AWS Lambda
- [`@tayori/eventbridge`](../eventbridge) - AWS EventBridge

Example with Hono:

```typescript
import { Hono } from 'hono';
import { WebhookRouter } from '@tayori/core';
import { honoAdapter } from '@tayori/hono';

const router = new WebhookRouter();
router.on('my.event', async (event) => {
  console.log('Event received');
});

const app = new Hono();
app.post('/webhook', honoAdapter(router, {
  verifier: createGitHubVerifier(process.env.GITHUB_WEBHOOK_SECRET!),
}));
```

## TypeScript Tips

### Strict Event Typing

```typescript
import type { WebhookEvent } from '@tayori/core';

// Define your events
interface PaymentSucceededEvent extends WebhookEvent {
  type: 'payment.succeeded';
  data: {
    object: {
      id: string;
      amount: number;
      currency: string;
    };
  };
}

interface PaymentFailedEvent extends WebhookEvent {
  type: 'payment.failed';
  data: {
    object: {
      id: string;
      errorMessage: string;
    };
  };
}

// Create event map
type EventMap = {
  'payment.succeeded': PaymentSucceededEvent;
  'payment.failed': PaymentFailedEvent;
};

// Router has full type safety
const router = new WebhookRouter<EventMap>();

router.on('payment.succeeded', async (event) => {
  // TypeScript knows event.data.object has amount, currency, etc.
  const amount = event.data.object.amount;
});
```

## Related Packages

- [`@tayori/stripe`](../stripe) - Stripe-specific type definitions and verifier
- [`@tayori/hono`](../hono) - Hono framework adapter
- [`@tayori/express`](../express) - Express framework adapter
- [`@tayori/lambda`](../lambda) - AWS Lambda adapter
- [`@tayori/eventbridge`](../eventbridge) - AWS EventBridge adapter
- [`@tayori/zod`](../zod) - Zod schema validation helpers

## Documentation

For more examples and guides, see the [main documentation](../../README.md).

## License

MIT
