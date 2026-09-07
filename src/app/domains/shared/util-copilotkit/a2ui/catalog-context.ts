import { BASIC_COMPONENTS } from '@a2ui/angular/v0_9';
import { type Context } from '@ag-ui/core';
import { zodToJsonSchema } from 'zod-to-json-schema';

import { type A2uiCustomCatalog } from './types';

export const A2UI_SCHEMA_CONTEXT_DESCRIPTION =
  'A2UI Component Schema — available components for generating UI surfaces. Use these component names and properties when creating A2UI operations.';

type JsonSchema = Record<string, unknown>;
type ZodSchemaArg = Parameters<typeof zodToJsonSchema>[0];

interface CatalogComponentDescriptor {
  name: string;
  description?: string;
  schema: unknown;
}

function toInlineComponentSchema(
  descriptor: CatalogComponentDescriptor,
): JsonSchema {
  const json = zodToJsonSchema(descriptor.schema as ZodSchemaArg, {
    target: 'jsonSchema2019-09',
  }) as JsonSchema;
  const properties = (json['properties'] ?? {}) as JsonSchema;
  const required = (json['required'] ?? []) as string[];

  return {
    allOf: [
      { $ref: 'common_types.json#/$defs/ComponentCommon' },
      {
        ...(descriptor.description
          ? { description: descriptor.description }
          : {}),
        properties: {
          component: { const: descriptor.name },
          ...properties,
        },
        required: ['component', ...required],
      },
    ],
  };
}

export function catalogToContextEntry(catalog: A2uiCustomCatalog): Context {
  const descriptors: CatalogComponentDescriptor[] = [
    ...BASIC_COMPONENTS.map((component) => ({
      name: component.name,
      schema: component.schema as unknown,
    })),
    ...catalog.components.map((component) => ({
      name: component.name,
      description: component.description,
      schema: component.schema,
    })),
  ];

  const components = Object.fromEntries(
    descriptors.map((descriptor) => [
      descriptor.name,
      toInlineComponentSchema(descriptor),
    ]),
  );

  return {
    description: A2UI_SCHEMA_CONTEXT_DESCRIPTION,
    value: JSON.stringify({ catalogId: catalog.id, components }),
  };
}
