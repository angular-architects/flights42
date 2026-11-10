import type { A2uiComponentDefinition } from '@flights42/a2ui-catalog/a2ui-schema';
import { zodToJsonSchema } from 'zod-to-json-schema';

export const PROTOCOL_VERSION = 'v0.9';

interface CatalogSchema {
  components: Record<string, unknown>;
  $defs: Record<string, unknown>;
}

export function toCatalogComponents(
  definitions: Record<string, A2uiComponentDefinition>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const name of Object.keys(definitions)) {
    const definition = definitions[name];
    const props = definition.props.describe(definition.description);
    result[name] = zodToJsonSchema(props);
  }
  return result;
}

export function extendCatalogSchema(
  baseSchema: CatalogSchema,
  components: Record<string, unknown>,
  catalogId: string,
) {
  const allComponents = { ...baseSchema.components, ...components };
  const componentRefs = Object.keys(allComponents).map((name) => {
    return { $ref: `#/components/${name}` };
  });
  return {
    ...baseSchema,
    catalogId,
    components: allComponents,
    $defs: {
      ...baseSchema.$defs,
      anyComponent: {
        oneOf: componentRefs,
        discriminator: { propertyName: 'component' },
      },
    },
  };
}
