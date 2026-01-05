# CLAUDE.md - Tayori Development Guide

This document provides comprehensive context for Claude Code and AI assistants working on the Tayori project.

## Project Overview

**Tayori** is a Hono-inspired, type-safe webhook routing library for TypeScript. Originally built for Stripe webhooks, it has evolved into a framework-agnostic webhook handling solution that works with any event source.

**Key Characteristics**:
- Type-safe webhook routing with full TypeScript support
- Framework-agnostic core with adapters for popular platforms
- First-class Stripe support with 351+ event types
- Monorepo structure using pnpm workspaces
- Node.js >= 18 required

## Architecture

### Monorepo Structure

This is a pnpm workspace monorepo with **8 packages**:

```
packages/
├── core/          # Framework-agnostic routing logic and Verifier interface
├── stripe/        # Stripe-specific types, router, and signature verifier
├── zod/           # Zod schema validation helpers for runtime validation
├── hono/          # Hono framework adapter
├── express/       # Express framework adapter
├── lambda/        # AWS Lambda (API Gateway) adapter
├── eventbridge/   # AWS EventBridge adapter
└── create-tayori/ # CLI scaffolding tool for new projects
```

### Core Design Principles

1. **Type Safety First**: All events are fully typed using generics
2. **Framework Agnostic Core**: Core routing logic has zero framework dependencies
3. **Adapter Pattern**: Framework integrations are separate packages that wrap the core
4. **Chainable API**: Hono-inspired fluent interface for registering handlers
5. **Pluggable Verification**: Bring your own verifier for any webhook provider
6. **Runtime Validation**: Optional Zod integration for schema validation

## Package Details

### 1. @tayori/core (`packages/core/src/index.ts`)

**Purpose**: Framework-agnostic webhook routing engine

**Main Exports**:
- `WebhookRouter<TEventMap>` - Base router class with generic event type support
- `WebhookEvent` - Base event interface
- `Verifier` - Type for signature verification functions
- `HandlerFunction<TEvent>` - Type for event handler functions
- `MiddlewareFunction` - Type for middleware functions

**Key Methods**:
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

**Fanout Strategies**:
- `all-or-nothing` (default): All handlers must succeed (uses `Promise.all`)
- `best-effort`: Continue even if some handlers fail (uses `Promise.allSettled`)

**Middleware Pattern**:
- Middleware chain builds in reverse order for proper nesting
- Supports `next()` function for control flow
- Can short-circuit execution by not calling `next()`

**Tests**: `packages/core/test/webhook-router.test.ts` (512 lines)
- Comprehensive unit tests for all routing features
- Tests for middleware, grouping, fanout, error handling

### 2. @tayori/stripe (`packages/stripe/src/index.ts`)

**Purpose**: Stripe-specific type definitions and utilities

**Main Exports**:
- `StripeWebhookRouter` - Extends `WebhookRouter` with Stripe-specific types
- `StripeEventMap` - Type map of all 351+ Stripe event types
- `createStripeVerifier(stripe, secret)` - Factory for Stripe signature verification
- Re-exports from `@tayori/core` for convenience

**CRITICAL: StripeEventMap Maintenance**:
The `StripeEventMap` type definition is **manually maintained** and maps event type strings to Stripe SDK types.

**Current Coverage** (351+ events across categories):
- account.* (14 events)
- application_fee.* (2 events)
- balance.* (1 event)
- billing.* (3 events)
- billing_portal.* (3 events)
- capability.* (2 events)
- cash_balance.* (1 event)
- charge.* (13 events)
- checkout.session.* (3 events)
- climate.* (4 events)
- coupon.* (3 events)
- credit_note.* (3 events)
- customer.* (7 events)
- customer_cash_balance_transaction.* (1 event)
- dispute.* (5 events)
- entitlements.* (2 events)
- event.* (1 event)
- file.* (1 event)
- financial_connections.* (4 events)
- identity.* (1 event)
- invoice.* (19 events)
- invoiceitem.* (3 events)
- issuing.* (19 events)
- mandate.* (1 event)
- payment_intent.* (9 events)
- payment_link.* (2 events)
- payment_method.* (5 events)
- payout.* (7 events)
- person.* (3 events)
- plan.* (3 events)
- price.* (3 events)
- product.* (3 events)
- promotion_code.* (2 events)
- quote.* (4 events)
- radar.* (1 event)
- refund.* (3 events)
- reporting.* (2 events)
- review.* (2 events)
- setup_intent.* (4 events)
- sigma.* (1 event)
- source.* (8 events)
- subscription.* (4 events)
- subscription_schedule.* (6 events)
- tax.* (3 events)
- tax_rate.* (3 events)
- terminal.* (1 event)
- test_helpers.* (1 event)
- topup.* (4 events)
- transfer.* (4 events)
- treasury.* (15 events)

