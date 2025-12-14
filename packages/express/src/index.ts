import type { Request, Response, NextFunction } from 'express';
import type { WebhookRouter, WebhookEvent } from '@and-subscribe/core';
import type Stripe from 'stripe';

/**
 * Options for the Express adapter
 */
export interface ExpressAdapterOptions {
  /** Pre-configured Stripe instance */
  stripe: Stripe;
  /** Stripe webhook secret for signature verification */
  webhookSecret: string;
  /** Custom error handler */
  onError?: (error: Error, event: WebhookEvent) => Promise<void> | void;
}

/**
 * Creates an Express middleware for handling Stripe webhooks
 *
 * IMPORTANT: This adapter requires `req.body` to be a raw Buffer.
 * Use `express.raw({ type: 'application/json' })` middleware on your webhook route.
 *
 * @example
 * ```typescript
 * import express from 'express';
 * import Stripe from 'stripe';
 * import { expressAdapter } from '@and-subscribe/express';
 *
 * const stripe = new Stripe(process.env.STRIPE_API_KEY!);
 * const app = express();
 *
 * app.post('/webhook',
 *   express.raw({ type: 'application/json' }),
 *   expressAdapter(router, { stripe, webhookSecret: 'whsec_...' })
 * );
 * ```
 *
 * @param router - The WebhookRouter instance
 * @param options - Adapter options including a pre-configured Stripe instance
 * @returns Express middleware function
 */
export function expressAdapter<TEventMap extends Record<string, WebhookEvent>>(
  router: WebhookRouter<TEventMap>,
  options: ExpressAdapterOptions
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  const { stripe, webhookSecret, onError } = options;

  return async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    // Validate request body exists
    if (!req.body) {
      res.status(400).json({ error: 'Request body is required' });
      return;
    }

    // Require raw Buffer body for reliable signature verification
    if (!Buffer.isBuffer(req.body)) {
      res.status(400).json({
        error: 'Request body must be a raw Buffer. Use express.raw({ type: "application/json" }) middleware.',
      });
      return;
    }

    // Validate signature header
    const signature = req.headers['stripe-signature'];
    if (!signature || typeof signature !== 'string') {
      res.status(400).json({ error: 'Missing stripe-signature header' });
      return;
    }

    let event: WebhookEvent;

    // Verify signature
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        webhookSecret
      ) as unknown as WebhookEvent;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Signature verification failed';
      res.status(400).json({ error: message });
      return;
    }

    // Dispatch the event
    try {
      await router.dispatch(event);
      res.status(200).json({ received: true });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));

      if (onError) {
        try {
          await onError(error, event);
        } catch {
          // Ignore errors from onError handler to preserve original error response
        }
      }

      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

// Re-export core types
export { WebhookRouter, type WebhookEvent, type EventHandler, type Middleware } from '@and-subscribe/core';
