---
title: "@tayori/stripe"
description: Stripe-specific types, router, and verifier
---

The Stripe package extends the core router with Stripe-specific types and provides a signature verifier for Stripe webhooks.

## Installation

```bash
pnpm add @tayori/stripe stripe
```

## Main exports

| Export | Description |
|--------|-------------|
| `StripeWebhookRouter` | Router with full Stripe event type inference |
| `StripeEventMap` | Type map of 351+ Stripe event types |
| `createStripeVerifier(stripe, secret)` | Factory for Stripe signature verification |
| Re-exports from `@tayori/core` | `WebhookRouter`, `WebhookEvent`, `Verifier`, etc. |

## Type-safe event handlers

Event names are autocompleted and validated; the handler receives the correct Stripe event type:

```typescript
import { StripeWebhookRouter } from '@tayori/stripe';

const router = new StripeWebhookRouter();

router.on('payment_intent.succeeded', async (event) => {
  // event is Stripe.PaymentIntentSucceededEvent
  const amount = event.data.object.amount;
  const currency = event.data.object.currency;
});

router.on('customer.subscription.created', async (event) => {
  // event is Stripe.CustomerSubscriptionCreatedEvent
  const customerId = event.data.object.customer;
});
```

## Signature verification

Use `createStripeVerifier` with your Stripe instance and webhook signing secret:

```typescript
import Stripe from 'stripe';
import { createStripeVerifier } from '@tayori/stripe';

const stripe = new Stripe(process.env.STRIPE_API_KEY!);
const verifier = createStripeVerifier(stripe, process.env.STRIPE_WEBHOOK_SECRET!);

// Pass verifier to your adapter (e.g. honoAdapter(router, { verifier }))
```

The verifier validates the `Stripe-Signature` header and returns the parsed event. Never parse the webhook body before verification.

## Stripe event coverage

`StripeEventMap` is manually maintained and covers 351+ event types across categories such as:

- `account.*`, `charge.*`, `checkout.session.*`, `customer.*`
- `invoice.*`, `payment_intent.*`, `subscription.*`, and more

See the [Stripe Events API](https://stripe.com/docs/api/events/types) for the full list. When the Stripe SDK is updated, run `pnpm run check-events` in the stripe package to detect missing or obsolete events.