**Maintenance Process**:
1. Update Stripe peer dependency in `packages/stripe/package.json`
2. Run `cd packages/stripe && pnpm run check-events`
3. Manually update `StripeEventMap` to match SDK changes
4. Verify types compile: `pnpm typecheck`
5. Run tests: `pnpm test`

See `packages/stripe/MAINTAINING_STRIPE_EVENTMAP.md` for detailed maintenance procedures.

**Tests**: `packages/stripe/test/stripe-router.test.ts`

### 3. @tayori/zod (`packages/zod/src/index.ts` - 361 lines)

**Purpose**: Zod schema validation helpers for runtime validation

**Main Exports**:
- `baseEventSchema` - Base Zod schema for webhook events
- `createEventSchema(type, dataObjectSchema)` - Create typed event schemas
- `defineEvent(type, dataObjectSchema)` - Define event schema for use with event maps
- `SchemaRegistry<TEventMap>` - Runtime schema registry for validation
- `withValidation(registry, options)` - Middleware for runtime validation
- `createZodVerifier(options)` - Verifier wrapper that validates after signature verification
- `WebhookValidationError` - Custom error class for validation failures
- `UnknownEventTypeError` - Error for unregistered event types

**Key Features**:
- Runtime schema validation using Zod
- Type-safe event map inference from schema definitions
- Middleware-based validation
- Verifier wrapper for validation at signature verification time
- Support for unknown events (configurable)

**Usage Pattern**:
```typescript
import { defineEvent, SchemaRegistry, withValidation } from '@tayori/zod';
import { z } from 'zod';

// Define event schemas
const issueOpened = defineEvent('issue.opened', z.object({
  id: z.number(),
  title: z.string(),
}));

// Create registry and register schemas
const registry = new SchemaRegistry()
  .registerAll({ issueOpened });

// Use with middleware
router.use(withValidation(registry));
```

**Peer Dependencies**: `zod ^4.0.0`

**Tests**: `packages/zod/test/*.test.ts`

### 4. create-tayori (`packages/create-tayori/src/`)

**Purpose**: Interactive CLI scaffolding tool for creating new Tayori projects

**Architecture**:
```
src/
├── index.ts (74 lines)           # Main orchestration
├── cli.ts (40 lines)             # CLI argument parsing with cac
├── prompts.ts (83 lines)         # Interactive prompts
├── generators/
│   └── hono.ts (75 lines)        # Hono project generator
└── utils/
    ├── logger.ts (26 lines)      # Colored logging with picocolors
    ├── files.ts (92 lines)       # Template copying and variable replacement
    └── install.ts                # Dependency installation with package managers
```

**CLI Options**:
```bash
npx create-tayori [project-name] [options]

Options:
  --fw, --framework <name>    Framework choice (hono, express, lambda, eventbridge)
  --pm, --package-manager <pm> Package manager (pnpm, npm, yarn, bun)
  --skip-install              Skip dependency installation
  -h, --help                  Display help message
```

**Current Framework Support**:
- ✅ Hono (enabled)
- 🚧 Express (coming soon)
- 🚧 Lambda (coming soon)
- 🚧 EventBridge (coming soon)

**Template System**:
- Templates located in `packages/create-tayori/templates/`
- Variable replacement: `{{PROJECT_NAME}}`, `{{PACKAGE_MANAGER}}`
- Copies entire template directory structure
- Preserves file permissions

**Dependencies**:
- `cac` - CLI argument parsing
- `prompts` - Interactive terminal prompts
- `picocolors` - Colored console output
- `execa` - Execute shell commands (for package installation)
- `ora` - Loading spinners

**Tests**: Comprehensive unit tests in `src/**/*.test.ts`
- `cli.test.ts` - CLI argument parsing
- `generators/hono.test.ts` - Hono project generation
- `prompts.test.ts`, `index.test.ts` - Configuration and orchestration
- `utils/*.test.ts` - Utility functions

### 5. Hono Template (`packages/create-tayori/templates/hono/`)

