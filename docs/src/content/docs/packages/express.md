---
title: "@tayori/express"
description: Express framework adapter for Tayori
---

The Express adapter connects a Tayori router to an Express app. You must provide the raw request body for signature verification.

## Installation

```bash
pnpm add @tayori/express express
```

**Peer dependency**: `express` >= 4.0.0

## Usage

You **must** use `express.raw({ type: 'application/json' })` so the route receives the raw body. Do not use `express.json()` for the webhook route.

```typescript
import express from 'express';
import Stripe from 'stripe';
import { StripeWebhookRouter, createStripeVerifier } from '@tayori/stripe';
import { expressAdapter } from '@tayori/express';

const stripe = new Stripe(process.env.STRIPE_API_KEY!);
const router = new StripeWebhookRouter();

router.on('charge.succeeded', async (event) => {
  console.log('Charge succeeded:', event.data.object.id);
});

const app = express();

app.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  expressAdapter(router, {
    verifier: createStripeVerifier(stripe, process.env.STRIPE_WEBHOOK_SECRET!),
    onError: async (error) => console.error(error),
  })
);

app.listen(3000);
```

## API

```typescript
function expressAdapter<TEventMap>(
  router: WebhookRouter<TEventMap>,
  options: {
    verifier: Verifier;
    onError?: (error: Error, event?: WebhookEvent) => Promise<void>;
  }
): express.RequestHandler
```

If the body is already parsed (e.g. by `express.json()`), the adapter will throw. Always put `express.raw({ type: 'application/json' })` before the adapter on the webhook route.
