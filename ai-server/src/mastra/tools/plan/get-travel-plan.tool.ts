import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import { readPlan } from './plan-store.js';

export const getTravelPlanTool = createTool({
  id: 'getTravelPlan',
  description: `
    Returns the current travel plan: { summary, flights, hotels }. Each flight has
    id, from, to, date (ISO) and delay; each hotel has id, name, sterne, city.
    The current plan is also provided to you as data above the conversation — use
    this tool mainly to VERIFY the plan after you changed it.
  `.trim(),
  inputSchema: z.object({}),
  execute: async (_args, { requestContext }) => {
    return readPlan(requestContext);
  },
});
