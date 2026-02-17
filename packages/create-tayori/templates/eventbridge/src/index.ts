import { StripeWebhookRouter } from '@tayori/stripe';
import { eventBridgeAdapter } from '@tayori/eventbridge';
import { paymentHandlers } from './handlers/payment.js';
import { subscriptionHandlers } from './handlers/subscription.js';

// Create webhook router
const webhookRouter = new StripeWebhookRouter();

// Register handlers
paymentHandlers(webhookRouter);
subscriptionHandlers(webhookRouter);

// Add logging middleware
webhookRouter.use(async (event, next) => {
  console.log(`[${event.type}] Processing event ${event.id}`);
  const start = Date.now();

  await next();

  const duration = Date.now() - start;
  console.log(`[${event.type}] Completed in ${duration}ms`);
});

// Export Lambda handler for EventBridge
// Note: No signature verification needed - AWS EventBridge guarantees authenticity
export const handler = eventBridgeAdapter(webhookRouter, {
  onError: (error, event) => {
    console.error(`Failed to process ${event.type}:`, error);
  },
});
