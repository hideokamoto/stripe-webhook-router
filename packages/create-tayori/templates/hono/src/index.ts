import { Hono } from 'hono';
import Stripe from 'stripe';
import { StripeWebhookRouter } from '@tayori/stripe';
import { honoAdapter } from '@tayori/hono';
import { paymentHandlers } from './handlers/payment.js';
import { subscriptionHandlers } from './handlers/subscription.js';

// Validate required environment variables
if (!process.env.STRIPE_API_KEY) {
  throw new Error('STRIPE_API_KEY environment variable is required');
}
if (!process.env.STRIPE_WEBHOOK_SECRET) {
  throw new Error('STRIPE_WEBHOOK_SECRET environment variable is required');
}

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_API_KEY);

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

// Create Hono app
const app = new Hono();

app.get('/', (c) => {
  return c.json({
    message: 'Tayori Webhook Handler',
    status: 'running',
  });
});

app.post(
  '/webhook',
  honoAdapter(webhookRouter, {
    stripe,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    onError: async (error, event) => {
      console.error(`Failed to process ${event.type}:`, error);
    },
  })
);

export default app;
