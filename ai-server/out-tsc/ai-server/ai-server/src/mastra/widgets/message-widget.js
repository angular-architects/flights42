import { randomUUID } from 'node:crypto';
import { defineServerWidget } from '@internal/ag-ui-server';
import { z } from 'zod';
export const messageWidget = defineServerWidget({
  name: 'messageWidget',
  description: [
    'Textual message to the user.',
    'MUST be the FIRST component in every showComponents call.',
    'Use this to provide the natural-language answer before any other widget.',
  ].join('\n'),
  schema: z.object({
    text: z.string().describe('Text to show to the user'),
  }),
  build: ({ text }) => {
    const instanceId = randomUUID();
    const textId = `message-${instanceId}`;
    const dataPath = `/messages/${instanceId}`;
    return {
      rootId: textId,
      components: [
        {
          id: textId,
          component: 'Text',
          text: { path: `${dataPath}/text` },
          variant: 'body',
        },
      ],
      dataModelUpdate: {
        path: dataPath,
        value: { text },
      },
    };
  },
});
