# Claude Code Guide - Tayori

This document provides context for Claude Code and AI assistants working on the Tayori project.

## Project Overview

**Tayori** is a type-safe Stripe webhook routing library for TypeScript, inspired by Hono's API design. It provides framework-agnostic webhook handling with full type safety for all Stripe events.

## Architecture

### Monorepo Structure

This is a pnpm workspace monorepo with the following packages:

```
packages/
├── core/          # Framework-agnostic routing logic
├── stripe/        # Stripe-specific types and router
├── hono/          # Hono framework adapter
├── express/       # Express framework adapter
├── lambda/        # AWS Lambda adapter
└── eventbridge/   # AWS EventBridge adapter
```

### Key Design Principles

1. **Type Safety First**: All Stripe events (253+ types) are fully typed using the official Stripe SDK types
2. **Framework Agnostic Core**: Core routing logic has no framework dependencies
3. **Adapter Pattern**: Framework integrations are separate packages that wrap the core
4. **Chain-able API**: Hono-inspired fluent interface for registering handlers

## Core Concepts

### WebhookRouter (packages/core/src/index.ts)

The base router class that provides:
- `on()` - Register event handlers (single or multiple events)
- `use()` - Register middleware
- `group()` - Create prefixed handler groups
- `route()` - Mount nested routers
- `fanout()` - Parallel handler execution with error strategies
- `dispatch()` - Execute the handler chain for an event

### StripeWebhookRouter (packages/stripe/src/index.ts)

Extends `WebhookRouter` with Stripe-specific types:
- Uses `StripeEventMap` to map event names to SDK event types
- Provides full type inference for event handlers
- No additional logic beyond type safety

### StripeEventMap (packages/stripe/src/index.ts)

**CRITICAL**: This is a manually maintained type map of all 253 Stripe event types.

Lines 12-351 contain the complete event map. When Stripe adds new events:
1. The map must be manually updated
2. Run `pnpm run check-events` to verify completeness
3. See `MAINTAINING_STRIPE_EVENTMAP.md` for maintenance procedures

## Framework Adapters

Each adapter follows the same pattern:

1. Accept a `WebhookRouter` instance
2. Accept framework-specific options (must include `stripe` instance and `webhookSecret`)
3. Extract raw request body
4. Verify Stripe signature using `stripe.webhooks.constructEvent()`
5. Dispatch to router
6. Return framework-specific response

### Example: Hono Adapter (packages/hono/src/index.ts:43-96)

```typescript
export function honoAdapter<TEventMap extends Record<string, WebhookEvent>>(
  router: WebhookRouter<TEventMap>,
  options: HonoAdapterOptions
): (c: Context) => Promise<Response>
```

Key points:
- Uses `c.req.text()` for raw body (required for signature verification)
- Validates `stripe-signature` header
- Returns Hono `Response` objects

## Common Development Tasks

### Adding a New Adapter

1. Create new package in `packages/`
2. Add dependencies: `@tayori/core` (workspace), target framework, `stripe` (peer)
3. Implement adapter function following existing pattern
4. Export core types: `export { WebhookRouter, ... } from '@tayori/core'`
5. Add tests in `test/` directory
6. Update root README.md with usage example

### Updating Stripe Events

When Stripe SDK is updated:

1. Update Stripe peer dependency in `packages/stripe/package.json`
2. Run `pnpm run check-events` to see new/removed events
3. Manually update `StripeEventMap` in `packages/stripe/src/index.ts`
4. Verify types compile: `pnpm typecheck`
5. Run tests: `pnpm test`

### Adding Features to Core Router

Features that affect the core router go in `packages/core/src/index.ts`:

- New routing methods should follow the builder pattern (return `this`)
- Maintain type safety with generics `<TEventMap extends Record<string, WebhookEvent>>`
- Update interface to support both string and array parameters where appropriate
- Add tests in `packages/core/test/webhook-router.test.ts`

## Testing Strategy

### Unit Tests

Each package has its own test suite:
- Core: Tests routing logic, middleware, grouping
- Stripe: Tests type exports and router instantiation
- Adapters: Test signature verification, error handling, request/response handling

Run tests: `pnpm test` (runs all packages) or `pnpm -r test` (recursive)

### Type Tests

Some tests verify TypeScript compilation:
```typescript
type TestEventType = StripeEventMap['payment_intent.succeeded'];
expect(true).toBe(true); // Test passes if it compiles
```

## Build System

- **TypeScript**: `tsc` for type checking
- **tsup**: For building distributable packages
- **Vitest**: For testing

Build commands:
- `pnpm build` - Build all packages
- `pnpm typecheck` - Type check all packages
- `pnpm lint` - Lint all packages

## Important Files

- `packages/stripe/src/index.ts` - **CRITICAL**: Manually maintained Stripe event map
- `packages/core/src/index.ts` - Core routing logic
- `packages/*/test/*.test.ts` - Test files for each package
- `MAINTAINING_STRIPE_EVENTMAP.md` - Event map maintenance guide

## Git Workflow

- Main branch: Default branch for PRs
- Feature branches: Use `claude/*` prefix for Claude Code branches
- Commits: Clear, descriptive messages following conventional commits style

## Common Patterns

### Type-Safe Event Handlers

```typescript
// Event name is autocompleted and validated
router.on('payment_intent.succeeded', async (event) => {
  // event.data.object is typed as Stripe.PaymentIntent
});
```

### Middleware Pattern

```typescript
router.use(async (event, next) => {
  // Pre-processing
  await next();
  // Post-processing
});
```

### Error Handling

Adapters should:
1. Catch signature verification errors → Return 400
2. Catch handler errors → Call `onError` if provided → Return 500
3. Never expose internal error details in response

## Dependencies

### Workspace Dependencies
- `@tayori/core` - Used by all adapter packages
- Managed via `workspace:*` in package.json

### Peer Dependencies
- `stripe` - Required by all packages that use Stripe types (>=17.0.0)

### Dev Dependencies
- Shared across workspace root
- Individual packages may have additional dev deps for testing

## Performance Considerations

- Middleware chain builds in reverse order for proper nesting
- Fanout handlers use `Promise.all()` (all-or-nothing) or `Promise.allSettled()` (best-effort)
- No caching or memoization needed - handlers are registered once at startup

## Security Notes

- **Always verify Stripe signatures** before processing events
- Use raw request body for signature verification (not parsed JSON)
- Never expose webhook secrets in error messages
- Adapters should validate required headers before processing

## Anti-Patterns to Avoid

❌ Don't modify core types to be Stripe-specific
❌ Don't add framework dependencies to `@tayori/core`
❌ Don't auto-generate the StripeEventMap (it must be manually maintained)
❌ Don't parse request body before signature verification
❌ Don't expose detailed errors in webhook responses

## Questions to Consider

When making changes, ask:
- Does this preserve type safety?
- Is this framework-agnostic? (if in core)
- Does this follow the builder pattern?
- Are errors handled appropriately?
- Is the API consistent with Hono's design?

## Resources

- [Stripe Webhook Guide](https://stripe.com/docs/webhooks)
- [Stripe Event Types](https://stripe.com/docs/api/events/types)
- [Hono Documentation](https://hono.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/)
