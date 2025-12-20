# Tayori

A Hono-inspired, type-safe Stripe webhook routing library for TypeScript.

## Overview

Tayori provides a clean, type-safe API for handling Stripe webhooks with full TypeScript support. It features a modular architecture with adapters for popular frameworks and platforms.

## Features

- **Type-Safe**: Full TypeScript support with all 253+ Stripe event types
- **Framework Adapters**: Built-in support for Hono, Express, AWS Lambda, and EventBridge
- **Middleware Support**: Add cross-cutting concerns with middleware
- **Flexible Routing**: Group handlers, mount nested routers, and fanout patterns
- **Event Validation**: Automatic Stripe signature verification
- **Monorepo Architecture**: Modular packages for different use cases

## Packages

- `@tayori/core` - Core webhook routing logic
- `@tayori/stripe` - Stripe-specific type definitions and router
- `@tayori/hono` - Hono framework adapter
- `@tayori/express` - Express framework adapter
- `@tayori/lambda` - AWS Lambda adapter
- `@tayori/eventbridge` - AWS EventBridge adapter
- `create-tayori` - Scaffolding tool for creating new projects

## Getting Started

The fastest way to get started is using the scaffolding tool:

```bash
npx create-tayori
```

This will interactively guide you through creating a new Tayori project with your preferred framework and package manager.

You can also specify options directly:

```bash
# Create a new Hono-based webhook handler
npx create-tayori my-webhook-handler --fw=hono

# With custom package manager
npx create-tayori my-webhook-handler --fw=hono --pm=pnpm
```

## Installation

```bash
# For Hono
pnpm add @tayori/stripe @tayori/hono stripe

# For Express
pnpm add @tayori/stripe @tayori/express stripe

# For AWS Lambda
pnpm add @tayori/stripe @tayori/lambda stripe

# For AWS EventBridge
pnpm add @tayori/stripe @tayori/eventbridge stripe
```

## Quick Start

### With Hono

```typescript
import { Hono } from 'hono';
import Stripe from 'stripe';
import { StripeWebhookRouter } from '@tayori/stripe';
import { honoAdapter } from '@tayori/hono';

const stripe = new Stripe(process.env.STRIPE_API_KEY!);
const router = new StripeWebhookRouter();

// Register event handlers with full type safety
router.on('payment_intent.succeeded', async (event) => {
  console.log('Payment succeeded:', event.data.object.id);
});

router.on('customer.subscription.created', async (event) => {
  console.log('New subscription:', event.data.object.id);
});

const app = new Hono();

app.post('/webhook', honoAdapter(router, {
  stripe,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
}));

export default app;
```

### With Express

```typescript
import express from 'express';
import Stripe from 'stripe';
import { StripeWebhookRouter } from '@tayori/stripe';
import { expressAdapter } from '@tayori/express';

const stripe = new Stripe(process.env.STRIPE_API_KEY!);
const router = new StripeWebhookRouter();

router.on('charge.succeeded', async (event) => {
  console.log('Charge succeeded:', event.data.object.id);
});

const app = express();

app.post('/webhook',
  express.raw({ type: 'application/json' }),
  expressAdapter(router, {
    stripe,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  })
);

app.listen(3000);
```

### With AWS Lambda

```typescript
import Stripe from 'stripe';
import { StripeWebhookRouter } from '@tayori/stripe';
import { lambdaAdapter } from '@tayori/lambda';

const stripe = new Stripe(process.env.STRIPE_API_KEY!);
const router = new StripeWebhookRouter();

router.on('invoice.paid', async (event) => {
  console.log('Invoice paid:', event.data.object.id);
});

export const handler = lambdaAdapter(router, {
  stripe,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
});
```

## Advanced Usage

### Grouping Handlers

