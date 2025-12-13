import type { Context } from 'hono';
import type { WebhookRouter, WebhookEvent } from '@and-subscribe/core';
import type Stripe from 'stripe';

/**
 * Options for the Hono adapter
 */
export interface HonoAdapterOptions {
  /** Pre-configured Stripe instance */
  stripe: Stripe;
  /** Stripe webhook secret for signature verification */
  webhookSecret: string;
  /** Custom error handler */
  onError?: (error: Error, event: WebhookEvent) => Promise<void> | void;
}

/**
 * Creates a Hono handler for handling Stripe webhooks
 *
 * Hono's `c.req.text()` retrieves the raw request body as a string,
 * which is used directly for signature verification.
 *
 * @example
 * ```typescript
 * import { Hono } from 'hono';
 * import Stripe from 'stripe';
 * import { honoAdapter } from '@and-subscribe/hono';
 *
 * const stripe = new Stripe(process.env.STRIPE_API_KEY!);
 * const router = new WebhookRouter();
 * const app = new Hono();
 *
 * app.post('/webhook', honoAdapter(router, {
 *   stripe,
 *   webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
 * }));
 * ```
 *
 * @param router - The WebhookRouter instance
 * @param options - Adapter options including a pre-configured Stripe instance
 * @returns Hono handler function
 */
export function honoAdapter<TEventMap extends Record<string, WebhookEvent>>(
  router: WebhookRouter<TEventMap>,
  options: HonoAdapterOptions
): (c: Context) => Promise<Response> {
  const { stripe, webhookSecret, onError } = options;

  return async (c: Context): Promise<Response> => {
    // Get raw body text for signature verification
    const rawBody = await c.req.text();

    if (!rawBody) {
      return c.json({ error: 'Request body is required' }, 400);
    }

    // Validate signature header
    const signature = c.req.header('stripe-signature');

    if (!signature) {
      return c.json({ error: 'Missing stripe-signature header' }, 400);
    }

    let webhookEvent: WebhookEvent;

    // Verify signature
    try {
      webhookEvent = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret
      ) as unknown as WebhookEvent;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Signature verification failed';
      return c.json({ error: message }, 400);
    }

    // Dispatch the event
    try {
      await router.dispatch(webhookEvent);
      return c.json({ received: true }, 200);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));

      if (onError) {
        try {
          await onError(error, webhookEvent);
        } catch {
          // Ignore errors from onError handler to preserve original error response
        }
      }

      return c.json({ error: 'Internal server error' }, 500);
    }
  };
}

// Re-export core types
export { WebhookRouter, type WebhookEvent, type EventHandler, type Middleware } from '@and-subscribe/core';
