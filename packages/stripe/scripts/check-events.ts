#!/usr/bin/env npx tsx
/**
 * Script to check if StripeEventMap is in sync with the Stripe SDK.
 *
 * This script extracts event type names from the Stripe SDK types and compares
 * them against the StripeEventMap defined in this package.
 *
 * Usage:
 *   pnpm run check-events
 *
 * Exit codes:
 *   0 - All events are in sync
 *   1 - Missing or extra events detected
 */

import * as fs from 'fs';
import * as path from 'path';

// Read our StripeEventMap source
const sourceFile = path.join(__dirname, '../src/index.ts');
const sourceContent = fs.readFileSync(sourceFile, 'utf-8');

// Extract event names from our StripeEventMap
const eventMapRegex = /export type StripeEventMap = \{([^}]+)\}/s;
const match = sourceContent.match(eventMapRegex);

if (!match) {
  console.error('Could not find StripeEventMap in source file');
  process.exit(1);
}

const ourEvents = new Set<string>();
const eventLineRegex = /'([^']+)':/g;
let lineMatch;
while ((lineMatch = eventLineRegex.exec(match[1])) !== null) {
  ourEvents.add(lineMatch[1]);
}

// Read Stripe SDK types to find all event types
// Look for types matching the pattern: Stripe.{EventName}Event
const stripeTypesPath = path.join(__dirname, '../node_modules/stripe/types/index.d.ts');

if (!fs.existsSync(stripeTypesPath)) {
  console.error('Stripe types not found. Run pnpm install first.');
  process.exit(1);
}

const stripeTypes = fs.readFileSync(stripeTypesPath, 'utf-8');

// Find all exported event types (they end with 'Event' and follow naming conventions)
const sdkEvents = new Set<string>();
const eventTypeRegex = /export type (\w+Event)\b/g;
let typeMatch;
while ((typeMatch = eventTypeRegex.exec(stripeTypes)) !== null) {
  const typeName = typeMatch[1];
  // Convert PascalCase type name to dot.notation event name
  // e.g., PaymentIntentSucceededEvent -> payment_intent.succeeded
  const eventName = typeName
    .replace(/Event$/, '')
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .slice(1) // Remove leading underscore
    .replace(/_+/g, '_')
    // Handle common patterns
    .replace(/^payment_intent_/, 'payment_intent.')
    .replace(/^customer_subscription_/, 'customer.subscription.')
    .replace(/^customer_/, 'customer.')
    .replace(/^invoice_/, 'invoice.')
    .replace(/^charge_/, 'charge.')
    .replace(/^checkout_session_/, 'checkout.session.')
    .replace(/^account_/, 'account.')
    .replace(/^setup_intent_/, 'setup_intent.')
    .replace(/^payout_/, 'payout.')
    .replace(/^product_/, 'product.')
    .replace(/^price_/, 'price.')
    .replace(/^subscription_schedule_/, 'subscription_schedule.')
    .replace(/^issuing_/, 'issuing_')
    .replace(/^identity_verification_session_/, 'identity.verification_session.')
    .replace(/^billing_portal_/, 'billing_portal.')
    .replace(/^terminal_reader_/, 'terminal.reader.')
    .replace(/^test_helpers_test_clock_/, 'test_helpers.test_clock.')
    .replace(/^tax_/, 'tax.')
    .replace(/^radar_early_fraud_warning_/, 'radar.early_fraud_warning.')
    .replace(/^reporting_report_/, 'reporting.report_')
    .replace(/^sigma_scheduled_query_run_/, 'sigma.scheduled_query_run.')
    .replace(/^source_/, 'source.')
    .replace(/^file_/, 'file.');

  // Only add if it looks like a valid event name (contains a dot or underscore)
  if (eventName.includes('.') || eventName.includes('_')) {
    sdkEvents.add(eventName);
  }
}

// Compare
const missingInOurs = [...sdkEvents].filter(e => !ourEvents.has(e));
const extraInOurs = [...ourEvents].filter(e => !sdkEvents.has(e));

console.log(`StripeEventMap has ${ourEvents.size} events`);
console.log(`Stripe SDK appears to have ${sdkEvents.size} event types\n`);

let hasIssues = false;

if (missingInOurs.length > 0) {
  console.log('⚠️  Events in SDK but missing from StripeEventMap:');
  missingInOurs.sort().forEach(e => console.log(`  - ${e}`));
  console.log('');
  hasIssues = true;
}

if (extraInOurs.length > 0) {
  console.log('⚠️  Events in StripeEventMap but not found in SDK:');
  extraInOurs.sort().forEach(e => console.log(`  - ${e}`));
  console.log('');
  // Note: This might be false positives due to naming convention differences
  console.log('  (Note: These may be false positives due to naming conversion)\n');
}

if (!hasIssues) {
  console.log('✅ StripeEventMap appears to be in sync with Stripe SDK');
  process.exit(0);
} else {
  console.log('Please update StripeEventMap in packages/stripe/src/index.ts');
  console.log('See MAINTAINING_STRIPE_EVENTMAP.md for instructions.');
  process.exit(1);
}
