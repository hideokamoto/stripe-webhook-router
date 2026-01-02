# Contributing to Tayori

Thank you for your interest in contributing to Tayori! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Code Style](#code-style)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Adding New Packages](#adding-new-packages)

## Code of Conduct

Please be respectful and constructive in all interactions with the community. We aim to create a welcoming environment for all contributors.

## Getting Started

Before contributing, please:

1. Check existing [issues](https://github.com/hideokamoto/stripe-webhook-router/issues) to see if your concern is already being addressed
2. For new features, open an issue first to discuss the proposed changes
3. For bug fixes, feel free to submit a PR directly with a clear description

## Development Setup

### Prerequisites

- **Node.js**: >= 18.0.0
- **pnpm**: 8.15.0 or higher
- **TypeScript**: 5.3.0 or higher

### Installation

1. Fork and clone the repository:

```bash
git clone https://github.com/YOUR_USERNAME/stripe-webhook-router.git
cd stripe-webhook-router
```

2. Install dependencies:

```bash
pnpm install
```

3. Build all packages:

```bash
pnpm build
```

4. Verify the setup by running tests:

```bash
pnpm test
```

## Project Structure

Tayori is a monorepo managed with pnpm workspaces:

```
tayori/
├── packages/
│   ├── core/          # Core routing logic and Verifier type
│   ├── stripe/        # Stripe type definitions and verifier
│   ├── zod/           # Zod validation integration
│   ├── hono/          # Hono framework adapter
│   ├── express/       # Express framework adapter
│   ├── lambda/        # AWS Lambda adapter
│   ├── eventbridge/   # AWS EventBridge adapter
│   └── create-tayori/ # Project scaffolding CLI
├── package.json       # Root package with workspace scripts
├── pnpm-workspace.yaml
└── tsconfig.base.json # Shared TypeScript config
```

Each package follows this structure:

```
packages/[package-name]/
├── src/               # Source files
│   └── index.ts      # Main entry point
├── tests/            # Test files (vitest)
├── dist/             # Built files (generated)
├── package.json
├── tsconfig.json
├── tsup.config.ts    # Build configuration
└── vitest.config.ts  # Test configuration
```

## Development Workflow

### Running Commands

All commands can be run from the root of the monorepo:

```bash
# Build all packages
pnpm build

# Run all tests
pnpm test

# Run tests in watch mode (in specific package)
cd packages/core
pnpm test:watch

# Type checking
pnpm typecheck

# Linting
pnpm lint
```

### Working on a Specific Package

```bash
# Navigate to the package
cd packages/core

# Run package-specific tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Build the package
pnpm build

# Type check
pnpm typecheck
```

### Building

Tayori uses [tsup](https://tsup.egoist.dev/) for building packages. The build configuration is in `tsup.config.ts` for each package.

Build outputs:
- CommonJS: `dist/index.cjs`
- ESM: `dist/index.js`
- Type definitions: `dist/index.d.ts`

## Testing

We use [Vitest](https://vitest.dev/) for testing.

### Running Tests

```bash
# Run all tests once
pnpm test

# Run tests in watch mode (in a specific package)
cd packages/core
pnpm test:watch
```

### Writing Tests

- Place test files in the `tests/` directory
- Use the naming convention: `*.test.ts`
- Tests should be isolated and not depend on external state
- Mock external dependencies appropriately

Example test structure:

```typescript
import { describe, it, expect } from 'vitest';
import { WebhookRouter } from '../src';

describe('WebhookRouter', () => {
  it('should register event handlers', () => {
    const router = new WebhookRouter();
    router.on('test.event', async (event) => {
      expect(event.type).toBe('test.event');
    });
  });
});
```

### Test Coverage

Aim for high test coverage on new features:
- Core logic should have >90% coverage
- Adapters should cover happy path and error cases
- Type definitions should be validated with type tests

## Code Style

### TypeScript Guidelines

- Use TypeScript for all source files
- Leverage type inference where possible
- Avoid `any` - use `unknown` if type is truly unknown
- Export types that consumers might need
- Use strict mode (`tsconfig.json` has `strict: true`)

### Formatting

- The project uses ESLint for linting
- Run `pnpm lint` to check for issues
- Follow existing code patterns in the repository

### General Principles

- Keep functions small and focused
- Prefer composition over inheritance
- Write self-documenting code with clear names
- Add comments only when the code cannot be made clearer
- Maintain type safety throughout the codebase
- Follow the existing patterns in the codebase

### File Naming

- Use lowercase with hyphens for file names: `webhook-router.ts`
- Test files: `webhook-router.test.ts`
- Type definition files: `types.ts`

## Commit Guidelines

We follow conventional commit format for clear history:

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `test`: Adding or updating tests
- `refactor`: Code refactoring without behavior changes
- `perf`: Performance improvements
- `chore`: Maintenance tasks (dependencies, build, etc.)

### Scope

The scope should be the package name:
- `core`
- `stripe`
- `hono`
- `express`
- `lambda`
- `eventbridge`
- `zod`
- `create-tayori`

### Examples

```
feat(stripe): add support for new webhook events

fix(hono): handle missing headers gracefully

docs(readme): update installation instructions

test(core): improve middleware test coverage
```

## Pull Request Process

### Before Submitting

1. Ensure all tests pass: `pnpm test`
2. Verify type checking: `pnpm typecheck`
3. Run linting: `pnpm lint`
4. Build all packages: `pnpm build`
5. Update documentation if needed
6. Add tests for new features

### PR Description

Include in your PR description:

- **What**: Brief description of the changes
- **Why**: Motivation for the changes
- **How**: Overview of the approach
- **Testing**: How you tested the changes
- **Breaking Changes**: If any, clearly document them

### PR Template Example

```markdown
## Description
Brief description of what this PR does

## Motivation
Why these changes are needed

## Changes
- Change 1
- Change 2

## Testing
- [ ] Tests added/updated
- [ ] All tests passing
- [ ] Type checking passes
- [ ] Lint passes

## Breaking Changes
If applicable, describe breaking changes and migration path
```

### Review Process

- All PRs require at least one approval
- Address reviewer feedback promptly
- Keep PRs focused and reasonably sized
- Squash commits if requested before merging

## Adding New Packages

To add a new package to the monorepo:

1. Create the package directory:

```bash
mkdir -p packages/my-package/src
cd packages/my-package
```

2. Create `package.json`:

```json
{
  "name": "@tayori/my-package",
  "version": "0.1.0",
  "description": "Description",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": {
        "types": "./dist/index.d.ts",
        "default": "./dist/index.js"
      },
      "require": {
        "types": "./dist/index.d.ts",
        "default": "./dist/index.cjs"
      }
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "license": "MIT"
}
```

3. Create `tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src"],
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  }
}
```

4. Create `tsup.config.ts`:

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
});
```

5. Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
});
```

6. Install dependencies and build:

```bash
pnpm install
pnpm build
```

## Questions?

If you have questions or need help:

- Open a [GitHub issue](https://github.com/hideokamoto/stripe-webhook-router/issues)
- Check existing documentation in the [README](README.md)
- Look at existing packages for examples

Thank you for contributing to Tayori!
