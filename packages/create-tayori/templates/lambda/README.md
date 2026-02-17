# {{PROJECT_NAME}}

A Stripe webhook handler built with [Tayori](https://github.com/hideokamoto/stripe-webhook-router) and [AWS Lambda](https://aws.amazon.com/lambda).

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

### 3. Build the Handler

```bash
{{PACKAGE_MANAGER}} build
```

The compiled handler will be in `dist/index.cjs`.

## Project Structure

```text
src/
├── index.ts              # Lambda handler entry point
└── handlers/
    ├── payment.ts        # Payment-related event handlers
    └── subscription.ts   # Subscription-related event handlers
```

## Deployment

### Deploy with AWS SAM

Create a `template.yaml`:

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Resources:
  WebhookFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: dist/index.handler
      Runtime: nodejs20.x
      Environment:
        Variables:
          STRIPE_API_KEY: !Ref StripeApiKey
          STRIPE_WEBHOOK_SECRET: !Ref StripeWebhookSecret
      Events:
        WebhookApi:
          Type: HttpApi
          Properties:
            Path: /webhook
            Method: POST

Parameters:
  StripeApiKey:
    Type: AWS::SSM::Parameter::Value<String>
  StripeWebhookSecret:
    Type: AWS::SSM::Parameter::Value<String>
```

Deploy:

```bash
sam build
sam deploy --guided
```

### Deploy with AWS CDK

```typescript
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';

const webhookFn = new lambda.Function(this, 'WebhookFunction', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('dist'),
  environment: {
    STRIPE_API_KEY: process.env.STRIPE_API_KEY!,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET!,
  },
});
```

## Setting Up Stripe Webhook

After deploying, configure your Lambda function URL or API Gateway URL as the Stripe webhook endpoint:

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Enter your Lambda function URL
4. Select the events you want to receive

## Testing Locally

Use the [Stripe CLI](https://stripe.com/docs/stripe-cli) to test webhooks locally with [AWS SAM Local](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/using-sam-cli-local.html):

```bash
# Start SAM local
sam local start-api

# In another terminal, forward Stripe webhooks
stripe listen --forward-to localhost:3000/webhook
stripe trigger payment_intent.succeeded
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

## Resources

- [Tayori Documentation](https://github.com/hideokamoto/stripe-webhook-router)
- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Stripe Event Types Reference](https://stripe.com/docs/api/events/types)
