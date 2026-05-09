import { createHash } from 'node:crypto';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// File-system based cache for the dashboard agent. Resolves to
// `<repo>/ai-server/cache/` relative to this source file so the location is
// stable regardless of which directory `mastra dev` is launched from.
const SOURCE_DIR = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = resolve(SOURCE_DIR, '../../../cache');
const FILE_SUFFIX = '.a2ui.txt';

interface RequestMessage {
  readonly role: string;
  readonly content?: unknown;
}

export function computeDashboardRequestHash(
  messages: readonly RequestMessage[],
): string {
  const userTexts = messages
    .filter((message) => message.role === 'user')
    .map((message) => extractText(message.content))
    .filter((text) => text.length > 0);

  return createHash('sha256').update(userTexts.join('\n---\n')).digest('hex');
}

export async function dashboardCacheExists(hash: string): Promise<boolean> {
  try {
    await access(getCacheFilePath(hash));
    return true;
  } catch (err) {
    if (isNotFoundError(err)) {
      return false;
    }
    throw err;
  }
}

export async function readDashboardCache(
  hash: string,
): Promise<unknown[] | null> {
  try {
    const raw = await readFile(getCacheFilePath(hash), 'utf-8');
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed : null;
  } catch (err) {
    if (isNotFoundError(err)) {
      return null;
    }
    throw err;
  }
}

export async function writeDashboardCache(
  hash: string,
  operations: readonly unknown[],
): Promise<void> {
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(
    getCacheFilePath(hash),
    JSON.stringify(operations, null, 2),
    'utf-8',
  );
}

function getCacheFilePath(hash: string): string {
  return join(CACHE_DIR, `${hash}${FILE_SUFFIX}`);
}

function extractText(content: unknown): string {
  if (typeof content === 'string') {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (
          part &&
          typeof part === 'object' &&
          'text' in part &&
          typeof (part as { text?: unknown }).text === 'string'
        ) {
          return (part as { text: string }).text;
        }
        return '';
      })
      .join('');
  }
  return '';
}

function isNotFoundError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as NodeJS.ErrnoException).code === 'ENOENT'
  );
}
