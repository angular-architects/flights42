import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  type SandboxedUiSpec,
  sandboxedUiSpecSchema,
} from '../generative-ui/sandboxed-ui-spec.js';

const SOURCE_DIR = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = resolve(SOURCE_DIR, '../../../cache');
const FILE_SUFFIX = '.genui.json';

interface RequestMessage {
  readonly role: string;
  readonly content?: unknown;
}

export interface GenerativeUiCacheEntry {
  spec: SandboxedUiSpec;
}

export function computeGenerativeUiRequestHash(
  messages: readonly RequestMessage[],
): string {
  const userTexts = messages
    .filter((message) => message.role === 'user')
    .map((message) => extractText(message.content))
    .filter((text) => text.length > 0);

  return createHash('sha256').update(userTexts.join('\n---\n')).digest('hex');
}

export async function readGenerativeUiCache(
  hash: string,
): Promise<GenerativeUiCacheEntry | null> {
  try {
    const raw = await readFile(getCacheFilePath(hash), 'utf-8');
    const parsed = JSON.parse(raw) as unknown;
    return toCacheEntry(parsed);
  } catch (err) {
    if (isNotFoundError(err)) {
      return null;
    }
    throw err;
  }
}

export async function writeGenerativeUiCache(
  hash: string,
  spec: SandboxedUiSpec,
): Promise<GenerativeUiCacheEntry> {
  const entry: GenerativeUiCacheEntry = { spec };
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(
    getCacheFilePath(hash),
    JSON.stringify(entry, null, 2),
    'utf-8',
  );
  return entry;
}

function toCacheEntry(value: unknown): GenerativeUiCacheEntry | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const candidate = value as { spec?: unknown };
  if (!candidate.spec) {
    return null;
  }
  const result = sandboxedUiSpecSchema.safeParse(candidate.spec);
  if (!result.success) {
    return null;
  }
  return { spec: result.data };
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
