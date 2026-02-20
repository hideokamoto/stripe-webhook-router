import { defineCollection } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';
import { changelogsLoader } from 'starlight-changelogs/loader';

export const collections = {
  docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
  changelogs: defineCollection({
    loader: changelogsLoader([
      {
        provider: 'changeset',
        base: 'changelog/core',
        title: '@tayori/core',
        changelog: '../packages/core/CHANGELOG.md',
      },
      {
        provider: 'changeset',
        base: 'changelog/stripe',
        title: '@tayori/stripe',
        changelog: '../packages/stripe/CHANGELOG.md',
      },
      {
        provider: 'changeset',
        base: 'changelog/zod',
        title: '@tayori/zod',
        changelog: '../packages/zod/CHANGELOG.md',
      },
      {
        provider: 'changeset',
        base: 'changelog/hono',
        title: '@tayori/hono',
        changelog: '../packages/hono/CHANGELOG.md',
      },
      {
        provider: 'changeset',
        base: 'changelog/express',
        title: '@tayori/express',
        changelog: '../packages/express/CHANGELOG.md',
      },
      {
        provider: 'changeset',
        base: 'changelog/lambda',
        title: '@tayori/lambda',
        changelog: '../packages/lambda/CHANGELOG.md',
      },
      {
        provider: 'changeset',
        base: 'changelog/eventbridge',
        title: '@tayori/eventbridge',
        changelog: '../packages/eventbridge/CHANGELOG.md',
      },
      {
        provider: 'changeset',
        base: 'changelog/create-tayori',
        title: 'create-tayori',
        changelog: '../packages/create-tayori/CHANGELOG.md',
      },
    ]),
  }),
};
