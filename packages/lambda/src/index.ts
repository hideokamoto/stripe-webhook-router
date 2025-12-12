import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import type { WebhookRouter, WebhookEvent } from '@and-subscribe/core';
import Stripe from 'stripe';

/**
 * Options for the Lambda adapter
 */
export interface LambdaAdapterOptions {
  /** Stripe webhook secret for signature verification */
  webhookSecret: string;
  /** Skip signature verification (for testing only) */
  skipVerification?: boolean;
  /** Custom error handler */
  onError?: (error: Error, event: WebhookEvent) => void;
}

/**
 * Creates an AWS Lambda handler for handling Stripe webhooks
 *
 * @param router - The WebhookRouter instance
 * @param options - Adapter options
 * @returns Lambda handler function
 */
export function lambdaAdapter<TEventMap extends Record<string, WebhookEvent>>(
  router: WebhookRouter<TEventMap>,
  options: LambdaAdapterOptions
): (event: APIGatewayProxyEvent, context: Context) => Promise<APIGatewayProxyResult> {
  const stripe = new Stripe(process.env['STRIPE_API_KEY'] ?? '');

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

    // Decode body if base64 encoded
    const bodyString = lambdaEvent.isBase64Encoded
      ? Buffer.from(lambdaEvent.body, 'base64').toString('utf8')
      : lambdaEvent.body;

    let webhookEvent: WebhookEvent;

    if (options.skipVerification) {
      // Parse the body directly for testing
      try {
        webhookEvent = JSON.parse(bodyString) as WebhookEvent;
      } catch {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Invalid JSON body' }),
          headers: { 'Content-Type': 'application/json' },
        };
      }
    } else {
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

      // Verify signature
      try {
        webhookEvent = stripe.webhooks.constructEvent(
          bodyString,
          signature,
          options.webhookSecret
        ) as unknown as WebhookEvent;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Signature verification failed';
        return {
          statusCode: 400,
          body: JSON.stringify({ error: message }),
          headers: { 'Content-Type': 'application/json' },
        };
      }
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

      if (options.onError) {
        options.onError(error, webhookEvent);
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
export { WebhookRouter, type WebhookEvent, type EventHandler, type Middleware } from '@and-subscribe/core';
