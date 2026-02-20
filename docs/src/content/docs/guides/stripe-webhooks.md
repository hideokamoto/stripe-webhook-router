---
title: Stripe Webhooks
description: Set up Stripe webhooks with Tayori
---

This guide walks through setting up Stripe webhooks with Tayori using the Stripe router and adapter of your choice.

## 1. Install dependencies

For Hono (replace with your framework if needed):

```bash
pnpm add @tayori/stripe @tayori/hono stripe
```

## 2. Get your webhook secret

In the [Stripe Dashboard](https://dashboard.stripe.com/webhooks), create a webhook endpoint pointing to your route (e.g. `https://your-app.com/webhook`). Select the events you need. After creation, Stripe shows a **Signing secret** (starts with `whsec_`). Store it in your environment (e.g. `STRIPE_WEBHOOK_SECRET`).

## 3. Create the router and handlers

```typescript
import Stripe from 'stripe';
import { StripeWebhookRouter, createStripeVerifier } from '@tayori/stripe';

const stripe = new Stripe(process.env.STRIPE_API_KEY!);
const router = new StripeWebhookRouter();

router.on('payment_intent.succeeded', async (event) => {
  const paymentIntent = event.data.object;
  console.log('Payment succeeded:', paymentIntent.id, paymentIntent.amount);
});

router.on('customer.subscription.deleted', async (event) => {
  const subscription = event.data.object;
  console.log('Subscription canceled:', subscription.id);
});
```

## 4. Wire the adapter

Example with Hono:

```typescript
import { Hono } from 'hono';
import { honoAdapter } from '@tayori/hono';

const app = new Hono();

app.post('/webhook', honoAdapter(router, {
  verifier: createStripeVerifier(stripe, process.env.STRIPE_WEBHOOK_SECRET!),
}));

export default app;
```

For Express, use `express.raw({ type: 'application/json' })` before the adapter. For Lambda, export the handler from `lambdaAdapter(router, { verifier })`.

## 5. Security notes

- **Always verify signatures** — Use `createStripeVerifier`; never trust the body without verification.
- **Use raw body** — Adapters need the raw request body for verification. Do not parse JSON before the verifier.
- **Keep the secret safe** — Do not log or expose `STRIPE_WEBHOOK_SECRET`.

## Type safety

Event names are autocompleted and handlers receive the correct Stripe event type (e.g. `Stripe.PaymentIntentSucceededEvent`). Use the [Stripe Events API](https://stripe.com/docs/api/events/types) and your IDE to explore available events.
