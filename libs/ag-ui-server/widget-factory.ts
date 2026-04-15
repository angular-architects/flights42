import { randomUUID } from 'node:crypto';

import type { ServerToClientMessage } from '@a2ui/web_core';

export interface BuiltComponent {
  rootId: string;
  components: { id: string; component: Record<string, unknown> }[];
  dataModelUpdate?: {
    path: string;
    contents: unknown[];
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
  messages: ServerToClientMessage[];
} {
  const surfaceId = randomUUID();
  const rootChildren = built.map((entry) => entry.rootId);
  const surfaceRootId = 'surface-root';

  const messages = [
    {
      surfaceUpdate: {
        surfaceId,
        components: [
          {
            id: surfaceRootId,
            component: {
              Column: {
                children: { explicitList: rootChildren },
              },
            },
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
        dataModelUpdate: {
          surfaceId,
          path: entry.dataModelUpdate.path,
          contents: entry.dataModelUpdate.contents,
        },
      })),
    { beginRendering: { surfaceId, root: surfaceRootId } },
  ] as ServerToClientMessage[];

  return { surfaceId, messages };
}

export function buildA2UI<TInput extends WidgetInput>(
  inputs: TInput[],
  factories: WidgetFactories<TInput>,
): {
  surfaceId: string;
  messages: ServerToClientMessage[];
} {
  const built = inputs.map((input) =>
    factories[input.type as TInput['type']](input as never),
  );
  return buildA2UIFromBuilt(built);
}
