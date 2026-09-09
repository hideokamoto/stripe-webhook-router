# Maintaining StripeEventMap

The `StripeEventMap` type in `src/index.ts` maps Stripe event type strings (like `'payment_intent.succeeded'`) to their corresponding TypeScript event types from the Stripe SDK.

## Why Manual Maintenance?

The Stripe SDK doesn't export a complete mapping of event type strings to event types. The event types exist (e.g., `Stripe.PaymentIntentSucceededEvent`), but there's no programmatic way to reliably extract the string literal type for each event.

## Checking for Updates

Run the check script to detect missing or extra events:

```bash
pnpm run check-events
```

This script attempts to:
1. Extract event names from our `StripeEventMap`
2. Find event types exported by the Stripe SDK
3. Compare the two lists

**Note:** The script uses heuristics to convert PascalCase type names to dot.notation event names, so it may produce false positives.

## Adding New Events

When Stripe adds new webhook events:

1. Check the [Stripe API changelog](https://stripe.com/docs/upgrades#api-versions) for new events
2. Find the corresponding type in the Stripe SDK (e.g., `Stripe.NewFeatureCreatedEvent`)
3. Add the mapping to `StripeEventMap`:

```typescript
export type StripeEventMap = {
  // ... existing events
  'new_feature.created': Stripe.NewFeatureCreatedEvent;
};
```

4. Run `pnpm run check-events` to verify
5. Run `pnpm test` to ensure types compile correctly

## Stripe SDK Updates

When updating the `stripe` package:

1. Update the dependency: `pnpm update stripe`
2. Run `pnpm run check-events` to detect any new events
3. Add any missing events to `StripeEventMap`
4. Run the test suite: `pnpm test`

## stripe SDK Version Policy

- **devDependency**: `^22.0.0` — the pinned range used for local development and CI builds.
- **peerDependency**: `>=17.0.0` — the minimum version consumers must provide.
- **Bumping**: handled by Dependabot (see below), or manually via `pnpm update stripe`.
  Before merging any stripe bump — Dependabot-authored or manual — confirm
  `pnpm run check-events` is green. The CI `check-stripe-events` job enforces
  this automatically on every push and PR.

## CI Integration

Detecting drift between `StripeEventMap` and the Stripe SDK relies on two
pieces working together:

### 1. Detection: Dependabot

`.github/dependabot.yml` runs weekly `npm` updates and groups `stripe` into
its own isolated PR (separate from other production/development
dependencies), so a new `stripe` release always surfaces as its own,
easy-to-review pull request rather than being buried in a bundled bump.

### 2. Enforcement: `check-stripe-events` (`.github/workflows/ci.yml`)

```yaml
# .github/workflows/ci.yml
check-stripe-events:
  name: Check Stripe Events Sync
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v6
    - uses: pnpm/action-setup@v4
      with:
        version: 9.15.0
    - uses: actions/setup-node@v6
      with:
        node-version: '22'
        cache: 'pnpm'
    - run: pnpm install --frozen-lockfile
    - run: pnpm --filter @kotodayori/stripe run check-events
```

This job runs on every push and pull request — including the Dependabot PR
that bumps `stripe`. If the new SDK version introduces event types
`StripeEventMap` doesn't cover, this job fails and blocks the merge, forcing
the map to be updated as part of that same PR before it can land.

**Why not a separate scheduled workflow?** An earlier design added a weekly
`schedule`-triggered job that installed `stripe@latest` directly to catch
upstream additions ahead of the pinned version. That approach was rejected —
Dependabot already provides the weekly cadence, and routing the SDK bump
through a normal, reviewable pull request (checked by the same
`check-stripe-events` job) is simpler than maintaining a second, parallel CI
workflow for the same signal.
