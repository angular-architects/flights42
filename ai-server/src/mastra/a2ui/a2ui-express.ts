import {
  type A2uiRequestProcessor,
  type AgentToRendererMessage,
  InMemoryCatalogProvider,
} from '@a2ui/agent';
import type { A2uiComponentDefinition } from '@flights42/a2ui-catalog/a2ui-schema';
import { zodToJsonSchema } from 'zod-to-json-schema';

import basicCatalog from '../../../../node_modules/@a2ui/web_core/src/v0_9/schemas/catalogs/basic/catalog.json';

const PROTOCOL_VERSION = 'v0.9';

export const basicComponents = basicCatalog.components;

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

export function createCatalog(
  components: Record<string, unknown>,
  catalogId: string,
) {
  return new InMemoryCatalogProvider(
    {
      ...basicCatalog,
      catalogId,
      components,
      $defs: {
        ...basicCatalog.$defs,
        anyComponent: {
          ...basicCatalog.$defs.anyComponent,
          oneOf: Object.keys(components).map((name) => {
            return { $ref: `#/components/${name}` };
          }),
        },
      },
    },
    PROTOCOL_VERSION,
  ).load();
}

export function compileExpress(
  processor: A2uiRequestProcessor,
  express: string,
): AgentToRendererMessage[] {
  const parts = processor.parseResponse(express, {
    wrapped: express.includes('<a2ui>'),
  });
  return parts.flatMap((part) => {
    return part.type === 'text' ? [] : part.a2ui;
  });
}
