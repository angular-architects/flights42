import { posix } from 'node:path';

export interface Dependency {
  source: string;
  target: string;
}

// Selects every `.ts` file that is none of the given kinds.
//
// Example: anyFileExcept(STORE, AI_LAYER) selects all files that are neither a
// store nor part of the ai layer.
//
// Technically, each kind becomes a negative lookahead (`(?!...)`, i.e. "must
// not be present"). anyFileExcept('-a.ts', '-b.ts') produces the pattern:
//   ^(?!.*-a.ts)(?!.*-b.ts).*\.ts$
export function anyFileExcept(...kinds: string[]): string {
  return String.raw`^${kinds.map((kind) => `(?!.*${kind})`).join('')}.*\.ts$`;
}

export function toDependency(violation: unknown): Dependency {
  const { dependency } = violation as {
    dependency: { sourceLabel: string; targetLabel: string };
  };
  return { source: dependency.sourceLabel, target: dependency.targetLabel };
}

/**
 * Returns true when `target` lives in the same folder as `source` or in a
 * child folder of it.
 *
 * Example: isLocalAccess('a/x.ts', 'a/b/y.ts') is true, because the target
 * folder `a/b` is a child of the source folder `a`.
 */
export function isLocalAccess(source: string, target: string): boolean {
  const sourceFolder = posix.dirname(source);
  const targetFolder = posix.dirname(target);
  return (
    targetFolder === sourceFolder || targetFolder.startsWith(`${sourceFolder}/`)
  );
}

export function formatDependency(dependency: Dependency): string {
  return `${dependency.source} -> ${dependency.target}`;
}
