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
import { fileURLToPath } from 'url';

// Derive __dirname for ESM compatibility
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load exception list for known false positives
const exceptionsFile = path.join(__dirname, '../check-events-exceptions.json');
let exceptions: Set<string> = new Set();
if (fs.existsSync(exceptionsFile)) {
  const exceptionsData = JSON.parse(fs.readFileSync(exceptionsFile, 'utf-8'));
  if (exceptionsData.exceptions && Array.isArray(exceptionsData.exceptions)) {
    exceptions = new Set(exceptionsData.exceptions.map((e: { eventName: string }) => e.eventName));
  }
}

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
// The EventTypes.d.ts file contains the union type of all event types
const stripeTypesPath = path.join(__dirname, '../node_modules/stripe/types/EventTypes.d.ts');

if (!fs.existsSync(stripeTypesPath)) {
  console.error('Stripe EventTypes not found. Run pnpm install first.');
  process.exit(1);
}

const stripeTypes = fs.readFileSync(stripeTypesPath, 'utf-8');

// Find all event type definitions by looking for the type property pattern
// Each event interface has: type: 'event.name';
const sdkEvents = new Set<string>();
const eventNameRegex = /type:\s*'([^']+)';/g;
let eventMatch;
while ((eventMatch = eventNameRegex.exec(stripeTypes)) !== null) {
  const eventName = eventMatch[1];
  sdkEvents.add(eventName);
}

// Compare
const missingInOurs = [...sdkEvents].filter(e => !ourEvents.has(e));
const extraInOurs = [...ourEvents].filter(e => !sdkEvents.has(e));

// Separate exceptions from actual extra events
const actualExtraEvents = extraInOurs.filter(e => !exceptions.has(e));
const exceptionMatches = extraInOurs.filter(e => exceptions.has(e));

console.log(`StripeEventMap has ${ourEvents.size} events`);
console.log(`Stripe SDK appears to have ${sdkEvents.size} event types\n`);

let hasIssues = false;

if (missingInOurs.length > 0) {
  console.log('⚠️  Events in SDK but missing from StripeEventMap:');
  missingInOurs.sort().forEach(e => console.log(`  - ${e}`));
  console.log('');
  hasIssues = true;
}

if (actualExtraEvents.length > 0) {
  console.log('⚠️  Events in StripeEventMap but not found in SDK:');
  actualExtraEvents.sort().forEach(e => console.log(`  - ${e}`));
  console.log('');
  hasIssues = true;
}

if (exceptionMatches.length > 0) {
  console.log('ℹ️  Known false positives (exceptions):');
  exceptionMatches.sort().forEach(e => console.log(`  - ${e}`));
  console.log('  (These are expected mismatches due to naming convention differences)\n');
}

if (!hasIssues) {
  console.log('✅ StripeEventMap appears to be in sync with Stripe SDK');
  process.exit(0);
} else {
  console.log('Please update StripeEventMap in packages/stripe/src/index.ts');
  console.log('See MAINTAINING_STRIPE_EVENTMAP.md for instructions.');
  process.exit(1);
}