**Template Structure**:
```
templates/hono/
├── .env.example              # Environment variables template
├── .gitignore
├── README.md                 # Generated project documentation
├── package.json              # With template variables
├── tsconfig.json
├── tsup.config.ts
└── src/
    ├── index.ts (58 lines)   # Main Hono app with webhook route
    └── handlers/
        ├── payment.ts (59 lines)      # Payment event handlers
        └── subscription.ts (81 lines) # Subscription event handlers
```

**Template Features**:
- Complete working Hono app with webhook route
- Example handlers for payment and subscription events
- Logging middleware with timing
- Grouped event handlers using `router.group()`
- TypeScript configuration with strict mode
- Build setup with tsup
- Dev server with tsx

**Example Handlers**:
- Payment: `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`, `charge.succeeded`, `charge.refunded`
- Subscription: `customer.subscription.created`, `updated`, `deleted`, `trial_will_end`, `invoice.paid`, `invoice.payment_failed`

### 6. @tayori/hono (`packages/hono/src/index.ts` - 90 lines)

**Purpose**: Hono framework adapter

**Main Export**:
```typescript
function honoAdapter<TEventMap extends Record<string, WebhookEvent>>(
  router: WebhookRouter<TEventMap>,
  options: HonoAdapterOptions
): (c: Context) => Promise<Response>

interface HonoAdapterOptions {
  verifier: Verifier;
  onError?: (error: Error, event?: WebhookEvent) => Promise<void>;
}
```

**Key Implementation Details**:
- Extracts raw body using `c.req.text()` (required for signature verification)
- Reads headers using `c.req.header()`
- Returns proper Hono `Response` objects
- Error handling:
  - Signature verification failure → 400 Bad Request
  - Handler errors → Call `onError` if provided → 500 Internal Server Error
  - Never expose internal error details

**Tests**: `packages/hono/test/hono-adapter.test.ts`
- Integration tests with actual Hono app
- Signature verification tests
- Error handling tests

### 7. @tayori/express (`packages/express/src/index.ts` - 106 lines)

**Purpose**: Express framework adapter

**Main Export**:
```typescript
function expressAdapter<TEventMap extends Record<string, WebhookEvent>>(
  router: WebhookRouter<TEventMap>,
  options: ExpressAdapterOptions
): express.RequestHandler

interface ExpressAdapterOptions {
  verifier: Verifier;
  onError?: (error: Error, event?: WebhookEvent) => Promise<void>;
}
```

**CRITICAL**: Requires `express.raw({ type: 'application/json' })` middleware before the adapter to get raw body for signature verification.

**Key Implementation Details**:
- Validates raw body is Buffer or string
- Throws error if body is already parsed (common mistake)
- Error handling follows same pattern as Hono adapter

**Tests**: `packages/express/test/express-adapter.test.ts`

### 8. @tayori/lambda (`packages/lambda/src/index.ts` - 111 lines)

**Purpose**: AWS Lambda (API Gateway) adapter

**Main Export**:
```typescript
function lambdaAdapter<TEventMap extends Record<string, WebhookEvent>>(
  router: WebhookRouter<TEventMap>,
  options: LambdaAdapterOptions
): Handler<APIGatewayProxyEvent, APIGatewayProxyResult>

interface LambdaAdapterOptions {
  verifier: Verifier;
  onError?: (error: Error, event?: WebhookEvent) => Promise<void>;
}
```

**Key Implementation Details**:
- Handles base64-encoded bodies from API Gateway
- Extracts headers from `event.headers`
- Returns proper `APIGatewayProxyResult` format
- Status codes: 200 (success), 400 (verification failure), 500 (handler error)

**Tests**: `packages/lambda/test/lambda-adapter.test.ts`

### 9. @tayori/eventbridge (`packages/eventbridge/src/index.ts` - 48 lines)

**Purpose**: AWS EventBridge adapter

**Main Export**:
```typescript
function eventBridgeAdapter<TEventMap extends Record<string, WebhookEvent>>(
  router: WebhookRouter<TEventMap>,
  options: EventBridgeAdapterOptions
): Handler<EventBridgeEvent<string, any>, void>

interface EventBridgeAdapterOptions {
  onError?: (error: Error, event?: WebhookEvent) => Promise<void>;
}
```

**Key Implementation Details**:
- **No signature verification needed** (AWS guarantees event authenticity)
- Extracts webhook event from `event.detail` field
- Simpler than other adapters due to AWS security guarantees

**Tests**: `packages/eventbridge/test/eventbridge-adapter.test.ts`

## Common Development Tasks

### Adding a New Framework Adapter

