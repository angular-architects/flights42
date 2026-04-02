import { z } from 'zod';

import { MessageComponent } from '../../ui-assistant/message';
import { defineAgUiComponent } from '../ag-ui-types';

export const messageWidgetComponent = defineAgUiComponent({
  name: 'messageWidget',
  component: MessageComponent,
  schema: z.object({
    data: z.string().describe('Plain text or markdown to display to the user.'),
  }),
});
