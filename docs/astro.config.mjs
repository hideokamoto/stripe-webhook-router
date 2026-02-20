import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://tayori-docs.workers.dev',
  integrations: [
    starlight({
      title: 'Tayori',
      description: 'A Hono-inspired, type-safe webhook routing library for TypeScript.',
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/your-org/tayori' },
      ],
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            { label: 'Overview', slug: 'getting-started/overview' },
            { label: 'Installation', slug: 'getting-started/installation' },
          ],
        },
        {
          label: 'Packages',
          items: [
            { label: 'Core', slug: 'packages/core' },
            { label: 'Stripe', slug: 'packages/stripe' },
            { label: 'Zod', slug: 'packages/zod' },
            { label: 'Hono', slug: 'packages/hono' },
            { label: 'Express', slug: 'packages/express' },
            { label: 'Lambda', slug: 'packages/lambda' },
            { label: 'EventBridge', slug: 'packages/eventbridge' },
            { label: 'create-tayori', slug: 'packages/create-tayori' },
          ],
        },
        {
          label: 'Guides',
          items: [
            { label: 'Stripe Webhooks', slug: 'guides/stripe-webhooks' },
            { label: 'Custom Webhooks', slug: 'guides/custom-webhooks' },
            { label: 'Middleware', slug: 'guides/middleware' },
            { label: 'Routing', slug: 'guides/routing' },
          ],
        },
      ],
    }),
  ],
});
