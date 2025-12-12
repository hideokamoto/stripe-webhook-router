import type { Request, Response, NextFunction } from 'express';
import type { WebhookRouter, WebhookEvent } from '@and-subscribe/core';
import Stripe from 'stripe';

/**
 * Options for the Express adapter
 */
export interface ExpressAdapterOptions {
  /** Stripe webhook secret for signature verification */
  webhookSecret: string;
  /** Skip signature verification (for testing only) */
  skipVerification?: boolean;
  /** Custom error handler */
  onError?: (error: Error, event: WebhookEvent) => void;
}

/**
 * Creates an Express middleware for handling Stripe webhooks
 *
 * @param router - The WebhookRouter instance
 * @param options - Adapter options
 * @returns Express middleware function
 */
export function expressAdapter<TEventMap extends Record<string, WebhookEvent>>(
  router: WebhookRouter<TEventMap>,
  options: ExpressAdapterOptions
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  const stripe = new Stripe(process.env['STRIPE_API_KEY'] ?? '');

  return async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    // Validate request body
    if (!req.body) {
      res.status(400).json({ error: 'Request body is required' });
      return;
    }

    let event: WebhookEvent;

    if (options.skipVerification) {
      // Parse the body directly for testing
      const bodyString = Buffer.isBuffer(req.body)
        ? req.body.toString('utf8')
        : typeof req.body === 'string'
          ? req.body
          : JSON.stringify(req.body);
      try {
        event = JSON.parse(bodyString) as WebhookEvent;
      } catch {
        res.status(400).json({ error: 'Invalid JSON body' });
        return;
      }
    } else {
      // Validate signature header
      const signature = req.headers['stripe-signature'];
      if (!signature || typeof signature !== 'string') {
        res.status(400).json({ error: 'Missing stripe-signature header' });
        return;
      }

      // Verify signature
      try {
        if (!Buffer.isBuffer(req.body)) {
          throw new Error('Request body must be a raw buffer for signature verification. Use express.raw() middleware.');
        }
        const bodyBuffer = req.body;

        event = stripe.webhooks.constructEvent(
          bodyBuffer,
          signature,
          options.webhookSecret
        ) as unknown as WebhookEvent;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Signature verification failed';
        res.status(400).json({ error: message });
        return;
      }
    }

    // Dispatch the event
    try {
      await router.dispatch(event);
      res.status(200).json({ received: true });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));

      if (options.onError) {
        options.onError(error, event);
      }

      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

// Re-export core types
export { WebhookRouter, type WebhookEvent, type EventHandler, type Middleware } from '@and-subscribe/core';
