import {
  BASIC_COMPONENTS,
  Catalog,
  MessageProcessor,
} from '@a2ui/web_core/v0_9';
import { ticketingExtraComponents } from '@flights42/a2ui-catalog/ticketing-extra-components';
import type { ZodTypeAny } from 'zod/v3';
import { zodToJsonSchema } from 'zod-to-json-schema';

import { A2UI_DEFAULT_CATALOG_ID } from './validate-and-build-surface.js';

const basicCatalog = new Catalog(A2UI_DEFAULT_CATALOG_ID, BASIC_COMPONENTS);
const processor = new MessageProcessor([basicCatalog]);
const capabilities = processor.getClientCapabilities({
  includeInlineCatalogs: true,
});
const basicComponents =
  capabilities['v0.9']?.inlineCatalogs?.[0]?.components ?? {};

interface ComponentDefinition {
  props: ZodTypeAny;
  description: string;
}

function toCatalogMetadata(
  components: Record<string, ComponentDefinition>,
): Record<string, unknown> {
  const metadata: Record<string, unknown> = {};
  for (const name of Object.keys(components)) {
    const component = components[name];
    metadata[name] = zodToJsonSchema(
      component.props.describe(component.description),
    );
  }
  return metadata;
}

const customComponents = toCatalogMetadata(ticketingExtraComponents);

export const basicComponentsSection = `## Basic Components\n${JSON.stringify(basicComponents, null, 2)}`;

export const customComponentsSection = `## Custom Components\n${JSON.stringify(customComponents, null, 2)}`;
