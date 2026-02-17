import type { EventBridgeEvent, Context } from 'aws-lambda';
import type { WebhookRouter, WebhookEvent } from '@tayori/core';

/**
 * Options for the EventBridge adapter
 */
export interface EventBridgeAdapterOptions {
  /** Custom error handler */
  onError?: (error: Error, event: WebhookEvent) => void;
}

/**
 * Creates an AWS Lambda handler for processing webhook events from EventBridge
 *
 * Note: EventBridge events don't require signature verification as AWS
 * guarantees the authenticity of events delivered through EventBridge.
 *
 * @param router - The WebhookRouter instance
 * @param options - Adapter options
 * @returns Lambda handler function
 */
export function eventBridgeAdapter<TEventMap extends Record<string, WebhookEvent>>(
  router: WebhookRouter<TEventMap>,
  options: EventBridgeAdapterOptions = {}
): (event: EventBridgeEvent<string, unknown>, context: Context) => Promise<void> {
  return async (
    eventBridgeEvent: EventBridgeEvent<string, unknown>,
    _context: Context
  ): Promise<void> => {
    // Validate and extract the webhook event from the EventBridge detail
    const detail = eventBridgeEvent.detail;

    // Type validation for required fields
    if (typeof detail !== 'object' || detail === null) {
      throw new Error('Invalid event detail: must be an object');
    }

    const detailObj = detail as Record<string, unknown>;

    // Validate required fields
    if (!detailObj.id || typeof detailObj.id !== 'string') {
      throw new Error('Invalid event detail: missing or invalid "id" field');
    }

    if (!detailObj.type || typeof detailObj.type !== 'string') {
      throw new Error('Invalid event detail: missing or invalid "type" field');
    }

    if (!detailObj.data || typeof detailObj.data !== 'object' || detailObj.data === null) {
      throw new Error('Invalid event detail: missing or invalid "data" field');
    }

    const webhookEvent = detail as WebhookEvent;

    try {
      await router.dispatch(webhookEvent);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));

      if (options.onError) {
        options.onError(error, webhookEvent);
      }

      throw error;
    }
  };
}

// Re-export core types
export { WebhookRouter, type WebhookEvent, type EventHandler, type Middleware, type Verifier, type VerifyResult } from '@tayori/core';
