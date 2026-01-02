# @tayori/zod

Zod schema validation helpers for Tayori webhook router.

## Overview

`@tayori/zod` adds runtime validation to your webhook handlers using [Zod](https://zod.dev/) schemas. Validate event payloads, enforce data contracts, and catch malformed webhooks before they reach your business logic.

## Installation

```bash
npm install @tayori/zod @tayori/core zod
# or
pnpm add @tayori/zod @tayori/core zod
# or
yarn add @tayori/zod @tayori/core zod
```

**Note**: Both `@tayori/core` and `zod` are peer dependencies and must be installed separately. Requires Zod v4.0.0 or higher.

## Features

- **Runtime Validation**: Validate webhook payloads at runtime with Zod schemas
- **Type-Safe**: Full TypeScript support with automatic type inference
- **Flexible**: Validate at the verifier level or middleware level
- **Schema Registry**: Centralized schema management for event types
- **Error Handling**: Detailed validation errors with helpful messages
- **Transform Support**: Apply Zod transformations and defaults to events
- **Unknown Event Handling**: Optionally reject or allow unregistered event types

## Quick Start

### Basic Validation with Middleware

```typescript
import { WebhookRouter } from '@tayori/core';
import { SchemaRegistry, withValidation, createEventSchema } from '@tayori/zod';
import { z } from 'zod';

// Define schemas for your events
const issueOpenedSchema = createEventSchema('issue.opened', z.object({
  id: z.number(),
  title: z.string(),
  body: z.string().optional(),
  labels: z.array(z.string()),
}));

const issueClosedSchema = createEventSchema('issue.closed', z.object({
  id: z.number(),
  closedAt: z.string().datetime(),
}));

// Create a schema registry
const registry = new SchemaRegistry()
  .register('issue.opened', issueOpenedSchema)
  .register('issue.closed', issueClosedSchema);

// Create router with validation middleware
const router = new WebhookRouter();

router.use(withValidation(registry));

router.on('issue.opened', async (event) => {
  // event.data.object is validated and typed!
  const issue = event.data.object;
  console.log(`Issue #${issue.id}: ${issue.title}`);
});
```

### Validation at Verifier Level

```typescript
import { createZodVerifier } from '@tayori/zod';

const verifier = createZodVerifier({
  verifier: createMyCustomVerifier(secret),
  registry,
  allowUnknownEvents: false, // Reject events without schemas
});

app.post('/webhook', honoAdapter(router, { verifier }));
```

## API Reference

### createEventSchema

Create a Zod schema for a webhook event.

```typescript
function createEventSchema<TType, TDataObject>(
  type: TType,
  dataObjectSchema: TDataObject
): ZodSchema
```

**Parameters:**
- `type` - The event type string (e.g., `'issue.opened'`)
- `dataObjectSchema` - Zod schema for the `data.object` property

**Returns:** A Zod schema for the complete event

**Example:**

```typescript
const paymentSchema = createEventSchema('payment.succeeded', z.object({
  id: z.string(),
  amount: z.number().int().positive(),
  currency: z.string().length(3),
  status: z.literal('succeeded'),
}));

type PaymentEvent = z.infer<typeof paymentSchema>;
// {
//   id: string;
//   type: 'payment.succeeded';
//   data: {
//     object: {
//       id: string;
//       amount: number;
//       currency: string;
//       status: 'succeeded';
//     };
//   };
// }
```

### defineEvent

Helper for creating event schema definitions.

```typescript
function defineEvent<TType, TDataObject>(
  type: TType,
  dataObjectSchema: TDataObject
): EventSchemaDefinition
```

**Example:**

```typescript
const issueOpened = defineEvent('issue.opened', z.object({
  id: z.number(),
  title: z.string(),
}));

const issueClosed = defineEvent('issue.closed', z.object({
  id: z.number(),
}));

const schemas = { issueOpened, issueClosed };
type EventMap = InferEventMap<typeof schemas>;
```

### SchemaRegistry

Centralized registry for event schemas.

```typescript
class SchemaRegistry<TEventMap>
```

#### Methods

##### `register(type, schema)`

Register a schema for an event type.

```typescript
registry.register('payment.succeeded', paymentSchema);
```

##### `registerAll(definitions)`

Register multiple event definitions at once.

```typescript
const schemas = {
  paymentSucceeded: defineEvent('payment.succeeded', z.object({ ... })),
  paymentFailed: defineEvent('payment.failed', z.object({ ... })),
};

