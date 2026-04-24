import { type JsonSchema, renderComponentEntry } from './schema-example.js';

const A2UI_CATALOG_CONTEXT_DESCRIPTION = 'A2UI Custom Catalog';

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

export function catalogToPromptSection(
  contextEntries: readonly ContextEntry[] | undefined,
): string {
  if (!contextEntries || contextEntries.length === 0) {
    return '';
  }

  const entry = contextEntries.find(
    (item) => item.description === A2UI_CATALOG_CONTEXT_DESCRIPTION,
  );

  if (!entry || typeof entry.value !== 'string') {
    return '';
  }

  const payload = parseCatalogPayload(entry.value);
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
