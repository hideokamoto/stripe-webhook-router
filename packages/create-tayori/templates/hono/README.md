# {{PROJECT_NAME}}

A Stripe webhook handler built with [Tayori](https://github.com/hideokamoto/stripe-webhook-router) and [Hono](https://hono.dev).

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

```
src/
├── index.ts              # Main application entry point
└── handlers/
    ├── payment.ts        # Payment-related event handlers
    └── subscription.ts   # Subscription-related event handlers
```

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

### Deploy to Cloudflare Workers

1. Install Wrangler:

```bash
{{PACKAGE_MANAGER}} add -D wrangler
```

2. Create `wrangler.toml`:

```toml
name = "{{PROJECT_NAME}}"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[vars]
PORT = "8787"
```

3. Deploy:

```bash
{{PACKAGE_MANAGER}} wrangler deploy
```

### Deploy to Other Platforms

This Hono application can be deployed to:

- **Cloudflare Workers** (recommended)
- **Vercel**
- **AWS Lambda**
- **Google Cloud Functions**
- **Any Node.js hosting**

See the [Hono deployment docs](https://hono.dev/getting-started/basic#starter) for platform-specific instructions.

## Resources

- [Tayori Documentation](https://github.com/hideokamoto/stripe-webhook-router)
- [Hono Documentation](https://hono.dev)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Stripe Event Types Reference](https://stripe.com/docs/api/events/types)
