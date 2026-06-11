import { createHash } from 'node:crypto';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  type DashboardSpec,
  dashboardSpecSchema,
} from '../dashboard-dsl/dashboard-spec.js';

// File-system based cache for the dashboard agent. Resolves to
// `<repo>/ai-server/cache/` relative to this source file so the location is
// stable regardless of which directory `mastra dev` is launched from.
//
// Since the move to the dashboard DSL we cache only the parsed
// `DashboardSpec`. A2UI structural ops are recompiled deterministically
// from the spec by `compileDashboard` on every refresh, and the data
// ops are reproduced fresh from the live data sources. The .json
// extension is new on purpose so old `.a2ui.txt` files (which used a
// different layout) no longer collide.
const SOURCE_DIR = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = resolve(SOURCE_DIR, '../../../cache');
const FILE_SUFFIX = '.dashboard.json';

interface RequestMessage {
  readonly role: string;
  readonly content?: unknown;
}

export interface DashboardCacheEntry {
  spec: DashboardSpec;
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
): Promise<DashboardCacheEntry | null> {
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

export async function writeDashboardCache(
  hash: string,
  spec: DashboardSpec,
): Promise<DashboardCacheEntry> {
  const entry: DashboardCacheEntry = { spec };
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(
    getCacheFilePath(hash),
    JSON.stringify(entry, null, 2),
    'utf-8',
  );
  return entry;
}

function toCacheEntry(value: unknown): DashboardCacheEntry | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const candidate = value as { spec?: unknown };
  if (!candidate.spec) {
    return null;
  }
  const result = dashboardSpecSchema.safeParse(candidate.spec);
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
