import { defineConfig } from 'vitest/config';

/**
 * The architecture tests run with tsarch, which parses the TypeScript project
 * via the compiler API and the file system. They therefore need a Node
 * environment and cannot run in the browser-based `ng test` setup.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['arch/**/*.spec.ts'],
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