1. **Create Package Structure**:
   ```bash
   mkdir -p packages/new-adapter/{src,test}
   cd packages/new-adapter
   ```

2. **Initialize package.json**:
   ```json
   {
     "name": "@tayori/new-adapter",
     "dependencies": {
       "@tayori/core": "workspace:*",
       "stripe": ">=17.0.0"
     },
     "peerDependencies": {
       "framework-name": "^x.x.x",
       "stripe": ">=17.0.0"
     }
   }
   ```

3. **Implement Adapter Function** (`src/index.ts`):
   - Accept `WebhookRouter<TEventMap>` and options (must include `verifier`)
   - Extract raw request body (critical for signature verification)
   - Extract headers
   - Call `verifier(body, headers)` to get parsed event
   - Call `router.dispatch(event)`
   - Handle errors appropriately (400 for verification, 500 for handler errors)
   - Return framework-specific response

4. **Re-export Core Types**:
   ```typescript
   export { WebhookRouter, type WebhookEvent, type Verifier } from '@tayori/core';
   ```

5. **Add Tests** (`test/adapter.test.ts`):
   - Test successful event dispatch
   - Test signature verification failure
   - Test handler errors
   - Test error callback invocation

6. **Update Root README.md** with usage example

### Adding a New Scaffolding Template

1. **Create Template Directory**:
   ```bash
   mkdir -p packages/create-tayori/templates/framework-name
   ```

2. **Add Template Files**:
   - `.env.example` - Environment variables
   - `.gitignore`
   - `README.md` - Use `{{PROJECT_NAME}}` and `{{PACKAGE_MANAGER}}` variables
   - `package.json` - Use template variables
   - `tsconfig.json`, `tsup.config.ts`
   - `src/index.ts` - Main application file
   - `src/handlers/` - Example event handlers

3. **Create Generator** (`packages/create-tayori/src/generators/framework-name.ts`):
   ```typescript
   import { copyTemplate, replaceInFile } from '../utils/files';

   export async function generateFrameworkProject(
     projectName: string,
     packageManager: string
   ): Promise<void> {
     const templateDir = path.join(__dirname, '../../templates/framework-name');
     await copyTemplate(templateDir, projectName);

     // Replace template variables
     const replacements = {
       '{{PROJECT_NAME}}': projectName,
       '{{PACKAGE_MANAGER}}': packageManager,
     };

     await replaceInFile(
       path.join(projectName, 'package.json'),
       replacements
     );
     await replaceInFile(
       path.join(projectName, 'README.md'),
       replacements
     );
   }
   ```

4. **Enable in CLI** (`packages/create-tayori/src/prompts.ts`):
   - Add framework to `FRAMEWORKS` array
   - Implement generation logic in `src/index.ts`

5. **Add Tests** (`packages/create-tayori/src/generators/framework-name.test.ts`)

### Updating Stripe Events

**When Stripe SDK is Updated**:

1. **Update Peer Dependency**:
   ```bash
   cd packages/stripe
   # Edit package.json to update stripe version
   pnpm install
   ```

2. **Check for Event Changes**:
   ```bash
   pnpm run check-events
   ```
   This script compares the event map against the Stripe SDK and reports:
   - Events in SDK but missing from map
   - Events in map but not in SDK

3. **Manually Update StripeEventMap**:
   - Open `packages/stripe/src/index.ts`
   - Add new events to the type map following existing patterns
   - Remove obsolete events if any

4. **Verify Compilation**:
   ```bash
   cd ../..
   pnpm typecheck
   ```

5. **Run Tests**:
   ```bash
   pnpm test
   ```

6. **Update Documentation**: Update event count in this file and README.md

### Adding Features to Core Router

**Guidelines for Core Changes**:

1. **Maintain Type Safety**: Use generics `<TEventMap extends Record<string, WebhookEvent>>`

2. **Follow Builder Pattern**: Methods should return `this` for chaining

3. **Support Flexible Parameters**: Accept both single values and arrays where appropriate
   ```typescript
   on(event: string | string[], handler: HandlerFunction): this
   ```

4. **Update Interface**: Add method signatures to `WebhookRouter` class

5. **Add Tests**: Update `packages/core/test/webhook-router.test.ts`

6. **Document**: Add usage examples to README.md

