# {{PROJECT_NAME}}

A Stripe webhook handler built with [Tayori](https://github.com/hideokamoto/stripe-webhook-router) and [AWS EventBridge](https://aws.amazon.com/eventbridge).

## Architecture

This project uses the **Stripe → EventBridge → Lambda** architecture:

1. Stripe sends webhooks to a receiver Lambda (or API Gateway)
2. The receiver publishes events to AWS EventBridge
3. EventBridge routes events to this Lambda handler based on rules

**No signature verification is needed** in this handler because AWS EventBridge guarantees the authenticity of events.

## Getting Started

### 1. Install Dependencies

```bash
{{PACKAGE_MANAGER}} install
```

### 2. Build the Handler

```bash
{{PACKAGE_MANAGER}} build
```

The compiled handler will be in `dist/index.cjs`.

## Project Structure

```
src/
├── index.ts              # Lambda handler entry point (EventBridge consumer)
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
  # EventBridge bus for Stripe events
  StripeEventBus:
    Type: AWS::Events::EventBus
    Properties:
      Name: stripe-events

  # Lambda function that processes Stripe events from EventBridge
  WebhookFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: dist/index.handler
      Runtime: nodejs20.x
      Events:
        StripePaymentEvents:
          Type: EventBridgeRule
          Properties:
            EventBusName: !Ref StripeEventBus
            Pattern:
              source:
                - stripe
```

Deploy:

```bash
sam build
sam deploy --guided
```

## Setting Up Stripe → EventBridge Integration

Use [Stripe's Amazon EventBridge integration](https://stripe.com/docs/event-destinations/eventbridge):

1. Go to [Stripe Dashboard → Event Destinations](https://dashboard.stripe.com/event_destinations)
2. Click "Create event destination"
3. Select "Amazon EventBridge"
4. Enter your AWS Account ID and region
5. Select the events you want to forward

Or configure it programmatically with the Stripe API.

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
- [Stripe EventBridge Integration](https://stripe.com/docs/event-destinations/eventbridge)
- [AWS EventBridge Documentation](https://docs.aws.amazon.com/eventbridge)
- [Stripe Event Types Reference](https://stripe.com/docs/api/events/types)
