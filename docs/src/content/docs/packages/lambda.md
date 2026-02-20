---
title: "@tayori/lambda"
description: AWS Lambda (API Gateway) adapter for Tayori
---

The Lambda adapter runs a Tayori router in response to API Gateway HTTP events (e.g. webhook endpoints behind API Gateway).

## Installation

```bash
pnpm add @tayori/lambda
```

## Usage

```typescript
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
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
  onError: async (error) => console.error(error),
}) as (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;
```

## API

```typescript
function lambdaAdapter<TEventMap>(
  router: WebhookRouter<TEventMap>,
  options: {
    verifier: Verifier;
    onError?: (error: Error, event?: WebhookEvent) => Promise<void>;
  }
): Handler<APIGatewayProxyEvent, APIGatewayProxyResult>
```

The adapter reads the raw body from `event.body` (handling base64-encoded payloads from API Gateway), passes headers from `event.headers`, and returns an `APIGatewayProxyResult` with status 200 (success), 400 (verification failure), or 500 (handler error).
