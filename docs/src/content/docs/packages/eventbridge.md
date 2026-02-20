---
title: "@tayori/eventbridge"
description: AWS EventBridge adapter for Tayori
---

The EventBridge adapter runs a Tayori router when invoked by an AWS EventBridge event. Because EventBridge delivers events from within your AWS account, no signature verification is required.

## Installation

```bash
pnpm add @tayori/eventbridge
```

## Usage

```typescript
import type { EventBridgeEvent } from 'aws-lambda';
import { WebhookRouter } from '@tayori/core';
import { eventBridgeAdapter } from '@tayori/eventbridge';

const router = new WebhookRouter<MyEventMap>();

router.on('my.event', async (event) => {
  console.log('Event:', event.data.object);
});

export const handler = eventBridgeAdapter(router, {
  onError: async (error) => console.error(error),
});
```

## API

```typescript
function eventBridgeAdapter<TEventMap>(
  router: WebhookRouter<TEventMap>,
  options: {
    onError?: (error: Error, event?: WebhookEvent) => Promise<void>;
  }
): Handler<EventBridgeEvent<string, unknown>, void>
```

The adapter expects the webhook payload in `event.detail`. There is no `verifier` option: EventBridge guarantees event authenticity within your account.
