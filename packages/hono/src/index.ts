import type { Context } from 'hono';
import type { WebhookRouter, WebhookEvent, Verifier } from '@tayori/core';

/**
 * Options for the Hono adapter
 */
export interface HonoAdapterOptions<T extends WebhookEvent = WebhookEvent> {
  /** Webhook verifier function for signature validation and event parsing */
  verifier: Verifier<T>;
  /** Custom error handler */
  onError?: (error: Error, event?: T) => Promise<void> | void;
}

/**
 * Creates a Hono handler for handling webhooks
 *
 * Hono's `c.req.text()` retrieves the raw request body as a string,
 * which is used directly for signature verification.
 *
 * @example
 * ```typescript
 * import { Hono } from 'hono';
 * import { honoAdapter } from '@tayori/hono';
 * import { createStripeVerifier, StripeWebhookRouter } from '@tayori/stripe';
 *
 * const router = new StripeWebhookRouter();
 * const app = new Hono();
 *
 * app.post('/webhook', honoAdapter(router, {
 *   verifier: createStripeVerifier(stripe, process.env.STRIPE_WEBHOOK_SECRET!),
 * }));
 * ```
 *
 * @param router - The WebhookRouter instance
 * @param options - Adapter options including a verifier function
 * @returns Hono handler function
 */
export function honoAdapter<TEventMap extends Record<string, WebhookEvent>>(
  router: WebhookRouter<TEventMap>,
  options: HonoAdapterOptions<TEventMap[keyof TEventMap]>
): (c: Context) => Promise<Response> {
  const { verifier, onError } = options;

  return async (c: Context): Promise<Response> => {
    // Get raw body text for signature verification
    const rawBody = await c.req.text();

    if (!rawBody) {
      return c.json({ error: 'Request body is required' }, 400);
    }

    // Collect headers for verifier
    const headers: Record<string, string | undefined> = {};
    c.req.raw.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    let webhookEvent: TEventMap[keyof TEventMap];

    // Verify signature and parse event
    try {
      const result = await verifier(rawBody, headers);
      webhookEvent = result.event as TEventMap[keyof TEventMap];
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      console.error('Webhook verification failed:', err);
      return c.json({ error }, 400);
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
export { WebhookRouter, type WebhookEvent, type EventHandler, type Middleware, type Verifier, type VerifyResult } from '@tayori/core';
