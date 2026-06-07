import { defineConfig } from 'vitest/config';

/**
 * Unit tests for the Node-based build/hook scripts under `scripts/`. They run
 * in a Node environment (no Angular/browser setup) and are kept separate from
 * the arch tests and the browser-based `ng test` run.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['scripts/**/*.spec.mjs'],
  },
});
