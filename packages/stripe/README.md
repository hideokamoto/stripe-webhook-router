# @tayori/stripe

Stripe-specific type definitions, router, and webhook verifier for Tayori.

## Overview

`@tayori/stripe` provides first-class support for Stripe webhooks with complete type definitions for all 253+ Stripe event types, a specialized router with type-safe event handling, and a signature verification utility.

## Installation

```bash
npm install @tayori/stripe stripe
# or
pnpm add @tayori/stripe stripe
# or
yarn add @tayori/stripe stripe
```

**Note**: `stripe` is a peer dependency and must be installed separately.

## Features

- **Complete Type Coverage**: All 253+ Stripe event types with full TypeScript support
- **Type-Safe Router**: `StripeWebhookRouter` with autocomplete for all Stripe events
- **Signature Verification**: Built-in `createStripeVerifier()` for webhook security
- **Event Grouping**: Organize handlers by event prefix (e.g., `payment_intent`, `customer`)
- **Zero Configuration**: Works out of the box with the Stripe SDK

## Quick Start

### Basic Example

```typescript
import Stripe from 'stripe';
import { StripeWebhookRouter, createStripeVerifier } from '@tayori/stripe';
import { honoAdapter } from '@tayori/hono';
import { Hono } from 'hono';

const stripe = new Stripe(process.env.STRIPE_API_KEY!);
const router = new StripeWebhookRouter();

// Register event handlers with full type safety
router.on('payment_intent.succeeded', async (event) => {
  // event.data.object is typed as Stripe.PaymentIntent
  console.log('Payment succeeded:', event.data.object.id);
  console.log('Amount:', event.data.object.amount);
});

router.on('customer.subscription.created', async (event) => {
  // event.data.object is typed as Stripe.Subscription
  console.log('New subscription:', event.data.object.id);
  console.log('Customer:', event.data.object.customer);
});

const app = new Hono();

app.post('/webhook', honoAdapter(router, {
  verifier: createStripeVerifier(stripe, process.env.STRIPE_WEBHOOK_SECRET!),
}));

export default app;
```

## API Reference

### StripeWebhookRouter

A specialized router for Stripe webhook events with full type safety.

```typescript
import { StripeWebhookRouter } from '@tayori/stripe';

const router = new StripeWebhookRouter();
```

