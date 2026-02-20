---
title: "@tayori/core"
description: Framework-agnostic webhook routing engine
---

The core package provides the webhook routing engine with no framework dependencies. All adapters (Hono, Express, Lambda, EventBridge) build on top of it.

## Installation

```bash
pnpm add @tayori/core
```

## Main exports

| Export | Description |
|--------|-------------|
| `WebhookRouter<TEventMap>` | Base router class with generic event type support |
| `WebhookEvent` | Base event interface |
| `Verifier` | Type for signature verification functions |
| `HandlerFunction<TEvent>` | Type for event handler functions |
| `MiddlewareFunction` | Type for middleware functions |

## Key methods

```typescript
class WebhookRouter<TEventMap extends Record<string, WebhookEvent>> {
  on(event: string | string[], handler: HandlerFunction): this
  use(middleware: MiddlewareFunction): this
  group(prefix: string, callback: (router: this) => void): this
  route(prefix: string, router: WebhookRouter): this
  fanout(event: string, handlers: HandlerFunction[], options?: FanoutOptions): this
  dispatch(event: WebhookEvent): Promise<void>
}
```

## Event type map

When using the core router with custom events, define a type map that maps event type strings to your event interfaces:

```typescript
import { WebhookRouter, type WebhookEvent } from '@tayori/core';

interface MyEvent extends WebhookEvent {
  type: 'my.event';
  data: { object: { id: string } };
}

type MyEventMap = {
  'my.event': MyEvent;
};

const router = new WebhookRouter<MyEventMap>();
router.on('my.event', async (event) => {
  // event is typed as MyEvent
  console.log(event.data.object.id);
});
```

## Fanout strategies

When using `fanout()` to run multiple handlers in parallel:

- **`all-or-nothing`** (default) — All handlers must succeed; uses `Promise.all`
- **`best-effort`** — Continues even if some handlers fail; uses `Promise.allSettled`

## Middleware

Middleware runs in registration order. The chain builds in reverse for proper nesting, and you control flow with `next()`:

```typescript
router.use(async (event, next) => {
  console.log(`Processing ${event.type}`);
  await next();
  console.log(`Done ${event.type}`);
});
```

See [Middleware](/guides/middleware/) for more patterns.