```typescript
const router = new StripeWebhookRouter();

// Group related event handlers
router.group('payment_intent', (r) => {
  r.on('succeeded', async (event) => {
    // Handle payment_intent.succeeded
  });

  r.on('payment_failed', async (event) => {
    // Handle payment_intent.payment_failed
  });

  r.on('canceled', async (event) => {
    // Handle payment_intent.canceled
  });
});
```

### Multiple Handlers for Same Event

```typescript
// Register multiple handlers for the same event
router.on('customer.subscription.created', async (event) => {
  await sendWelcomeEmail(event.data.object.customer);
});

router.on('customer.subscription.created', async (event) => {
  await trackAnalytics(event);
});

router.on('customer.subscription.created', async (event) => {
  await notifySlack(event);
});
```

### Fanout Pattern

```typescript
// Execute handlers in parallel with error handling
router.fanout('payment_intent.succeeded', [
  async (event) => await updateDatabase(event),
  async (event) => await sendReceipt(event),
  async (event) => await trackRevenue(event),
], {
  strategy: 'best-effort', // Continue even if some handlers fail
  onError: (error) => console.error('Handler failed:', error),
});
```

### Middleware

```typescript
// Add logging middleware
router.use(async (event, next) => {
  console.log(`[${event.type}] Processing event ${event.id}`);
  const start = Date.now();

  await next();

  const duration = Date.now() - start;
  console.log(`[${event.type}] Completed in ${duration}ms`);
});

// Add error handling middleware
router.use(async (event, next) => {
  try {
    await next();
  } catch (error) {
    console.error(`Error processing ${event.type}:`, error);
    // Send to error tracking service
    throw error;
  }
});
```

### Nested Routers

```typescript
// Create a subscription router
const subscriptionRouter = new StripeWebhookRouter();
subscriptionRouter.on('created', async (event) => { /* ... */ });
subscriptionRouter.on('updated', async (event) => { /* ... */ });
subscriptionRouter.on('deleted', async (event) => { /* ... */ });

// Mount it under the customer.subscription prefix
const mainRouter = new StripeWebhookRouter();
mainRouter.route('customer.subscription', subscriptionRouter);
```

## Error Handling

### Custom Error Handler

```typescript
app.post('/webhook', honoAdapter(router, {
  stripe,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  onError: async (error, event) => {
    // Log to monitoring service
    console.error(`Failed to process ${event.type}:`, error);

    // Send to error tracking
    await Sentry.captureException(error, {
      tags: { eventType: event.type, eventId: event.id },
    });
  },
}));
```

## Type Safety

Tayori provides full type inference for all Stripe events:

```typescript
router.on('payment_intent.succeeded', async (event) => {
  // event is typed as Stripe.PaymentIntentSucceededEvent
  const amount = event.data.object.amount; // TypeScript knows this exists
  const currency = event.data.object.currency; // Fully typed
});

// TypeScript will error on invalid event names
router.on('invalid.event.name', async (event) => {
  // ❌ Compile error: invalid event name
});
```

## Development

### Setup

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Type check
pnpm typecheck

# Lint
pnpm lint
```

### Project Structure

```
tayori/
├── packages/
│   ├── core/          # Core routing logic
│   ├── stripe/        # Stripe type definitions
│   ├── hono/          # Hono adapter
│   ├── express/       # Express adapter
│   ├── lambda/        # AWS Lambda adapter
│   └── eventbridge/   # AWS EventBridge adapter
├── package.json
└── pnpm-workspace.yaml
```

### Maintaining Stripe Events

The library includes all 253+ Stripe event types. To verify the event map is up to date:

```bash
cd packages/stripe
pnpm run check-events
```

See [MAINTAINING_STRIPE_EVENTMAP.md](packages/stripe/MAINTAINING_STRIPE_EVENTMAP.md) for details.

## Requirements

- Node.js >= 18
- TypeScript >= 5.3
- Stripe SDK >= 17.0.0

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Credits

Inspired by [Hono](https://hono.dev/)'s elegant API design.
