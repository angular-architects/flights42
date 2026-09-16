import { posix } from 'node:path';

import type { Checkable, Violation } from 'archunit';

interface FileDependency {
  sourceLabel: string;
  targetLabel: string;
}

export type ViolationFilter = (violation: Violation) => boolean;

// ArchUnitTS reports a forbidden import as a violation carrying a
// `dependency` (source -> target). Other violations (e.g. the empty-test
// violation raised when a pattern matches no file) carry a `message` instead.
function toDependency(violation: Violation): FileDependency | undefined {
  const { dependency } = violation as { dependency?: Partial<FileDependency> };
  return dependency?.sourceLabel && dependency.targetLabel
    ? {
        sourceLabel: dependency.sourceLabel,
        targetLabel: dependency.targetLabel,
      }
    : undefined;
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

// True for a dependency violation whose target is co-located with its source.
export const isLocalDependency: ViolationFilter = (violation) => {
  const dependency = toDependency(violation);
  return (
    dependency !== undefined &&
    isLocalAccess(dependency.sourceLabel, dependency.targetLabel)
  );
};

// ArchUnitTS (2.5) records a self-edge for every file. A rule whose subject
// and object patterns overlap (e.g. "stores must not depend on stores") would
// therefore report each such file as depending on itself.
const isSelfDependency: ViolationFilter = (violation) => {
  const dependency = toDependency(violation);
  return (
    dependency !== undefined &&
    dependency.sourceLabel === dependency.targetLabel
  );
};

export function formatViolation(violation: Violation): string {
  const dependency = toDependency(violation);
  if (dependency) {
    return `${dependency.sourceLabel} -> ${dependency.targetLabel}`;
  }
  const { message } = violation as { message?: string };
  return message ?? JSON.stringify(violation);
}

/**
 * Runs the rule and returns the remaining violations, formatted as
 * `source -> target`. Self dependencies are always ignored; `exceptions`
 * name further dependencies that are acceptable (e.g. co-located access).
 * Violations without a dependency, such as a pattern that matched no file,
 * are always kept so that a rule never passes silently.
 */
export async function violationsOf(
  rule: Checkable,
  ...exceptions: ViolationFilter[]
): Promise<string[]> {
  const violations = await rule.check();
  return violations
    .filter(
      (violation) =>
        !isSelfDependency(violation) &&
        !exceptions.some((exception) => exception(violation)),
    )
    .map(formatViolation);
}