All methods from [`WebhookRouter`](../core#webhookrouter) are available with Stripe-specific types.

#### Event Handlers

```typescript
// Single event
router.on('charge.succeeded', async (event) => {
  // event is typed as Stripe.ChargeSucceededEvent
  const charge = event.data.object; // Stripe.Charge
});

// Multiple events
router.on(['invoice.paid', 'invoice.payment_failed'], async (event) => {
  // event is typed as Stripe.InvoicePaidEvent | Stripe.InvoicePaymentFailedEvent
});
```

#### Event Grouping

Group related events by prefix:

```typescript
router.group('payment_intent', (r) => {
  r.on('succeeded', async (event) => {
    // Handles 'payment_intent.succeeded'
  });

  r.on('payment_failed', async (event) => {
    // Handles 'payment_intent.payment_failed'
  });

  r.on('canceled', async (event) => {
    // Handles 'payment_intent.canceled'
  });
});

router.group('customer.subscription', (r) => {
  r.on('created', async (event) => {
    // Handles 'customer.subscription.created'
  });

  r.on('updated', async (event) => {
    // Handles 'customer.subscription.updated'
  });

  r.on('deleted', async (event) => {
    // Handles 'customer.subscription.deleted'
  });
});
```

### createStripeVerifier

Create a verifier function for Stripe webhook signature validation.

```typescript
import Stripe from 'stripe';
import { createStripeVerifier } from '@tayori/stripe';

const stripe = new Stripe(process.env.STRIPE_API_KEY!);

const verifier = createStripeVerifier(
  stripe,
  process.env.STRIPE_WEBHOOK_SECRET!
);
```

**Parameters:**
- `stripe` - Stripe SDK instance
- `secret` - Webhook signing secret from Stripe Dashboard

The verifier will:
1. Validate the webhook signature using `stripe.webhooks.constructEvent()`
2. Parse the event payload
3. Return the typed Stripe event

## Usage with Framework Adapters

### With Hono

```typescript
import { Hono } from 'hono';
import Stripe from 'stripe';
import { StripeWebhookRouter, createStripeVerifier } from '@tayori/stripe';
import { honoAdapter } from '@tayori/hono';

const stripe = new Stripe(process.env.STRIPE_API_KEY!);
const router = new StripeWebhookRouter();

router.on('payment_intent.succeeded', async (event) => {
  console.log('Payment:', event.data.object.id);
});

const app = new Hono();

app.post('/webhook', honoAdapter(router, {
  verifier: createStripeVerifier(stripe, process.env.STRIPE_WEBHOOK_SECRET!),
}));

export default app;
```

### With Express

```typescript
import express from 'express';
import Stripe from 'stripe';
import { StripeWebhookRouter, createStripeVerifier } from '@tayori/stripe';
import { expressAdapter } from '@tayori/express';

const stripe = new Stripe(process.env.STRIPE_API_KEY!);
const router = new StripeWebhookRouter();

router.on('charge.succeeded', async (event) => {
  console.log('Charge:', event.data.object.id);
});

const app = express();

app.post('/webhook',
  express.raw({ type: 'application/json' }),
  expressAdapter(router, {
    verifier: createStripeVerifier(stripe, process.env.STRIPE_WEBHOOK_SECRET!),
  })
);

app.listen(3000);
```

### With AWS Lambda

```typescript
import Stripe from 'stripe';
import { StripeWebhookRouter, createStripeVerifier } from '@tayori/stripe';
import { lambdaAdapter } from '@tayori/lambda';

const stripe = new Stripe(process.env.STRIPE_API_KEY!);
const router = new StripeWebhookRouter();

router.on('invoice.paid', async (event) => {
  console.log('Invoice paid:', event.data.object.id);
});

export const handler = lambdaAdapter(router, {
  verifier: createStripeVerifier(stripe, process.env.STRIPE_WEBHOOK_SECRET!),
});
```

## Common Use Cases

### Payment Processing

```typescript
router.group('payment_intent', (r) => {
  r.on('succeeded', async (event) => {
    const payment = event.data.object;
    await fulfillOrder(payment.id, payment.amount);
  });

  r.on('payment_failed', async (event) => {
    const payment = event.data.object;
    await notifyPaymentFailure(payment.customer, payment.last_payment_error);
  });
});
```

### Subscription Management

```typescript
router.group('customer.subscription', (r) => {
  r.on('created', async (event) => {
    const subscription = event.data.object;
    await sendWelcomeEmail(subscription.customer);
    await provisionAccess(subscription.customer, subscription.items);
  });

  r.on('updated', async (event) => {
    const subscription = event.data.object;
    await updateAccess(subscription.customer, subscription.items);
  });

  r.on('deleted', async (event) => {
    const subscription = event.data.object;
    await revokeAccess(subscription.customer);
  });
});
```

### Multiple Handlers with Fanout

```typescript
router.fanout('checkout.session.completed', [
  async (event) => {
    await fulfillOrder(event.data.object);
  },
  async (event) => {
    await sendReceipt(event.data.object.customer_email);
  },
  async (event) => {
    await trackConversion(event.data.object);
  },
], {
  strategy: 'best-effort',
  onError: (error) => console.error('Handler failed:', error),
});
```

## Supported Event Types

This package includes type definitions for all 253+ Stripe webhook events, including:

### Payments
- `payment_intent.*` (succeeded, payment_failed, canceled, etc.)
- `charge.*` (succeeded, failed, refunded, etc.)
- `payment_method.*` (attached, detached, updated, etc.)

### Subscriptions
- `customer.subscription.*` (created, updated, deleted, etc.)
- `invoice.*` (created, paid, payment_failed, etc.)
- `subscription_schedule.*`

### Customers
- `customer.*` (created, updated, deleted, etc.)
- `customer.source.*`
- `customer.tax_id.*`

### Checkout
- `checkout.session.*` (completed, async_payment_succeeded, etc.)

### And many more...

For a complete list, see the [Stripe API documentation](https://stripe.com/docs/api/events/types).

## Security

### Webhook Signature Verification

All webhook events must be verified using the signature provided by Stripe to ensure authenticity and prevent tampering. This package includes built-in signature verification using HMAC-SHA256:

```typescript
import Stripe from 'stripe';
import { createStripeVerifier } from '@tayori/stripe';

const stripe = new Stripe(process.env.STRIPE_API_KEY!);

const verifier = createStripeVerifier(
  stripe,
  process.env.STRIPE_WEBHOOK_SECRET!
);
```

**How it works:**
1. Stripe signs each webhook using your webhook endpoint's signing secret
2. The signature is included in the `stripe-signature` header
3. The verifier validates the signature using HMAC-SHA256
4. The timestamp in the signature is verified to be within an acceptable tolerance (default: 5 minutes)

**Timestamp Tolerance:**
The default timestamp tolerance is 300 seconds (5 minutes). This prevents replay attacks where old webhooks might be replayed. The Stripe SDK validates that the timestamp in the signature header is within this window.

### Replay Attack Prevention

To prevent processing the same webhook event multiple times, implement idempotency tracking using the webhook event ID:

```typescript
import Stripe from 'stripe';
import { StripeWebhookRouter, createStripeVerifier } from '@tayori/stripe';
import { honoAdapter } from '@tayori/hono';
import { Hono } from 'hono';

// In-memory store for demonstration (use a database in production)
const processedEventIds = new Set<string>();

const stripe = new Stripe(process.env.STRIPE_API_KEY!);
const router = new StripeWebhookRouter();

// Add middleware to check for duplicate events
router.use(async (event, next) => {
  if (processedEventIds.has(event.id)) {
    console.log('Duplicate event ignored:', event.id);
    return;
  }

  processedEventIds.add(event.id);
  await next();
});

router.on('payment_intent.succeeded', async (event) => {
  console.log('Processing payment:', event.data.object.id);
  // Your business logic here
});

const app = new Hono();

app.post('/webhook', honoAdapter(router, {
  verifier: createStripeVerifier(stripe, process.env.STRIPE_WEBHOOK_SECRET!),
}));

export default app;
```

**Production Recommendation:**
For production applications, store processed event IDs in a database with a TTL. This ensures idempotency even after application restarts:

```typescript
// Example using a database (pseudocode)
router.use(async (event, next) => {
  const exists = await db.eventLog.findUnique({
    where: { id: event.id },
  });

  if (exists) {
    console.log('Duplicate event ignored:', event.id);
    return;
  }

  // Record the event before processing
  await db.eventLog.create({
    data: { id: event.id, timestamp: new Date() },
  });

  try {
    await next();
  } catch (error) {
    // If processing fails, you might want to mark it for retry
    throw error;
  }
});
```

**Event ID Format:**
Stripe event IDs follow the format: `evt_<base32_string>` (e.g., `evt_1234567890abcdef`). These IDs are guaranteed to be unique across all your Stripe events.

### Error Handling and Information Disclosure

Error messages from webhook verification should never expose internal details to the client. This package sanitizes all verification error responses:

```typescript
// Instead of exposing error details like:
// { error: "Unable to verify signature: invalid timestamp" }

// The adapter responds with:
// { error: "Verification failed" }

// Actual error details are logged server-side:
// console.error('Webhook verification failed:', err)
```

Configure your logging to capture these details for debugging while keeping client responses safe:

```typescript
// Your application logging (in production, use a proper logging service)
router.on('payment_intent.succeeded', async (event) => {
  try {
    // Process payment
  } catch (error) {
    console.error('Payment processing failed for event:', event.id, error);
    throw error; // This error will be handled by onError handler
  }
});
```

## Type Safety Examples

The router provides full IntelliSense and type checking:

```typescript
// TypeScript knows the exact type
router.on('payment_intent.succeeded', async (event) => {
  const amount = event.data.object.amount; // number
  const currency = event.data.object.currency; // string
  const status = event.data.object.status; // "succeeded"
});

// Invalid event names are caught at compile time
router.on('invalid.event.name', async (event) => {
  // ❌ TypeScript error: "invalid.event.name" is not a valid Stripe event type
});
```

## Maintaining Event Types

The event type definitions are automatically generated from the Stripe SDK. To verify they're up to date:

```bash
cd packages/stripe
pnpm run check-events
```

See [MAINTAINING_STRIPE_EVENTMAP.md](./MAINTAINING_STRIPE_EVENTMAP.md) for details.

## Requirements

- Node.js >= 18
- TypeScript >= 5.3
- Stripe SDK >= 17.0.0

## Related Packages

- [`@tayori/core`](../core) - Core webhook routing logic
- [`@tayori/hono`](../hono) - Hono framework adapter
- [`@tayori/express`](../express) - Express framework adapter
- [`@tayori/lambda`](../lambda) - AWS Lambda adapter
- [`@tayori/eventbridge`](../eventbridge) - AWS EventBridge adapter
- [`@tayori/zod`](../zod) - Zod schema validation helpers

## Documentation

For more examples and guides, see the [main documentation](../../README.md).

## License

MIT
