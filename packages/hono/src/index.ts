import type { Context } from 'hono';
import type { WebhookRouter, WebhookEvent } from '@and-subscribe/core';
import Stripe from 'stripe';

/**
 * Options for the Hono adapter
 */
export interface HonoAdapterOptions {
  /** Stripe webhook secret for signature verification */
  webhookSecret: string;
  /** Skip signature verification (for testing only) */
  skipVerification?: boolean;
  /** Custom error handler */
  onError?: (error: Error, event: WebhookEvent) => void;
}

/**
 * Creates a Hono handler for handling Stripe webhooks
 *
 * @param router - The WebhookRouter instance
 * @param options - Adapter options
 * @returns Hono handler function
 */
export function honoAdapter<TEventMap extends Record<string, WebhookEvent>>(
  router: WebhookRouter<TEventMap>,
  options: HonoAdapterOptions
): (c: Context) => Promise<Response> {
  const stripe = new Stripe(process.env['STRIPE_API_KEY'] ?? '');

  return async (c: Context): Promise<Response> => {
    // Get raw body
    const bodyText = await c.req.text();

    if (!bodyText) {
      return c.json({ error: 'Request body is required' }, 400);
    }

    let webhookEvent: WebhookEvent;

    if (options.skipVerification) {
      try {
        webhookEvent = JSON.parse(bodyText) as WebhookEvent;
      } catch {
        return c.json({ error: 'Invalid JSON body' }, 400);
      }
    } else {
      const signature = c.req.header('stripe-signature');

      if (!signature) {
        return c.json({ error: 'Missing stripe-signature header' }, 400);
      }

      try {
        webhookEvent = stripe.webhooks.constructEvent(
          bodyText,
          signature,
          options.webhookSecret
        ) as unknown as WebhookEvent;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Signature verification failed';
        return c.json({ error: message }, 400);
      }
    }

    try {
      await router.dispatch(webhookEvent);
      return c.json({ received: true }, 200);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));

      if (options.onError) {
        options.onError(error, webhookEvent);
      }

      return c.json({ error: 'Internal server error' }, 500);
    }
  };
}

// Re-export core types
export { WebhookRouter, type WebhookEvent, type EventHandler, type Middleware } from '@and-subscribe/core';