registry.registerAll(schemas);
```

##### `validate(event)`

Validate an event against its registered schema.

```typescript
const validatedEvent = registry.validate(event);
```

##### `safeParse(event)`

Safely validate an event, returning a result object.

```typescript
const result = registry.safeParse(event);
if (result.success) {
  console.log('Valid:', result.data);
} else {
  console.error('Invalid:', result.error);
}
```

### withValidation

Create a validation middleware.

```typescript
function withValidation<TEventMap>(
  registry: SchemaRegistry<TEventMap>,
  options?: ValidationMiddlewareOptions
): Middleware
```

**Options:**

```typescript
interface ValidationMiddlewareOptions {
  /**
   * Whether to allow events without registered schemas
   * @default true
   */
  allowUnknownEvents?: boolean;

  /**
   * Custom error handler
   */
  onError?: (error: WebhookValidationError | UnknownEventTypeError) => void;
}
```

**Example:**

```typescript
router.use(withValidation(registry, {
  allowUnknownEvents: false, // Reject unknown events
  onError: (error) => {
    console.error('Validation failed:', error);
  },
}));
```

### createZodVerifier

Wrap a verifier with Zod validation.

```typescript
function createZodVerifier<T>(
  options: ZodVerifierOptions<T>
): Verifier<T>
```

**Options:**

```typescript
interface ZodVerifierOptions<T> {
  verifier: Verifier<T>;
  registry: SchemaRegistry;
  allowUnknownEvents?: boolean;
}
```

**Example:**

```typescript
const verifier = createZodVerifier({
  verifier: createStripeVerifier(stripe, secret),
  registry,
  allowUnknownEvents: false,
});
```

## Usage Examples

### GitHub Webhooks

```typescript
import { WebhookRouter } from '@tayori/core';
import { SchemaRegistry, defineEvent, withValidation, InferEventMap } from '@tayori/zod';
import { z } from 'zod';

// Define GitHub event schemas
const pushEvent = defineEvent('push', z.object({
  ref: z.string(),
  commits: z.array(z.object({
    id: z.string(),
    message: z.string(),
    author: z.object({
      name: z.string(),
      email: z.string().email(),
    }),
  })),
}));

const issueEvent = defineEvent('issues', z.object({
  action: z.enum(['opened', 'closed', 'reopened']),
  issue: z.object({
    number: z.number(),
    title: z.string(),
    state: z.enum(['open', 'closed']),
  }),
}));

const schemas = { pushEvent, issueEvent };
type GitHubEventMap = InferEventMap<typeof schemas>;

// Create registry and router
const registry = new SchemaRegistry<GitHubEventMap>()
  .registerAll(schemas);

const router = new WebhookRouter<GitHubEventMap>();

router.use(withValidation(registry, {
  allowUnknownEvents: false, // Only accept registered events
}));

router.on('push', async (event) => {
  const { ref, commits } = event.data.object;
  console.log(`Push to ${ref}: ${commits.length} commits`);
});

router.on('issues', async (event) => {
  const { action, issue } = event.data.object;
  console.log(`Issue #${issue.number} ${action}`);
});
```

### Data Transformations

Zod schemas can transform data:

```typescript
const userCreatedSchema = createEventSchema('user.created', z.object({
  id: z.string(),
  email: z.string().email().toLowerCase(), // Transform to lowercase
  createdAt: z.string().datetime().transform(s => new Date(s)), // Transform to Date
  metadata: z.record(z.string()).default({}), // Default value
  age: z.number().int().positive().optional(),
}));

registry.register('user.created', userCreatedSchema);

router.use(withValidation(registry));

router.on('user.created', async (event) => {
  // event.data.object.email is lowercase
  // event.data.object.createdAt is a Date object
  // event.data.object.metadata exists even if not in payload
  const user = event.data.object;
  console.log(user.createdAt.toISOString());
});
```

### Strict Validation

Prevent extra fields and enforce exact schemas:

```typescript
const strictSchema = createEventSchema('order.created', z.object({
  id: z.string(),
  total: z.number(),
  items: z.array(z.object({
    sku: z.string(),
    quantity: z.number(),
  })),
}).strict()); // Reject unknown fields

