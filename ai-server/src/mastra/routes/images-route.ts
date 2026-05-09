import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import type { ContextWithMastra } from '@mastra/core/server';

// `mastra dev` and `mastra start` set the process cwd to the
// `<mastra-dir>/public/` folder (the same place where the libsql db files
// live). Resolving relative to `process.cwd()` keeps the path stable
// regardless of which directory the launcher was invoked from. Using
// `import.meta.url` would break here because the source file is bundled
// into `.mastra/output/` and the relative path no longer reaches the
// repo's `ai-server/src/mastra/public/images/` directory.
const IMAGES_DIR = resolve(process.cwd(), 'images');

const ALLOWED_CATEGORIES = new Set(['cars', 'hotels']);
const ALLOWED_FILENAME = /^[a-z0-9][a-z0-9-]*\.(?:webp|jpg|jpeg|png)$/i;

const CONTENT_TYPES: Record<string, string> = {
  webp: 'image/webp',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
};

export async function getDashboardImageHandler(
  c: ContextWithMastra,
): Promise<Response> {
  const category = c.req.param('category') ?? '';
  const filename = c.req.param('filename') ?? '';

  if (!ALLOWED_CATEGORIES.has(category) || !ALLOWED_FILENAME.test(filename)) {
    return c.text('image not found', 404);
  }

  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const contentType = CONTENT_TYPES[ext];
  if (!contentType) {
    return c.text('image not found', 404);
  }

  let buffer: Buffer;
  try {
    buffer = await readFile(join(IMAGES_DIR, category, filename));
  } catch {
    return c.text('image not found', 404);
  }

  // The byte payload is small and stable: send it back as-is and let the
  // browser cache aggressively (1 year, immutable) since the URLs are
  // content-addressed by filename.
  return c.body(new Uint8Array(buffer), 200, {
    'Content-Type': contentType,
    'Cache-Control': 'public, max-age=31536000, immutable',
  });
}
