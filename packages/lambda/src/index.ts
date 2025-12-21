import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import type { WebhookRouter, WebhookEvent, Verifier } from '@tayori/core';

/**
 * Options for the Lambda adapter
 */
export interface LambdaAdapterOptions<T extends WebhookEvent = WebhookEvent> {
  /** Webhook verifier function for signature validation and event parsing */
  verifier: Verifier<T>;
  /** Custom error handler */
  onError?: (error: Error, event?: T) => Promise<void> | void;
}

/**
 * Creates an AWS Lambda handler for handling webhooks
 *
 * The Lambda event body is used directly for signature verification.
 * API Gateway provides the raw body as a string (or base64-encoded string),
 * which is decoded and used for signature verification.
 *
 * @example
 * ```typescript
 * import { lambdaAdapter } from '@tayori/lambda';
 * import { createStripeVerifier, StripeWebhookRouter } from '@tayori/stripe';
 *
 * const router = new StripeWebhookRouter();
 *
 * export const handler = lambdaAdapter(router, {
 *   verifier: createStripeVerifier(stripe, process.env.STRIPE_WEBHOOK_SECRET!),
 * });
 * ```
 *
 * @param router - The WebhookRouter instance
 * @param options - Adapter options including a verifier function
 * @returns Lambda handler function
 */
export function lambdaAdapter<TEventMap extends Record<string, WebhookEvent>>(
  router: WebhookRouter<TEventMap>,
  options: LambdaAdapterOptions<TEventMap[keyof TEventMap]>
): (event: APIGatewayProxyEvent, context: Context) => Promise<APIGatewayProxyResult> {
  const { verifier, onError } = options;

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

    // Collect headers for verifier (normalize to lowercase)
    const headers: Record<string, string | undefined> = {};
    for (const [key, value] of Object.entries(lambdaEvent.headers)) {
      headers[key.toLowerCase()] = value;
    }

    let webhookEvent: TEventMap[keyof TEventMap];

    // Verify signature and parse event
    try {
      const result = await verifier(rawBody, headers);
      webhookEvent = result.event as TEventMap[keyof TEventMap];
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Verification failed';
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
export { WebhookRouter, type WebhookEvent, type EventHandler, type Middleware, type Verifier, type VerifyResult } from '@tayori/core';
