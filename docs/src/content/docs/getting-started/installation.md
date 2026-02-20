---
title: Installation
description: Install Tayori and its dependencies
---

## Prerequisites

- **Node.js** >= 18
- **Package manager**: pnpm, npm, or yarn

## Install by use case

### Stripe with Hono

```bash
pnpm add @tayori/stripe @tayori/hono stripe
```

### Stripe with Express

```bash
pnpm add @tayori/stripe @tayori/express stripe
```

### Stripe with AWS Lambda

```bash
pnpm add @tayori/stripe @tayori/lambda stripe
```

### Custom webhooks (without Stripe)

Use the core router with any adapter:

```bash
pnpm add @tayori/core @tayori/hono
# or @tayori/express, @tayori/lambda
```

### Runtime validation with Zod

If you want runtime schema validation in addition to type safety:

```bash
pnpm add @tayori/stripe @tayori/zod @tayori/hono stripe zod
```

## Scaffolding with create-tayori

The fastest way to create a new project is with the scaffolding tool:

```bash
npx create-tayori
```

This will interactively guide you through creating a new Tayori project with your preferred framework and package manager.

You can also specify options directly:

```bash
# Create a new Hono-based webhook handler
npx create-tayori my-webhook-handler --fw=hono

# With custom package manager
npx create-tayori my-webhook-handler --fw=hono --pm=pnpm
```

## Peer dependencies

- **Stripe adapter** (`@tayori/stripe`): `stripe` >= 17.0.0
- **Hono adapter** (`@tayori/hono`): `hono` >= 4.0.0
- **Express adapter** (`@tayori/express`): `express` >= 4.0.0
- **Zod integration** (`@tayori/zod`): `zod` ^4.0.0

Install the peer dependencies for the packages you use.
