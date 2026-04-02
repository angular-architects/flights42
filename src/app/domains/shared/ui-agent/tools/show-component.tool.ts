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

interface ShowComponentToolArgs<
  TComponents extends readonly AnyRegisteredComponent[],
> {
  components: RegisteredComponentInput<TComponents[number]>[];
}

function createComponentSchema(
  registeredComponents: readonly AnyRegisteredComponent[],
): z.ZodTypeAny {
  if (registeredComponents.length === 0) {
    throw new Error('createShowComponentTool requires at least one component');
  }

  const schemas = registeredComponents.map((entry) =>
    z.object({
      name: z.literal(entry.name),
      props: entry.schema,
    }),
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

export function createShowComponentTool<
  const TComponents extends readonly AnyRegisteredComponent[],
>(registeredComponents: TComponents) {
  const componentSchema = createComponentSchema(registeredComponents);

  return defineAgUiTool({
    name: 'showComponent',
    description: 'Render one or multiple UI components for the user.',
    schema: z.object({
      components: z
        .array(componentSchema)
        .min(1)
        .describe('Component configs with name discriminator and props.'),
    }) as z.ZodType<ShowComponentToolArgs<TComponents>>,
    registeredComponents,
    execute: () => ({ ok: true }),
  });
}
