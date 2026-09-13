import {
  type AngularCatalog,
  type AngularComponentImplementation,
  BASIC_COMPONENTS,
} from '@a2ui/angular/v0_9';
import { type Context } from '@ag-ui/core';
import { zodToJsonSchema } from 'zod-to-json-schema';

export const A2UI_SCHEMA_CONTEXT_DESCRIPTION =
  'A2UI Component Schema — available components for generating UI surfaces. Use these component names and properties when creating A2UI operations.';

type JsonSchema = Record<string, unknown>;
type ZodSchemaArg = Parameters<typeof zodToJsonSchema>[0];

const basicComponentNames = new Set(
  BASIC_COMPONENTS.map((component) => component.name),
);

function toInlineComponentSchema(
  component: AngularComponentImplementation,
): JsonSchema {
  const json = zodToJsonSchema(component.schema as unknown as ZodSchemaArg, {
    target: 'jsonSchema2019-09',
  }) as JsonSchema;
  const properties = (json['properties'] ?? {}) as JsonSchema;
  const required = (json['required'] ?? []) as string[];
  const description = component.schema.description;

  return {
    allOf: [
      { $ref: 'common_types.json#/$defs/ComponentCommon' },
      {
        ...(description ? { description } : {}),
        properties: {
          component: { const: component.name },
          ...properties,
        },
        required: ['component', ...required],
      },
    ],
  };
}

export function catalogToContextEntry(catalog: AngularCatalog): Context {
  const components = Object.fromEntries(
    [...catalog.components.values()]
      .filter((component) => !basicComponentNames.has(component.name))
      .map((component) => [component.name, toInlineComponentSchema(component)]),
  );

  return {
    description: A2UI_SCHEMA_CONTEXT_DESCRIPTION,
    value: JSON.stringify({ catalogId: catalog.id, components }),
  };
}
