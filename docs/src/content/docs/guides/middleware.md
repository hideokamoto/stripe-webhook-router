---
title: Middleware
description: Add cross-cutting behavior with middleware
---

Middleware runs for every event before and after the handler. Use it for logging, timing, error handling, or other cross-cutting concerns.

## Basic usage

Register middleware with `use()`. Call `next()` to continue to the next middleware or the handler. Execution order is the order of registration; the chain is built in reverse for correct nesting.

```typescript
router.use(async (event, next) => {
  console.log(`[${event.type}] Start`);
  const start = Date.now();

  await next();

  const duration = Date.now() - start;
  console.log(`[${event.type}] Done in ${duration}ms`);
});
```

## Short-circuiting

If you do not call `next()`, the handler and any middleware after you will not run. Use this for early returns (e.g. filtering or auth):

```typescript
router.use(async (event, next) => {
  if (event.type.startsWith('customer.')) {
    await next();
  }
  // Other events are ignored
});
```

## Error handling

Wrap `next()` in try/catch to handle handler (or downstream middleware) errors:

```typescript
router.use(async (event, next) => {
  try {
    await next();
  } catch (error) {
    console.error(`Error processing ${event.type}:`, error);
    throw error; // Re-throw if the adapter should return 500
  }
});
```

## Multiple middleware

Middleware runs in registration order. “Before” logic runs top-to-bottom; “after” logic runs bottom-to-top:

```typescript
router.use(loggingMiddleware);
router.use(timingMiddleware);
router.on('payment_intent.succeeded', handler);

// Execution: logging (before) → timing (before) → handler
//         → timing (after) → logging (after)
```

## With validation

When using `@tayori/zod`, add `withValidation(registry)` as middleware so events are validated before reaching handlers. Place it where you want validation in the pipeline (e.g. after logging, before handlers).
