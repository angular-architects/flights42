import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import { buildA2UIFromBuilt, type BuiltComponent } from './widget-factory.js';

export interface ServerWidgetDefinition<
  TName extends string = string,
  TSchema extends z.ZodTypeAny = z.ZodTypeAny,
> {
  name: TName;
  description: string;
  schema: TSchema;
  build: (props: z.infer<TSchema>) => BuiltComponent;
}

type AnyServerWidgetDefinition = ServerWidgetDefinition<string, z.ZodTypeAny>;
type JsonSchema = Record<string, unknown>;

type WidgetProps<TWidget extends AnyServerWidgetDefinition> = z.infer<
  TWidget['schema']
>;

interface RegisteredWidgetInput<TWidget extends AnyServerWidgetDefinition> {
  name: TWidget['name'];
  props: WidgetProps<TWidget>;
}

interface ShowComponentsToolArgs<
  TWidgets extends readonly AnyServerWidgetDefinition[],
> {
  components: RegisteredWidgetInput<TWidgets[number]>[];
}

export function defineServerWidget<
  const TName extends string,
  const TSchema extends z.ZodTypeAny,
>(widget: {
  name: TName;
  description: string;
  schema: TSchema;
  build: (props: z.infer<TSchema>) => BuiltComponent;
}): ServerWidgetDefinition<TName, TSchema> {
  return widget;
}

function createToolDescription(
  widgets: readonly AnyServerWidgetDefinition[],
): string {
  const widgetsDescription = widgets
    .map((widget) => {
      // Like in the `agentic` branch, we derive concrete example values
      // from Zod's JSON Schema projection instead of storing manual examples.
      const exampleCall = JSON.stringify(
        {
          components: [
            {
              name: widget.name,
              props: createExampleFromJsonSchema(
                z.toJSONSchema(widget.schema) as unknown as JsonSchema,
              ),
            },
          ],
        },
        null,
        2,
      );

      return [
        `Component: ${widget.name}`,
        `Purpose: ${widget.description}`,
        `Example: ${exampleCall}`,
      ].join('\n');
    })
    .join('\n\n');

  return [
    'Render the complete assistant response as one UI payload.',
    'The tool input is a root object with a `components` array.',
    'Call shape: { components: [{ name, props }] }',
    'Rules:',
    '- Use exactly one showComponents call for the final answer of a turn.',
    '- Do not split the answer across multiple showComponents calls.',
    '- In every showComponents call, the first component must be `messageWidget`.',
    '- Put the actual assistant summary text into that first `messageWidget`.',
    '- After the leading `messageWidget`, you may include additional components.',
    '- If the question or answer is about concrete flights, use `flightWidget`.',
    '- Never invent component names.',
    '- Never invent props.',
    '- Use only the registered components listed below.',
    '- Each entry in components must contain exactly name and props.',
    "- Follow each component's Purpose below for when and how to use it.",
    '',
    'Registered components:',
    widgetsDescription,
  ].join('\n');
}

function createExampleFromJsonSchema(schema: JsonSchema): unknown {
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
    return createExampleFromJsonSchema(anyOf[0] as JsonSchema);
  }

  const oneOf = schema['oneOf'];
  if (Array.isArray(oneOf) && oneOf.length > 0) {
    return createExampleFromJsonSchema(oneOf[0] as JsonSchema);
  }

  const type = schema['type'];
  if (type === 'object') {
    const properties = schema['properties'];
    return Object.entries(
      properties && typeof properties === 'object' ? properties : {},
    ).reduce<Record<string, unknown>>((result, [key, value]) => {
      result[key] = createExampleFromJsonSchema(value as JsonSchema);
      return result;
    }, {});
  }

  const items = schema['items'];
  if (type === 'array' && items) {
    return [createExampleFromJsonSchema(items as JsonSchema)];
  }

  if (type === 'string') {
    if (schema['format'] === 'date-time') {
      return '2026-04-10T09:30:00.000Z';
    }

    return 'example';
  }

  const minimum = schema['minimum'];
  if (type === 'number' || type === 'integer') {
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
  widgets: readonly AnyServerWidgetDefinition[],
): z.ZodTypeAny {
  if (widgets.length === 0) {
    throw new Error('createShowComponentsTool requires at least one widget');
  }

  const schemas = widgets.map((widget) =>
    z
      .object({
        name: z.literal(widget.name),
        props: widget.schema,
      })
      .describe(widget.description),
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

function validateComponentSequence(components: { name: string }[]) {
  if (components.length === 0) {
    throw new Error('showComponents requires at least one component');
  }

  if (components[0]?.name !== 'messageWidget') {
    throw new Error(
      'The first component in every showComponents call must be messageWidget',
    );
  }
}

export function createShowComponentsTool<
  const TWidgets extends readonly AnyServerWidgetDefinition[],
>(widgets: TWidgets) {
  const componentSchema = createComponentSchema(widgets);
  const description = createToolDescription(widgets);
  const inputSchema = z.object({
    components: z
      .array(componentSchema)
      .min(1)
      .describe('Widget configs with name discriminator and props.'),
  }) as z.ZodType<ShowComponentsToolArgs<TWidgets>>;
  const widgetMap = new Map<string, AnyServerWidgetDefinition>(
    widgets.map((widget) => [widget.name, widget]),
  );

  return createTool({
    id: 'showComponents',
    description,
    inputSchema,
    execute: async (inputData: unknown) => {
      const typedInput = inputData as ShowComponentsToolArgs<TWidgets>;
      validateComponentSequence(typedInput.components);
      const built = typedInput.components.map((component) => {
        const widget = widgetMap.get(component.name);
        if (!widget) {
          throw new Error(`Unknown widget: ${component.name}`);
        }

        return widget.build(component.props);
      });

      return buildA2UIFromBuilt(built);
    },
  });
}
