import { createTool } from '@mastra/core/tools';

import { renderA2uiInputSchema } from './render-a2ui.schema.js';
import {
  RENDER_A2UI_TOOL_NAME,
  validateAndBuildSurface,
} from './validate-and-build-surface.js';

export const render_a2ui = createTool({
  id: RENDER_A2UI_TOOL_NAME,
  description:
    'Render a custom A2UI surface. Follow the A2UI Protocol Instructions in the system prompt.',
  inputSchema: renderA2uiInputSchema,
  execute: async (input) => {
    return validateAndBuildSurface(input);
  },
});
