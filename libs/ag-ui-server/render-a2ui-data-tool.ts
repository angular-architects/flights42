import {
  type A2uiMessage,
  A2uiMessageListWrapperSchema,
} from '@a2ui/web_core/v0_9';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const RENDER_A2UI_DATA_TOOL_NAME = 'renderA2uiDataTool';

type UpdateDataModelMsg = Extract<A2uiMessage, { updateDataModel: unknown }>;

function getMessageSurfaceId(message: A2uiMessage): string {
  if ('updateDataModel' in message) {
    return message.updateDataModel.surfaceId;
  }
  throw new Error(
    'renderA2uiDataTool: only updateDataModel messages are accepted',
  );
}

export const renderA2uiDataTool = createTool({
  id: RENDER_A2UI_DATA_TOOL_NAME,
  description: [
    'Refresh the data model of an existing A2UI surface (delta render).',
    '',
    'Input is a wrapper object of the shape `{ messages: A2uiMessage[] }` containing',
    'ONLY `updateDataModel` v0.9 messages for a single, already existing surface.',
    '',
    'Rules:',
    '- All messages MUST use `version: "v0.9"` and share the same `surfaceId` (the one',
    '  provided in the refresh context).',
    '- The messages MUST NOT contain `createSurface` or `updateComponents` operations —',
    '  the component tree was created in a previous turn and is reused as-is.',
    '- Use the same `path` keys that were defined in the cached data model so that the',
    '  bound components pick up the fresh values.',
  ].join('\n'),
  inputSchema: z.object({
    messages: z
      .array(z.record(z.string(), z.unknown()))
      .describe(
        'Ordered list of A2UI v0.9 updateDataModel messages for a single surface.',
      ),
  }),
  execute: async (inputData: unknown) => {
    let parsed: { messages: A2uiMessage[] };
    try {
      parsed = A2uiMessageListWrapperSchema.parse(inputData) as {
        messages: A2uiMessage[];
      };
    } catch (err) {
      if (err instanceof z.ZodError) {
        const issues = err.issues
          .slice(0, 5)
          .map((issue) => {
            const path = issue.path.join('.') || '<root>';
            return `${path}: ${issue.message}`;
          })
          .join('; ');
        throw new Error(
          `renderA2uiDataTool: schema validation failed — ${issues}`,
        );
      }
      throw err;
    }
    const messages = parsed.messages;

    if (messages.length === 0) {
      throw new Error('renderA2uiDataTool: messages array must not be empty');
    }

    const dataModelMessages = messages.filter(
      (m): m is UpdateDataModelMsg => 'updateDataModel' in m,
    );
    if (dataModelMessages.length !== messages.length) {
      throw new Error(
        'renderA2uiDataTool: only updateDataModel messages are allowed in refresh mode',
      );
    }

    const surfaceId = getMessageSurfaceId(messages[0]);
    for (const message of messages) {
      if (getMessageSurfaceId(message) !== surfaceId) {
        throw new Error(
          `renderA2uiDataTool: all messages must share the same surfaceId (expected "${surfaceId}")`,
        );
      }
    }

    return { surfaceId, messages };
  },
});
