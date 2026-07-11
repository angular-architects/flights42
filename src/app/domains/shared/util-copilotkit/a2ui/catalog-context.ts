import { type Context } from '@ag-ui/core';
import { zodToJsonSchema } from 'zod-to-json-schema';

import { type A2uiCustomCatalog } from './types';

/**
 * Description of the AG-UI context entry that carries the custom catalog. The
 * server matches on this exact string to extract it, so it must stay in sync
 * with `catalogToPromptSection` in `@internal/ag-ui-server`.
 */
export const A2UI_CATALOG_CONTEXT_DESCRIPTION = 'A2UI Custom Catalog';

/**
 * Serializes a custom catalog into an AG-UI context entry so the agent's server
 * can list the custom component names, descriptions and prop schemas in its
 * system prompt (see `addCustomCatalogInstructions`). The prop schemas are
 * emitted as JSON Schema (`$refStrategy: 'none'` keeps them inline so the
 * server's example generator can read them without resolving `$ref`). Returns
 * null when the catalog has no components to describe.
 */
export function catalogToContextEntry(
  catalog: A2uiCustomCatalog,
): Context | null {
  if (catalog.components.length === 0) {
    return null;
  }

  const components = Object.fromEntries(
    catalog.components.map((component) => [
      component.name,
      {
        description: component.description,
        schema: zodToJsonSchema(component.schema, { $refStrategy: 'none' }),
      },
    ]),
  );

  return {
    description: A2UI_CATALOG_CONTEXT_DESCRIPTION,
    value: JSON.stringify({ catalogId: catalog.id, components }),
  };
}
