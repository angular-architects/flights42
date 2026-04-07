import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

const currentDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: currentDir,
  plugins: [viteSingleFile()],
  build: {
    outDir: resolve(currentDir, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(currentDir, 'index.html'),
    },
  },
});
