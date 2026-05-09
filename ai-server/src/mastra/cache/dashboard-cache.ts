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

export interface DashboardCacheEntry {
  /**
   * Surface-shaping operations: `createSurface` + `updateComponents`.
   * Re-emitted as-is on every cache hit so the renderer rebuilds the
   * component tree.
   */
  structural: unknown[];
  /**
   * Initial `updateDataModel` operations from the original turn. Used as
   * a template for the delta-refresh agent: it sees these paths and
   * re-emits them with fresh values.
   */
  dataModel: unknown[];
  /**
   * The surface id used by `structural` and `dataModel`. Convenience
   * cache; could also be derived from the operations list.
   */
  surfaceId: string;
}

interface MaybeOperation {
  readonly createSurface?: { readonly surfaceId?: unknown };
  readonly updateComponents?: { readonly surfaceId?: unknown };
  readonly updateDataModel?: unknown;
  readonly deleteSurface?: unknown;
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
  operations: readonly unknown[],
): Promise<DashboardCacheEntry | null> {
  const entry = splitA2uiOperations(operations);
  if (!entry) {
    return null;
  }
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(
    getCacheFilePath(hash),
    JSON.stringify(entry, null, 2),
    'utf-8',
  );
  return entry;
}

/**
 * Splits a fresh A2UI operations array into the structural part
 * (`createSurface` + `updateComponents`) and the initial data-model
 * part (`updateDataModel`). Returns `null` when the operations don't
 * contain a `createSurface` (in which case caching makes no sense).
 */
export function splitA2uiOperations(
  operations: readonly unknown[],
): DashboardCacheEntry | null {
  const structural: unknown[] = [];
  const dataModel: unknown[] = [];
  let surfaceId: string | null = null;

  for (const op of operations) {
    if (!op || typeof op !== 'object') {
      continue;
    }
    const candidate = op as MaybeOperation;
    if (candidate.createSurface) {
      structural.push(op);
      const id = candidate.createSurface.surfaceId;
      if (typeof id === 'string') {
        surfaceId = id;
      }
      continue;
    }
    if (candidate.updateComponents) {
      structural.push(op);
      continue;
    }
    if (candidate.updateDataModel) {
      dataModel.push(op);
      continue;
    }
  }

  if (!surfaceId || structural.length === 0) {
    return null;
  }

  return { structural, dataModel, surfaceId };
}

function toCacheEntry(value: unknown): DashboardCacheEntry | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const candidate = value as Partial<DashboardCacheEntry>;
  if (
    !Array.isArray(candidate.structural) ||
    !Array.isArray(candidate.dataModel) ||
    typeof candidate.surfaceId !== 'string'
  ) {
    return null;
  }
  return {
    structural: candidate.structural,
    dataModel: candidate.dataModel,
    surfaceId: candidate.surfaceId,
  };
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
