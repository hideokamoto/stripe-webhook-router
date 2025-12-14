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

## CI Integration

Consider adding the check script to your CI pipeline:

```yaml
# .github/workflows/ci.yml
- name: Check Stripe events sync
  run: pnpm run check-events
```

This will fail the build if the event map becomes out of sync with the SDK.