registry.register('order.created', strictSchema);
```

### Conditional Validation

Different schemas based on event data:

```typescript
const notificationSchema = createEventSchema('notification', z.object({
  type: z.enum(['email', 'sms', 'push']),
  recipient: z.string(),
  payload: z.unknown(),
}).refine((data) => {
  if (data.type === 'email') {
    return z.object({
      subject: z.string(),
      body: z.string(),
    }).safeParse(data.payload).success;
  }
  if (data.type === 'sms') {
    return z.object({
      message: z.string().max(160),
    }).safeParse(data.payload).success;
  }
  return true;
}, 'Invalid payload for notification type'));
```

## Error Handling

### WebhookValidationError

Thrown when event validation fails:

```typescript
import { WebhookValidationError } from '@tayori/zod';

router.use(withValidation(registry, {
  onError: (error) => {
    if (error instanceof WebhookValidationError) {
      console.error(`Validation failed for ${error.eventType}`);
      console.error('Zod errors:', error.zodError.errors);
    }
  },
}));
```

### UnknownEventTypeError

Thrown when `allowUnknownEvents: false` and an unregistered event is received:

```typescript
import { UnknownEventTypeError } from '@tayori/zod';

router.use(withValidation(registry, {
  allowUnknownEvents: false,
  onError: (error) => {
    if (error instanceof UnknownEventTypeError) {
      console.error(`Unknown event type: ${error.eventType}`);
    }
  },
}));
```

## Advanced Patterns

### Partial Validation

Validate only specific fields:

```typescript
const partialSchema = createEventSchema('user.updated', z.object({
  id: z.string(),
  email: z.string().email().optional(),
  name: z.string().optional(),
  age: z.number().optional(),
}).partial().required({ id: true })); // Only id is required
```

### Nested Object Validation

```typescript
const orderSchema = createEventSchema('order.placed', z.object({
  orderId: z.string(),
  customer: z.object({
    id: z.string(),
    email: z.string().email(),
    address: z.object({
      street: z.string(),
      city: z.string(),
      zipCode: z.string().regex(/^\d{5}$/),
    }),
  }),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().int().positive(),
    price: z.number().positive(),
  })).min(1),
  total: z.number().positive(),
}));
```

### Custom Validators

Add custom validation logic:

```typescript
const priceSchema = z.object({
  amount: z.number(),
  currency: z.string(),
}).refine(
  (data) => {
    // Custom validation: USD amounts must be >= 0.50
    if (data.currency === 'USD' && data.amount < 50) {
      return false;
    }
    return true;
  },
  {
    message: 'USD amounts must be at least $0.50',
    path: ['amount'],
  }
);
```

## Testing

### Unit Testing with Zod Validation

```typescript
import { describe, it, expect } from 'vitest';
import { SchemaRegistry, createEventSchema } from '@tayori/zod';
import { z } from 'zod';

describe('Event validation', () => {
  it('validates correct events', () => {
    const schema = createEventSchema('test.event', z.object({
      value: z.number(),
    }));

    const registry = new SchemaRegistry().register('test.event', schema);

    const event = {
      id: '123',
      type: 'test.event',
      data: { object: { value: 42 } },
    };

    expect(() => registry.validate(event)).not.toThrow();
  });

  it('rejects invalid events', () => {
    const schema = createEventSchema('test.event', z.object({
      value: z.number(),
    }));

    const registry = new SchemaRegistry().register('test.event', schema);

    const event = {
      id: '123',
      type: 'test.event',
      data: { object: { value: 'not-a-number' } },
    };

    expect(() => registry.validate(event)).toThrow();
  });
});
```

## Migration from TypeScript-Only Validation

If you currently rely only on TypeScript types:

```typescript
// Before: TypeScript only (no runtime validation)
router.on('payment.succeeded', async (event) => {
  const amount = event.data.object.amount; // Might be undefined at runtime!
});

// After: Runtime validation with Zod
const paymentSchema = createEventSchema('payment.succeeded', z.object({
  amount: z.number(),
}));

registry.register('payment.succeeded', paymentSchema);
router.use(withValidation(registry));

router.on('payment.succeeded', async (event) => {
  const amount = event.data.object.amount; // Guaranteed to be a number
});
```

## Requirements

- Node.js >= 18
- TypeScript >= 5.3
- Zod >= 4.0.0

## Related Packages

- [`@tayori/core`](../core) - Core webhook routing logic
- [`@tayori/stripe`](../stripe) - Stripe-specific type definitions and verifier
- [`@tayori/hono`](../hono) - Hono framework adapter
- [`@tayori/express`](../express) - Express framework adapter
- [`@tayori/lambda`](../lambda) - AWS Lambda adapter
- [`@tayori/eventbridge`](../eventbridge) - AWS EventBridge adapter

## Documentation

For more examples and guides, see the [main documentation](../../README.md).

## License

MIT