**Example: Adding a New Method**:
```typescript
class WebhookRouter<TEventMap extends Record<string, WebhookEvent>> {
  // New method
  public onMultiple(
    events: Array<keyof TEventMap>,
    handler: HandlerFunction<TEventMap[keyof TEventMap]>
  ): this {
    for (const event of events) {
      this.on(event as string, handler);
    }
    return this;
  }
}
```

## Testing Strategy

### Unit Tests

**Framework**: Vitest with Node environment

**Test Organization**:
- Core: `packages/core/test/webhook-router.test.ts`
  - Routing logic, middleware, grouping, fanout
- Stripe: `packages/stripe/test/stripe-router.test.ts`
  - Type exports and router instantiation
- Zod: `packages/zod/test/*.test.ts`
  - Schema validation, middleware, verifier wrapper
- Adapters: `packages/{hono,express,lambda,eventbridge}/test/*.test.ts`
  - Integration tests with framework
  - Signature verification
  - Error handling
- create-tayori: `packages/create-tayori/src/**/*.test.ts`
  - CLI parsing, generators, utilities

**Running Tests**:
```bash
# All packages
pnpm test

# Recursive (same as above)
pnpm -r test

# Specific package
cd packages/core
pnpm test

# Watch mode
pnpm test --watch

# Coverage
pnpm test --coverage
```

### Type Tests

Some tests verify TypeScript compilation:
```typescript
// This test passes if it compiles
type TestEventType = StripeEventMap['payment_intent.succeeded'];
expect(true).toBe(true);
```

### Test-Driven Development

The project follows TDD principles:
1. Write failing test
2. Implement minimal code to pass
3. Refactor for quality
4. Repeat

**Example Test Pattern**:
```typescript
import { describe, it, expect, vi } from 'vitest';

describe('WebhookRouter', () => {
  it('should register and dispatch event handlers', async () => {
    const router = new WebhookRouter();
    const handler = vi.fn();

    router.on('test.event', handler);

    await router.dispatch({
      id: '123',
      type: 'test.event',
      data: { object: {} }
    });

    expect(handler).toHaveBeenCalledOnce();
  });
});
```

## Build System

### TypeScript Configuration

