import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightChangelogs, { makeChangelogsSidebarLinks } from 'starlight-changelogs';

export default defineConfig({
  site: 'https://tayori-docs.workers.dev',
  integrations: [
    starlight({
      title: 'Tayori',
      description: 'A Hono-inspired, type-safe webhook routing library for TypeScript.',
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/hideokamoto/stripe-webhook-router' },
      ],
      plugins: [starlightChangelogs()],
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
        {
          label: 'Changelog',
          items: [
            ...makeChangelogsSidebarLinks([
              { type: 'latest', label: '@tayori/core', base: 'changelog/core' },
              { type: 'latest', label: '@tayori/stripe', base: 'changelog/stripe' },
              { type: 'latest', label: '@tayori/zod', base: 'changelog/zod' },
              { type: 'latest', label: '@tayori/hono', base: 'changelog/hono' },
              { type: 'latest', label: '@tayori/express', base: 'changelog/express' },
              { type: 'latest', label: '@tayori/lambda', base: 'changelog/lambda' },
              { type: 'latest', label: '@tayori/eventbridge', base: 'changelog/eventbridge' },
              { type: 'latest', label: 'create-tayori', base: 'changelog/create-tayori' },
            ]),
          ],
        },
      ],
    }),
  ],
});
