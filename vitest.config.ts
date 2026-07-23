import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { defineConfig } from 'vitest/config';

const require = createRequire(import.meta.url);
const uuidDir = dirname(require.resolve('uuid/package.json'));

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^supports-color$/,
        replacement: require.resolve('supports-color/browser.js'),
      },
      {
        find: /^uuid$/,
        replacement: join(uuidDir, 'dist/esm-browser/index.js'),
      },
    ],
  },
});