**Base Config** (`tsconfig.base.json`):
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "exactOptionalPropertyTypes": true
  }
}
```

Each package extends the base config with package-specific settings.

### Build Tool: tsup

**Configuration** (typical `tsup.config.ts`):
```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
});
```

**Output**:
- ESM: `dist/index.js`
- CJS: `dist/index.cjs`
- Types: `dist/index.d.ts`
- Source maps: `dist/*.map`

### Build Commands

```bash
# Build all packages
pnpm build

# Build specific package
cd packages/core
pnpm build

# Type check all
pnpm typecheck

# Lint all
pnpm lint

# All checks
pnpm build && pnpm typecheck && pnpm lint && pnpm test
```

## Git Workflow

### Branch Strategy

- **Main Branch**: Default branch for PRs and releases
- **Feature Branches**: Use `claude/*` prefix for Claude Code work
  - Example: `claude/add-new-adapter-ABC123`
  - Branch must start with `claude/` and end with matching session ID

### Commit Conventions

Follow conventional commits style:
```
feat: add new adapter for framework X
fix: resolve signature verification issue
docs: update README with new examples
test: add tests for fanout strategy
refactor: simplify middleware chain building
chore: update dependencies
```

**Good Commit Messages**:
- Focus on the "why" rather than the "what"
- Be concise but descriptive
- Reference issues/PRs when applicable

### Git Operations

**Push to Feature Branch**:
```bash
git push -u origin claude/feature-name-SESSION_ID
```

**Important**: Branch name must match the pattern or push will fail with 403.

**Retry Logic for Network Errors**:
- Retry up to 4 times with exponential backoff (2s, 4s, 8s, 16s)
- Only retry on network errors, not authentication failures

## Performance Considerations

### Middleware Chain

- Middleware chain builds in **reverse order** for proper nesting
- No caching needed - handlers registered once at startup
- Middleware execution is sequential, not parallel

### Fanout Handlers

- `all-or-nothing` uses `Promise.all()` - fast-fail on first error
- `best-effort` uses `Promise.allSettled()` - waits for all handlers
- Handlers execute in parallel within their strategy

### Router Dispatch

- Event type lookup is O(1) hash map access
- Multiple handlers for same event execute sequentially
- Middleware wraps handler execution

## Security Best Practices

### Signature Verification

**CRITICAL**: Always verify webhook signatures before processing events.

**Correct Pattern**:
```typescript
// 1. Get raw body (Buffer or string)
const rawBody = await getRawRequestBody(request);

// 2. Verify signature BEFORE parsing
const { event } = verifier(rawBody, headers);

// 3. Now safe to process
await router.dispatch(event);
```

**Common Mistakes to Avoid**:
❌ Parsing JSON before signature verification
❌ Using parsed body for verification
❌ Skipping verification in "development mode"
❌ Exposing webhook secrets in error messages

### Error Handling

**Adapter Error Handling Pattern**:
```typescript
try {
  const { event } = verifier(body, headers);
  await router.dispatch(event);
  return successResponse();
} catch (error) {
  if (isVerificationError(error)) {
    // Don't expose details
    return response(400, 'Invalid signature');
  }

  if (onError) {
    await onError(error, event);
  }

  // Don't expose internal errors
  return response(500, 'Internal server error');
}
```

**Never expose**:
- Webhook secrets
- Stack traces
- Internal error details
- Database connection strings

### AWS EventBridge Special Case

EventBridge events don't require signature verification because:
- Events come from AWS infrastructure
- AWS guarantees event authenticity
- Signature verification would be redundant

## Code Quality Standards

### TypeScript Standards

- **Strict mode enabled** with additional checks
- **No implicit any** allowed
- **Exhaustive type checking** for unions
- **Exact optional property types**
- **No unchecked indexed access**

### ESLint Configuration

```bash
# Lint all packages
pnpm lint

# Lint specific files
pnpm lint packages/core/src
```

### Code Review Checklist

Before submitting PRs, verify:
- [ ] All tests pass (`pnpm test`)
- [ ] Types compile (`pnpm typecheck`)
- [ ] Linting passes (`pnpm lint`)
- [ ] Build succeeds (`pnpm build`)
- [ ] Type safety preserved
- [ ] Error handling implemented
- [ ] Security best practices followed
- [ ] Documentation updated
- [ ] Tests added for new features

## Common Patterns

### Type-Safe Event Handler

```typescript
const router = new StripeWebhookRouter();

// Event name is autocompleted and validated
router.on('payment_intent.succeeded', async (event) => {
  // event is typed as Stripe.PaymentIntentSucceededEvent
  const amount = event.data.object.amount;      // ✅ TypeScript knows this exists
  const currency = event.data.object.currency;  // ✅ Fully typed
});

// TypeScript error on invalid event names
router.on('invalid.event.name', async (event) => {
  // ❌ Compile error
});
```

### Middleware Pattern

```typescript
// Logging middleware
router.use(async (event, next) => {
  console.log(`[${event.type}] Processing event ${event.id}`);
  const start = Date.now();

  await next();

  const duration = Date.now() - start;
  console.log(`[${event.type}] Completed in ${duration}ms`);
});

// Error handling middleware
router.use(async (event, next) => {
  try {
    await next();
  } catch (error) {
    console.error(`Error processing ${event.type}:`, error);
    // Send to error tracking service
    throw error;
  }
});
```

### Grouping Handlers

```typescript
// Group related event handlers
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

### Multiple Handlers for Same Event

```typescript
// All three handlers will execute sequentially
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

### Fanout Pattern

```typescript
// Execute handlers in parallel
router.fanout('payment_intent.succeeded', [
  async (event) => await updateDatabase(event),
  async (event) => await sendReceipt(event),
  async (event) => await trackRevenue(event),
], {
  strategy: 'best-effort', // Continue even if some handlers fail
  onError: (error) => console.error('Handler failed:', error),
});
```

### Nested Routers

```typescript
// Create specialized routers
const subscriptionRouter = new StripeWebhookRouter();
subscriptionRouter.on('created', async (event) => { /* ... */ });
subscriptionRouter.on('updated', async (event) => { /* ... */ });
subscriptionRouter.on('deleted', async (event) => { /* ... */ });

// Mount under prefix
const mainRouter = new StripeWebhookRouter();
mainRouter.route('customer.subscription', subscriptionRouter);
```

### Custom Verifier (Non-Stripe)

```typescript
import crypto from 'crypto';
import type { Verifier } from '@tayori/core';

