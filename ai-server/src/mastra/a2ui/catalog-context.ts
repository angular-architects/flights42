import { A2UI_SCHEMA_CONTEXT_DESCRIPTION } from '@ag-ui/a2ui-toolkit';
import type { Context } from '@ag-ui/core';

export const A2UI_DEFAULT_CATALOG_ID =
  'https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json';

export interface RequestContextReader {
  get(key: string): unknown;
}

interface AgUiRequestContext {
  context?: Context[];
}

export function readAgUiContext(
  requestContext: RequestContextReader | undefined,
): Context[] | undefined {
  const agUi = requestContext?.get('ag-ui') as AgUiRequestContext | undefined;
  return agUi?.context;
}

export function readCatalogId(
  context: readonly Context[] | undefined,
): string | undefined {
  const entry = context?.find(
    (item) => item.description === A2UI_SCHEMA_CONTEXT_DESCRIPTION,
  );
  if (!entry) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(entry.value) as { catalogId?: unknown };
    return typeof parsed.catalogId === 'string' && parsed.catalogId.length > 0
      ? parsed.catalogId
      : undefined;
  } catch {
    return undefined;
  }
}
