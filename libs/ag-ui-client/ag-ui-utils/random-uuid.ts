/**
 * Browser-native replacement for @ag-ui/client's randomUUID, whose uuid
 * dependency resolves to its Node build under some bundlers (e.g. the Vitest
 * browser runner).
 */
export function randomUUID(): string {
  return crypto.randomUUID();
}
