---
title: "@tayori/zod"
description: Zod schema validation helpers for runtime validation
---

The Zod package adds runtime schema validation on top of Tayori’s type-safe routing. Use it when you need to validate webhook payloads at runtime (e.g. for external or less trusted sources).

## Installation

```bash
pnpm add @tayori/zod zod
```

**Peer dependency**: `zod` ^4.0.0

## Main exports

| Export | Description |
|--------|-------------|
| `baseEventSchema` | Base Zod schema for webhook events |
| `createEventSchema(type, dataObjectSchema)` | Create typed event schemas |
| `defineEvent(type, dataObjectSchema)` | Define event schema for event maps |
| `SchemaRegistry<TEventMap>` | Runtime schema registry |
| `withValidation(registry, options)` | Middleware for runtime validation |
| `createZodVerifier(options)` | Verifier wrapper that validates after signature verification |
| `WebhookValidationError` | Custom error for validation failures |
| `UnknownEventTypeError` | Error for unregistered event types |

## Basic usage

Define event schemas with `defineEvent`, register them in a `SchemaRegistry`, and use `withValidation` middleware:

```typescript
import { defineEvent, SchemaRegistry, withValidation } from '@tayori/zod';
import { z } from 'zod';

const issueOpened = defineEvent('issue.opened', z.object({
  id: z.number(),
  title: z.string(),
}));

const registry = new SchemaRegistry().registerAll({ issueOpened });

const router = new WebhookRouter<...>();
router.use(withValidation(registry));
```

## Verifier wrapper

You can also validate at verification time with `createZodVerifier`, which wraps your existing verifier and runs Zod validation on the parsed event before returning it.

## Unknown events

You can configure how unknown event types are handled (e.g. reject or allow with a generic shape). See the package API and tests for options.
