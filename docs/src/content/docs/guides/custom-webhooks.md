---
title: Custom Webhooks
description: Use Tayori with any webhook provider
---

Tayori is not limited to Stripe. You can use the core router with a custom event type map and verifier for any webhook provider (e.g. GitHub, Slack, or your own API).

## 1. Define your event types

Extend `WebhookEvent` and define a type map that maps event type strings to those interfaces:

```typescript
import type { WebhookEvent } from '@tayori/core';

interface GitHubPushEvent extends WebhookEvent {
  type: 'push';
  data: { object: { ref: string; commits: Array<{ message: string }> } };
}

interface GitHubPREvent extends WebhookEvent {
  type: 'pull_request.opened' | 'pull_request.closed';
  data: { object: { number: number; title: string } };
}

type GitHubEventMap = {
  'push': GitHubPushEvent;
  'pull_request.opened': GitHubPREvent;
  'pull_request.closed': GitHubPREvent;
};
```

## 2. Implement a verifier

The verifier receives the raw payload and headers, validates the request (e.g. signature), and returns `{ event }`. It must accept `Buffer | string` and `Record<string, string | undefined>`.

Example for GitHub (X-Hub-Signature-256):

```typescript
import crypto from 'crypto';
import type { Verifier } from '@tayori/core';

function createGitHubVerifier(secret: string): Verifier {
  return (payload, headers) => {
    const signature = headers['x-hub-signature-256'];
    if (!signature) throw new Error('Missing x-hub-signature-256 header');

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

Use constant-time comparison (e.g. `crypto.timingSafeEqual`) for signatures and never log secrets.

## 3. Create the router and use an adapter

```typescript
import { WebhookRouter } from '@tayori/core';
import { honoAdapter } from '@tayori/hono';

const router = new WebhookRouter<GitHubEventMap>();

router.on('push', async (event) => {
  console.log('Push to:', event.data.object.ref);
});

router.on('pull_request.opened', async (event) => {
  console.log('PR opened:', event.data.object.title);
});

const app = new Hono();

app.post('/github-webhook', honoAdapter(router, {
  verifier: createGitHubVerifier(process.env.GITHUB_WEBHOOK_SECRET!),
}));
```

Handlers will be fully typed according to `GitHubEventMap`.
