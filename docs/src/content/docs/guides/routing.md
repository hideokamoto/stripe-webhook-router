---
title: Routing
description: Group handlers, nested routers, and fanout
---

Tayori supports flexible routing: grouping by prefix, mounting nested routers, and running multiple handlers in parallel with fanout.

## Grouping by prefix

Use `group(prefix, callback)` to register handlers under a common prefix without repeating it:

```typescript
const router = new StripeWebhookRouter();

router.group('payment_intent', (r) => {
  r.on('succeeded', async (event) => {
    // Handles payment_intent.succeeded
  });
  r.on('payment_failed', async (event) => {
    // Handles payment_intent.payment_failed
  });
  r.on('canceled', async (event) => {
    // Handles payment_intent.canceled
  });
});
```

## Multiple handlers for one event

You can register several handlers for the same event; they run sequentially:

```typescript
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

## Nested routers

Build a sub-router and mount it under a prefix with `route(prefix, router)`:

```typescript
const subscriptionRouter = new StripeWebhookRouter();
subscriptionRouter.on('created', async (event) => { /* ... */ });
subscriptionRouter.on('updated', async (event) => { /* ... */ });
subscriptionRouter.on('deleted', async (event) => { /* ... */ });

const mainRouter = new StripeWebhookRouter();
mainRouter.route('customer.subscription', subscriptionRouter);
```

Events like `customer.subscription.created` are then handled by `subscriptionRouter`.

## Fanout (parallel handlers)

Use `fanout()` to run multiple handlers for one event in parallel:

```typescript
router.fanout('payment_intent.succeeded', [
  async (event) => await updateDatabase(event),
  async (event) => await sendReceipt(event),
  async (event) => await trackRevenue(event),
], {
  strategy: 'best-effort', // or 'all-or-nothing' (default)
  onError: (error) => console.error('Handler failed:', error),
});
```

- **`all-or-nothing`** — Uses `Promise.all`; first failure rejects the whole fanout.
- **`best-effort`** — Uses `Promise.allSettled`; other handlers still run if one fails.

Use fanout when handlers are independent and you want to reduce total latency.
