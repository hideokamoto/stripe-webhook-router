import { defineConfig } from 'vitest/config';

/**
 * Vitest configuration for test coverage and reporting
 *
 * This configuration enables code coverage tracking across all packages
 * and sets minimum thresholds based on TDD best practices.
 */
export default defineConfig({
  test: {
    // Coverage configuration
    coverage: {
      // Use V8 provider for accurate coverage
      provider: 'v8',

      // Output formats
      reporter: [
        'text',        // Console output
        'text-summary', // Summary in console
        'json',        // Machine-readable format
        'json-summary', // Summary in JSON
        'html',        // Interactive HTML report
        'lcov',        // For CI/CD tools
      ],

      // Files to exclude from coverage
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/test/**',
        '**/tests/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/helpers/**',
      ],

      // Coverage thresholds based on Kent Beck's TDD principles
      // These ensure a minimum level of test coverage
      thresholds: {
        lines: 90,       // 90% of lines must be covered
        functions: 90,   // 90% of functions must be covered
        branches: 85,    // 85% of branches must be covered
        statements: 90,  // 90% of statements must be covered
      },

      // Enable all coverage modes
      all: true,

      // Include source files
      include: ['packages/*/src/**/*.ts'],

      // Output directory for coverage reports
      reportsDirectory: './coverage',
    },

    // Test environment
    environment: 'node',

    // Global test configuration
    globals: true,

    // Timeout for tests (in milliseconds)
    testTimeout: 10000,

    // Hook timeout
    hookTimeout: 10000,

    // Isolate each test file
    isolate: true,

    // Number of threads
    threads: true,

    // Reporter configuration
    reporters: ['verbose'],

    // Test file patterns
    include: [
      'packages/*/test/**/*.test.ts',
      'packages/*/test/**/*.spec.ts',
    ],
  },
});