function createGitHubVerifier(secret: string): Verifier {
  return (payload, headers) => {
    const signature = headers['x-hub-signature-256'];
    if (!signature) {
      throw new Error('Missing x-hub-signature-256 header');
    }

    const hmac = crypto.createHmac('sha256', secret);
    const digest = 'sha256=' + hmac.update(payload).digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))) {
      throw new Error('Invalid signature');
    }

    const body = JSON.parse(payload.toString());
    return {
      event: {
        id: headers['x-github-delivery'] ?? crypto.randomUUID(),
        type: headers['x-github-event'] ?? 'unknown',
        data: { object: body },
      },
    };
  };
}
```

## Anti-Patterns to Avoid

### Core Package Anti-Patterns

❌ **Don't add framework-specific code to core**
```typescript
// ❌ Bad: Framework dependency in core
import { Context } from 'hono';

// ✅ Good: Keep core framework-agnostic
export class WebhookRouter<TEventMap> { }
```

❌ **Don't make core types Stripe-specific**
```typescript
// ❌ Bad: Stripe types in core
import Stripe from 'stripe';

// ✅ Good: Generic event types
export interface WebhookEvent {
  id: string;
  type: string;
  data: { object: any };
}
```

### Adapter Anti-Patterns

❌ **Don't parse body before signature verification**
```typescript
// ❌ Bad: Parsing before verification
const event = JSON.parse(body);
const verified = verifier(body, headers);

// ✅ Good: Verify first, then parse
const { event } = verifier(body, headers);
```

❌ **Don't expose internal errors**
```typescript
// ❌ Bad: Leaking error details
catch (error) {
  return res.status(500).json({ error: error.message });
}

// ✅ Good: Generic error message
catch (error) {
  return res.status(500).json({ error: 'Internal server error' });
}
```

### Type Safety Anti-Patterns

❌ **Don't use `any` types**
```typescript
// ❌ Bad: Losing type safety
router.on('payment_intent.succeeded', async (event: any) => { });

// ✅ Good: Inferred types
router.on('payment_intent.succeeded', async (event) => {
  // event is automatically typed as Stripe.PaymentIntentSucceededEvent
});
```

❌ **Don't skip signature verification**
```typescript
// ❌ Bad: Trusting unverified webhooks
app.post('/webhook', async (req, res) => {
  const event = req.body;  // Never trust unverified data
  await router.dispatch(event);
});

// ✅ Good: Always verify signatures
app.post('/webhook', honoAdapter(router, {
  verifier: createStripeVerifier(stripe, secret),
}));
```

## Critical Implementation Details

### Verifier Contract

All verifiers must implement this contract:
```typescript
type Verifier = (
  payload: Buffer | string,
  headers: Record<string, string | undefined>
) => { event: WebhookEvent } | Promise<{ event: WebhookEvent }>;
```

**Requirements**:
- Accept raw payload (Buffer or string, NOT parsed JSON)
- Accept headers as key-value map
- Verify signature/authenticity
- Parse payload into WebhookEvent
- Throw error on verification failure
- Return `{ event }` object on success

### Adapter Response Patterns

**Success Response**: 200 OK with empty body
**Verification Failure**: 400 Bad Request with generic message
**Handler Error**: 500 Internal Server Error with generic message

**Example**:
```typescript
// Success
return { statusCode: 200, body: 'OK' };

// Verification failure
return { statusCode: 400, body: 'Invalid signature' };

// Handler error
return { statusCode: 500, body: 'Internal server error' };
```

### Middleware Execution Order

Middleware executes in **registration order**, but the chain builds in **reverse**:

```typescript
router.use(middleware1);  // Executes first
router.use(middleware2);  // Executes second
router.on('event', handler);

