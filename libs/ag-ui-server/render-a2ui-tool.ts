import { createTool } from '@mastra/core/tools';
import {
  A2uiMessageListWrapperSchema,
  type A2uiMessage,
} from '@a2ui/web_core/v0_9';
import { z } from 'zod';

export const RENDER_A2UI_TOOL_NAME = 'renderA2ui';

type CreateSurfaceMsg = Extract<A2uiMessage, { createSurface: unknown }>;
type UpdateComponentsMsg = Extract<A2uiMessage, { updateComponents: unknown }>;

type ComponentEntry = Record<string, unknown> & {
  id?: unknown;
  component?: unknown;
  child?: unknown;
  children?: unknown;
};

function getMessageSurfaceId(message: A2uiMessage): string {
  if ('createSurface' in message) {
    return message.createSurface.surfaceId;
  }
  if ('updateComponents' in message) {
    return message.updateComponents.surfaceId;
  }
  if ('updateDataModel' in message) {
    return message.updateDataModel.surfaceId;
  }
  if ('deleteSurface' in message) {
    return message.deleteSurface.surfaceId;
  }
  throw new Error('renderA2ui: encountered message without recognizable type');
}

function collectReferencedChildIds(components: ComponentEntry[]): string[] {
  const ids: string[] = [];
  for (const component of components) {
    const child = component['child'];
    if (typeof child === 'string') {
      ids.push(child);
    }
    const children = component['children'];
    if (Array.isArray(children)) {
      for (const entry of children) {
        if (typeof entry === 'string') {
          ids.push(entry);
        }
      }
    }
  }
  return ids;
}

function validateReferentialIntegrity(messages: A2uiMessage[]): void {
  const updateComponentsMessages = messages.filter(
    (m): m is UpdateComponentsMsg => 'updateComponents' in m,
  );

  for (const message of updateComponentsMessages) {
    const components = message.updateComponents.components as ComponentEntry[];

    const definedIds = new Set<string>();
    for (const component of components) {
      const id = component['id'];
      if (typeof id === 'string') {
        definedIds.add(id);
      }
    }

    const referenced = collectReferencedChildIds(components);
    for (const referencedId of referenced) {
      if (!definedIds.has(referencedId)) {
        throw new Error(
          `renderA2ui: component id "${referencedId}" is referenced via child/children but is not defined in updateComponents.components`,
        );
      }
    }
  }
}

export const renderA2uiTool = createTool({
  id: RENDER_A2UI_TOOL_NAME,
  description: [
    'Render the final answer to the user as an A2UI surface.',
    '',
    'Input is a wrapper object of the shape `{ messages: A2uiMessage[] }` containing a',
    'complete, self-contained sequence of A2UI v0.9 messages for a single surface. The',
    'sequence MUST contain:',
    '  1) exactly one `createSurface` message with a fresh `surfaceId` (any unique string)',
    '     and `catalogId: "https://a2ui.org/specification/v0_9/basic_catalog.json"`.',
    '  2) exactly one `updateComponents` message for the same `surfaceId`. Its `components`',
    '     array MUST define an entry with `id: "root"` of component type `Column` whose',
    '     `children` list the top-level blocks of the answer.',
    '  3) any number of `updateDataModel` messages for the same `surfaceId` to supply the',
    '     values bound via `{ path: "/..." }` references inside the components.',
    '',
    'Rules:',
    '- All messages MUST use `version: "v0.9"` and share the same `surfaceId`.',
    '- Every id referenced via `child` / `children` MUST be defined in the same',
    '  `updateComponents.components` array.',
    '- Any component from the A2UI basic catalog may be used (Column, Row, Card, Text,',
    '  Button, TextField, CheckBox, Image, ...).',
    '- Bind dynamic values via `{ path: "/..." }` and provide the data through',
    '  `updateDataModel`.',
  ].join('\n'),
  // A loose shape is exposed to the model/tool runtime here; the strict A2UI
  // schema is then applied inside `execute` via `A2uiMessageListWrapperSchema.parse(...)`.
  // This keeps defensive validation without triggering deep generic
  // instantiation of the full (recursive) A2UI wrapper schema inside
  // `createTool`'s generics.
  inputSchema: z.object({
    messages: z
      .array(z.record(z.string(), z.unknown()))
      .describe(
        'Ordered list of A2UI v0.9 messages for a single surface (createSurface, updateComponents, updateDataModel).',
      ),
  }),
  execute: async (inputData: unknown) => {
    const parsed = A2uiMessageListWrapperSchema.parse(inputData);
    const messages = parsed.messages as A2uiMessage[];

    if (messages.length === 0) {
      throw new Error('renderA2ui: messages array must not be empty');
    }

    const createSurfaceMessages = messages.filter(
      (m): m is CreateSurfaceMsg => 'createSurface' in m,
    );
    if (createSurfaceMessages.length !== 1) {
      throw new Error(
        `renderA2ui: expected exactly one createSurface message, got ${createSurfaceMessages.length}`,
      );
    }

    const updateComponentsMessages = messages.filter(
      (m): m is UpdateComponentsMsg => 'updateComponents' in m,
    );
    if (updateComponentsMessages.length !== 1) {
      throw new Error(
        `renderA2ui: expected exactly one updateComponents message, got ${updateComponentsMessages.length}`,
      );
    }

    const surfaceId = createSurfaceMessages[0].createSurface.surfaceId;
    for (const message of messages) {
      if (getMessageSurfaceId(message) !== surfaceId) {
        throw new Error(
          `renderA2ui: all messages must share the same surfaceId (expected "${surfaceId}")`,
        );
      }
    }

    const rootDefined = (
      updateComponentsMessages[0].updateComponents
        .components as ComponentEntry[]
    ).some((component) => component['id'] === 'root');
    if (!rootDefined) {
      throw new Error(
        'renderA2ui: updateComponents.components must define a component with id "root"',
      );
    }

    validateReferentialIntegrity(messages);

    return { surfaceId, messages };
  },
});
