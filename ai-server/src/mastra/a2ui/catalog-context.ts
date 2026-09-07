import { A2UI_SCHEMA_CONTEXT_DESCRIPTION } from '@ag-ui/a2ui-middleware';
import type { Context } from '@ag-ui/core';

import { type JsonSchema, renderComponentEntry } from './schema-example.js';

export const A2UI_DEFAULT_CATALOG_ID =
  'https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json';

interface CatalogEntry {
  catalogId: string;
  components: Record<string, unknown>;
}

interface CustomComponent {
  description: string;
  propsSchema: JsonSchema;
}

function readCatalogEntry(
  context: readonly Context[] | undefined,
): CatalogEntry | undefined {
  const entry = context?.find(
    (item) => item.description === A2UI_SCHEMA_CONTEXT_DESCRIPTION,
  );
  if (!entry || typeof entry.value !== 'string') {
    return undefined;
  }
  try {
    const parsed = JSON.parse(entry.value) as {
      catalogId?: unknown;
      components?: unknown;
    };
    if (typeof parsed.catalogId !== 'string' || parsed.catalogId.length === 0) {
      return undefined;
    }
    const components =
      typeof parsed.components === 'object' && parsed.components !== null
        ? (parsed.components as Record<string, unknown>)
        : {};
    return { catalogId: parsed.catalogId, components };
  } catch {
    return undefined;
  }
}

export function readCatalogId(
  context: readonly Context[] | undefined,
): string | undefined {
  return readCatalogEntry(context)?.catalogId;
}

function toCustomComponent(schema: unknown): CustomComponent | null {
  const allOf = (schema as { allOf?: unknown } | null)?.allOf;
  if (!Array.isArray(allOf)) {
    return null;
  }
  const detail = allOf.find(
    (part): part is Record<string, unknown> =>
      typeof part === 'object' && part !== null && 'properties' in part,
  );
  if (!detail || typeof detail['description'] !== 'string') {
    return null;
  }
  const properties = { ...(detail['properties'] as Record<string, unknown>) };
  delete properties['component'];
  const required = Array.isArray(detail['required'])
    ? detail['required'].filter((key) => key !== 'component')
    : [];
  return {
    description: detail['description'],
    propsSchema: { type: 'object', properties, required },
  };
}

export function catalogToPromptSection(
  context: readonly Context[] | undefined,
): string {
  const entry = readCatalogEntry(context);
  if (!entry) {
    return '';
  }

  const blocks = Object.entries(entry.components).flatMap(([name, schema]) => {
    const custom = toCustomComponent(schema);
    return custom
      ? [renderComponentEntry(name, custom.description, custom.propsSchema)]
      : [];
  });
  if (blocks.length === 0) {
    return '';
  }

  return [
    `## Custom Catalog Components (catalog: ${entry.catalogId})`,
    'You MAY reference these component names inside updateComponents',
    'alongside basic A2UI components. Never invent other component names.',
    '',
    blocks.join('\n\n'),
  ].join('\n');
}
