import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import type { WebhookRouter, WebhookEvent } from '@tayori/core';
import type Stripe from 'stripe';

/**
 * Options for the Lambda adapter
 */
export interface LambdaAdapterOptions {
  /** Pre-configured Stripe instance */
  stripe: Stripe;
  /** Stripe webhook secret for signature verification */
  webhookSecret: string;
  /** Custom error handler */
  onError?: (error: Error, event: WebhookEvent) => Promise<void> | void;
}

/**
 * Creates an AWS Lambda handler for handling Stripe webhooks
 *
 * The Lambda event body is used directly for signature verification.
 * API Gateway provides the raw body as a string (or base64-encoded string),
 * which is decoded and used for signature verification.
 *
 * @example
 * ```typescript
 * import Stripe from 'stripe';
 * import { lambdaAdapter } from '@tayori/lambda';
 *
 * const stripe = new Stripe(process.env.STRIPE_API_KEY!);
 * const router = new WebhookRouter();
 *
 * export const handler = lambdaAdapter(router, {
 *   stripe,
 *   webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
 * });
 * ```
 *
 * @param router - The WebhookRouter instance
 * @param options - Adapter options including a pre-configured Stripe instance
 * @returns Lambda handler function
 */
export function lambdaAdapter<TEventMap extends Record<string, WebhookEvent>>(
  router: WebhookRouter<TEventMap>,
  options: LambdaAdapterOptions
): (event: APIGatewayProxyEvent, context: Context) => Promise<APIGatewayProxyResult> {
  const { stripe, webhookSecret, onError } = options;

  return async (
    lambdaEvent: APIGatewayProxyEvent,
    _context: Context
  ): Promise<APIGatewayProxyResult> => {
    // Validate request body
    if (!lambdaEvent.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Request body is required' }),
        headers: { 'Content-Type': 'application/json' },
      };
    }

    // Decode body if base64 encoded (API Gateway preserves raw bytes this way)
    const rawBody = lambdaEvent.isBase64Encoded
      ? Buffer.from(lambdaEvent.body, 'base64').toString('utf8')
      : lambdaEvent.body;

    // Validate signature header
    const signature =
      lambdaEvent.headers['stripe-signature'] ??
      lambdaEvent.headers['Stripe-Signature'];

    if (!signature) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing stripe-signature header' }),
        headers: { 'Content-Type': 'application/json' },
      };
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
      return {
        statusCode: 400,
        body: JSON.stringify({ error: message }),
        headers: { 'Content-Type': 'application/json' },
      };
    }

    // Dispatch the event
    try {
      await router.dispatch(webhookEvent);
      return {
        statusCode: 200,
        body: JSON.stringify({ received: true }),
        headers: { 'Content-Type': 'application/json' },
      };
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));

      if (onError) {
        try {
          await onError(error, webhookEvent);
        } catch {
          // Ignore errors from onError handler to preserve original error response
        }
      }

      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Internal server error' }),
        headers: { 'Content-Type': 'application/json' },
      };
    }
  };
}

// Re-export core types
export { WebhookRouter, type WebhookEvent, type EventHandler, type Middleware } from '@tayori/core';
