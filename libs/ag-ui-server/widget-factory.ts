import { randomUUID } from 'node:crypto';

import type { A2uiMessage } from '@a2ui/web_core/v0_9';

const BASIC_CATALOG_ID =
  'https://a2ui.org/specification/v0_9/basic_catalog.json';

export interface BuiltComponent {
  rootId: string;
  components: ({
    id: string;
    component: string;
  } & Record<string, unknown>)[];
  dataModelUpdate?: {
    path: string;
    value: unknown;
  };
}

export interface WidgetInput {
  type: string;
}

export type WidgetFactories<TInput extends WidgetInput> = {
  [Type in TInput['type']]: (
    input: Extract<TInput, { type: Type }>,
  ) => BuiltComponent;
};

export function buildA2UIFromBuilt(built: BuiltComponent[]): {
  surfaceId: string;
  messages: A2uiMessage[];
} {
  const surfaceId = randomUUID();
  const rootChildren = built.map((entry) => entry.rootId);
  const surfaceRootId = 'root';

  const messages = [
    {
      version: 'v0.9' as const,
      createSurface: {
        surfaceId,
        catalogId: BASIC_CATALOG_ID,
      },
    },
    {
      version: 'v0.9' as const,
      updateComponents: {
        surfaceId,
        components: [
          {
            id: surfaceRootId,
            component: 'Column',
            children: rootChildren,
          },
          ...built.flatMap((entry) => entry.components),
        ],
      },
    },
    ...built
      .filter(
        (
          entry,
        ): entry is BuiltComponent & {
          dataModelUpdate: NonNullable<BuiltComponent['dataModelUpdate']>;
        } => Boolean(entry.dataModelUpdate),
      )
      .map((entry) => ({
        version: 'v0.9' as const,
        updateDataModel: {
          surfaceId,
          path: entry.dataModelUpdate.path,
          value: entry.dataModelUpdate.value,
        },
      })),
  ] as A2uiMessage[];

  return { surfaceId, messages };
}

export function buildA2UI<TInput extends WidgetInput>(
  inputs: TInput[],
  factories: WidgetFactories<TInput>,
): {
  surfaceId: string;
  messages: A2uiMessage[];
} {
  const built = inputs.map((input) =>
    factories[input.type as TInput['type']](input as never),
  );
  return buildA2UIFromBuilt(built);
}