// Execution flow:
// middleware1 (before next) →
//   middleware2 (before next) →
//     handler →
//   middleware2 (after next) →
// middleware1 (after next)
```

## Important Files Reference

### Critical Files (Manual Maintenance Required)

- `packages/stripe/src/index.ts` - **StripeEventMap** (351+ event types)
- `packages/stripe/MAINTAINING_STRIPE_EVENTMAP.md` - Event map maintenance guide
- `packages/stripe/scripts/check-events.ts` - Event map validation script

### Core Implementation Files

- `packages/core/src/index.ts` - Core routing logic (291 lines)
- `packages/core/test/webhook-router.test.ts` - Core tests (512 lines)

### Adapter Implementation Files

- `packages/hono/src/index.ts` - Hono adapter (91 lines)
- `packages/express/src/index.ts` - Express adapter (107 lines)
- `packages/lambda/src/index.ts` - Lambda adapter (112 lines)
- `packages/eventbridge/src/index.ts` - EventBridge adapter (49 lines)

### Scaffolding Files

- `packages/create-tayori/src/index.ts` - Main orchestration
- `packages/create-tayori/src/cli.ts` - CLI parsing
- `packages/create-tayori/templates/` - Project templates

### Configuration Files

- `tsconfig.base.json` - Shared TypeScript config
- `pnpm-workspace.yaml` - Monorepo configuration
- `package.json` - Root workspace scripts

## Troubleshooting

### Common Issues

**Issue**: Type errors after updating Stripe SDK
**Solution**: Update StripeEventMap manually, run `pnpm run check-events`

**Issue**: Signature verification failing in Express
**Solution**: Ensure `express.raw({ type: 'application/json' })` middleware is used

**Issue**: Tests failing after adding new adapter
**Solution**: Verify adapter implements Verifier contract correctly

**Issue**: Build failing with module resolution errors
**Solution**: Check `package.json` has correct workspace dependencies (`workspace:*`)

**Issue**: create-tayori not finding templates
**Solution**: Ensure templates are copied to dist during build (check tsup config)

## Questions to Consider When Making Changes

1. **Type Safety**: Does this preserve full type inference?
2. **Framework Agnostic**: Is this change framework-agnostic (if in core)?
3. **Builder Pattern**: Does this method return `this` for chaining?
4. **Error Handling**: Are errors handled appropriately for the layer?
5. **Security**: Does this maintain signature verification requirements?
6. **API Consistency**: Is this consistent with Hono's design philosophy?
7. **Breaking Changes**: Does this break existing usage patterns?
8. **Testing**: Are there tests covering this behavior?
9. **Documentation**: Is the README updated with examples?

## Resources

### Official Documentation

- [Stripe Webhook Guide](https://stripe.com/docs/webhooks)
- [Stripe Event Types](https://stripe.com/docs/api/events/types)
- [Stripe Signature Verification](https://stripe.com/docs/webhooks/signatures)
- [Hono Documentation](https://hono.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/)

### Framework Documentation

- [Express.js](https://expressjs.com/)
- [AWS Lambda](https://docs.aws.amazon.com/lambda/)
- [AWS EventBridge](https://docs.aws.amazon.com/eventbridge/)

### Build Tools

- [tsup](https://tsup.egoist.dev/)
- [Vitest](https://vitest.dev/)
- [pnpm Workspaces](https://pnpm.io/workspaces)

## Recent Changes (Git History)

**Latest Commits**:
1. PR #23: Fix ESLint parsing errors by including test files in tsconfig
2. PR #22: Remove Node 26 from CI test matrix
3. PR #21: Fix logger tests to avoid Unicode emoji snapshot mismatches
4. Recent: Add package-lock.json to gitignore
5. Recent: Add core package build step before tests in CI

**Current Development**:
- Branch: `claude/add-claude-documentation-lE7WF`
- All 8 packages are functional and tested
- CI/CD pipeline is stable (tests on Node 22 and 24)
- Zod validation integration is complete

## Summary

Tayori is a production-ready, type-safe webhook routing library with:
- **8 packages** with clear separation of concerns
- **253+ Stripe event types** with full type safety
- **Zod validation integration** for runtime schema validation
- **Framework-agnostic core** with adapters for major platforms
- **Scaffolding tool** for quick project setup via `npx create-tayori`
- **Comprehensive test coverage** following TDD principles
- **Professional build system** with tsup and vitest
- **Monorepo architecture** using pnpm workspaces
- **CI/CD pipeline** with GitHub Actions

The library prioritizes type safety, developer experience, and security best practices while maintaining a clean, Hono-inspired API design.

## For AI Assistants

When working on this codebase:

1. **Always read files before modifying** - Never propose changes to code you haven't read
2. **Maintain type safety** - Preserve full type inference throughout
3. **Follow existing patterns** - Look at similar implementations before adding new features
4. **Add tests** - All new features should have tests
5. **Update documentation** - Keep README.md and claude.md in sync with changes
6. **Check workspace dependencies** - Use `workspace:*` for internal dependencies
7. **Build core first** - Core package must be built before other packages can run tests
8. **Follow commit conventions** - Use conventional commits format
9. **Run all checks** - Build, typecheck, lint, and test before committing
10. **Ask when uncertain** - If implementation approach is unclear, ask for clarification

**Key Files to Review Before Changes**:
- `packages/core/src/index.ts` - Core routing logic (290 lines)
- `packages/stripe/src/index.ts` - Stripe event map (438 lines)
- `packages/zod/src/index.ts` - Zod validation helpers (361 lines)
- Relevant adapter files for framework-specific changes
- Test files for understanding expected behavior
