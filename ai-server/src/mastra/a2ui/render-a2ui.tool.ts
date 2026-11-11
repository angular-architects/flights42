import {
  A2UI_OPERATIONS_KEY,
  RENDER_A2UI_TOOL_NAME,
} from '@ag-ui/a2ui-middleware';
import { createTool } from '@mastra/core/tools';

import { compileExpress } from './a2ui-express.js';
import { a2uiProcessor } from './a2ui-processor.js';
import { renderA2uiInputSchema } from './render-a2ui.schema.js';

export const render_a2ui = createTool({
  id: RENDER_A2UI_TOOL_NAME,
  description:
    'Render a custom A2UI surface written in A2UI Express. Follow the A2UI Express DSL Output Contract in the system prompt.',
  inputSchema: renderA2uiInputSchema,
  execute: async (input) => {
    const operations = compileExpress(a2uiProcessor, input.express);
    if (operations.length === 0) {
      throw new Error('no surface rendered');
    }
    return { [A2UI_OPERATIONS_KEY]: operations };
  },
});
