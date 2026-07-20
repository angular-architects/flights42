import { type JsonSchema, renderComponentEntry } from './schema-example.js';

const A2UI_CATALOG_CONTEXT_DESCRIPTION = 'A2UI Custom Catalog';

export const A2UI_DEFAULT_CATALOG_ID =
  'https://a2ui.org/specification/v0_9/basic_catalog.json';

interface ContextEntry {
  description?: string;
  value?: string;
}

interface CatalogPayload {
  catalogId: string;
  components: Record<string, { description: string; schema: JsonSchema }>;
}

function parseCatalogPayload(value: string): CatalogPayload | null {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('catalogId' in parsed) ||
      !('components' in parsed)
    ) {
      return null;
    }

    const { catalogId, components } = parsed as {
      catalogId: unknown;
      components: unknown;
    };

    if (
      typeof catalogId !== 'string' ||
      typeof components !== 'object' ||
      components === null
    ) {
      return null;
    }

    return {
      catalogId,
      components: components as CatalogPayload['components'],
    };
  } catch {
    return null;
  }
}

function findCatalogPayload(
  contextEntries: readonly ContextEntry[] | undefined,
): CatalogPayload | null {
  if (!contextEntries || contextEntries.length === 0) {
    return null;
  }

  const entry = contextEntries.find(
    (item) => item.description === A2UI_CATALOG_CONTEXT_DESCRIPTION,
  );

  if (!entry || typeof entry.value !== 'string') {
    return null;
  }

  return parseCatalogPayload(entry.value);
}

export function extractCatalogId(
  contextEntries: readonly ContextEntry[] | undefined,
): string | null {
  const payload = findCatalogPayload(contextEntries);
  return payload ? payload.catalogId : null;
}

export function catalogToPromptSection(
  contextEntries: readonly ContextEntry[] | undefined,
): string {
  const payload = findCatalogPayload(contextEntries);
  if (!payload) {
    return '';
  }

  const componentBlocks = Object.entries(payload.components).map(
    ([name, descriptor]) =>
      renderComponentEntry(name, descriptor.description, descriptor.schema),
  );

  if (componentBlocks.length === 0) {
    return '';
  }

  return [
    `## Custom Catalog Components (catalog: ${payload.catalogId})`,
    'You MAY reference these component names inside updateComponents',
    'alongside basic A2UI components. Never invent other component names.',
    '',
    componentBlocks.join('\n\n'),
  ].join('\n');
}
