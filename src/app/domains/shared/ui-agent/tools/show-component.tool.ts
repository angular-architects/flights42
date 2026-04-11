import { z } from 'zod';

import { AgUiRegisteredComponent, defineAgUiTool } from '../ag-ui-types';

type AnyRegisteredComponent = AgUiRegisteredComponent<
  unknown,
  Record<string, unknown>,
  string
>;

interface RegisteredComponentInput<TComponent extends AnyRegisteredComponent> {
  name: TComponent['name'];
  props: z.infer<TComponent['schema']>;
}

interface ShowComponentsToolArgs<
  TComponents extends readonly AnyRegisteredComponent[],
> {
  components: RegisteredComponentInput<TComponents[number]>[];
}

type JsonSchema = Record<string, unknown>;

function createToolDescription(
  registeredComponents: readonly AnyRegisteredComponent[],
): string {
  const componentsDescription = registeredComponents
    .map((entry) => {
      const exampleCall = JSON.stringify(
        {
          components: [
            {
              name: entry.name,
              props: createExampleFromSchema(
                z.toJSONSchema(entry.schema) as unknown as JsonSchema,
              ),
            },
          ],
        },
        null,
        2,
      );

      return [
        `Component: ${entry.name}`,
        `Purpose: ${entry.description}`,
        `Example: ${exampleCall}`,
      ].join('\n');
    })
    .join('\n\n');

  return [
    'Render one or multiple UI components for the user.',
    'Call shape: { components: [{ name, props }] }',
    'Rules:',
    '- Never invent component names.',
    '- Never invent props.',
    '- Use only the registered components listed below.',
    '- Each entry in components must contain exactly name and props.',
    '',
    'Registered components:',
    componentsDescription,
  ].join('\n');
}

function createExampleFromSchema(schema: JsonSchema): unknown {
  const examples = schema['examples'];
  if (Array.isArray(examples) && examples[0]) {
    return examples[0];
  }

  const defaultValue = schema['default'];
  if (defaultValue !== undefined) {
    return defaultValue;
  }

  if ('const' in schema) {
    return schema['const'];
  }

  const enumValues = schema['enum'];
  if (Array.isArray(enumValues) && enumValues.length > 0) {
    return enumValues[0];
  }

  const anyOf = schema['anyOf'];
  if (Array.isArray(anyOf) && anyOf.length > 0) {
    return createExampleFromSchema(anyOf[0] as JsonSchema);
  }

  const oneOf = schema['oneOf'];
  if (Array.isArray(oneOf) && oneOf.length > 0) {
    return createExampleFromSchema(oneOf[0] as JsonSchema);
  }

  const type = schema['type'];
  if (type === 'object') {
    const properties = schema['properties'];
    return Object.entries(
      properties && typeof properties === 'object' ? properties : {},
    ).reduce<Record<string, unknown>>((result, [key, value]) => {
      result[key] = createExampleFromSchema(value as JsonSchema);
      return result;
    }, {});
  }

  const items = schema['items'];
  if (type === 'array' && items) {
    return [createExampleFromSchema(items as JsonSchema)];
  }

  if (type === 'string') {
    if (schema['format'] === 'date-time') {
      return '2026-04-10T09:30:00.000Z';
    }

    return 'example';
  }

  const minimum = schema['minimum'];
  if (type === 'number') {
    if (typeof minimum === 'number') {
      return minimum;
    }

    return 1;
  }

  if (type === 'integer') {
    if (typeof minimum === 'number') {
      return minimum;
    }

    return 1;
  }

  if (type === 'boolean') {
    return true;
  }

  return null;
}

function createComponentSchema(
  registeredComponents: readonly AnyRegisteredComponent[],
): z.ZodTypeAny {
  if (registeredComponents.length === 0) {
    throw new Error('createShowComponentsTool requires at least one component');
  }

  const schemas = registeredComponents.map((entry) =>
    z
      .object({
        name: z.literal(entry.name),
        props: entry.schema,
      })
      .describe(entry.description),
  );

  if (schemas.length === 1) {
    return schemas[0];
  }

  return z.discriminatedUnion(
    'name',
    schemas as unknown as [
      z.core.$ZodTypeDiscriminable,
      z.core.$ZodTypeDiscriminable,
      ...z.core.$ZodTypeDiscriminable[],
    ],
  );
}

export function createShowComponentsTool<
  const TComponents extends readonly AnyRegisteredComponent[],
>(registeredComponents: TComponents) {
  const componentSchema = createComponentSchema(registeredComponents);
  const description = createToolDescription(registeredComponents);

  return defineAgUiTool({
    name: 'showComponents',
    description,
    schema: z.object({
      components: z
        .array(componentSchema)
        .min(1)
        .describe('Component configs with name discriminator and props.'),
    }) as z.ZodType<ShowComponentsToolArgs<TComponents>>,
    registeredComponents,
    execute: () => ({ ok: true }),
  });
}
