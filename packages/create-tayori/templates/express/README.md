# {{PROJECT_NAME}}

A Stripe webhook handler built with [Tayori](https://github.com/hideokamoto/stripe-webhook-router) and [Express](https://expressjs.com).

## Getting Started

### 1. Install Dependencies

```bash
{{PACKAGE_MANAGER}} install
```

### 2. Configure Environment Variables

Copy the example environment file and fill in your Stripe credentials:

```bash
cp .env.example .env
```

Then edit `.env` and add your Stripe API keys:

- `STRIPE_API_KEY`: Get from [Stripe Dashboard → API Keys](https://dashboard.stripe.com/apikeys)
- `STRIPE_WEBHOOK_SECRET`: Get from [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)

### 3. Run the Development Server

```bash
{{PACKAGE_MANAGER}} dev
```

The server will start on `http://localhost:3000`.

### 4. Test with Stripe CLI

Install the [Stripe CLI](https://stripe.com/docs/stripe-cli) and forward webhooks to your local server:

```bash
stripe listen --forward-to localhost:3000/webhook
```

Trigger a test event:

```bash
stripe trigger payment_intent.succeeded
```

## Project Structure

```text
src/
├── index.ts              # Main application entry point
└── handlers/
    ├── payment.ts        # Payment-related event handlers
    └── subscription.ts   # Subscription-related event handlers
```

## Important: Raw Body Middleware

The webhook route uses `express.raw({ type: 'application/json' })` to preserve the raw request body, which is required for Stripe signature verification. **Do not** use `express.json()` on the webhook route.

## Adding New Handlers

To handle additional Stripe events, register them in the appropriate handler file:

```typescript
// src/handlers/payment.ts
router.on('payment_intent.created', async (event) => {
  const paymentIntent = event.data.object;
  // Your logic here
});
```

All Stripe event types are fully typed for TypeScript autocomplete and type safety.

## Deployment

### Build for Production

```bash
{{PACKAGE_MANAGER}} build
```

### Deploy to a Node.js Server

Start the production server:

```bash
{{PACKAGE_MANAGER}} start
```

### Deploy with Docker

Create a `Dockerfile`:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --production
COPY dist/ ./dist/
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

## Resources

- [Tayori Documentation](https://github.com/hideokamoto/stripe-webhook-router)
- [Express Documentation](https://expressjs.com)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Stripe Event Types Reference](https://stripe.com/docs/api/events/types)
