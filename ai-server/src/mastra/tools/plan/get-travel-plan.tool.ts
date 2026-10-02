import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import { readPlan } from './plan-store.js';

export const getTravelPlanTool = createTool({
  id: 'getTravelPlan',
  description: `
    Returns the current travel plan: { summary, flights, hotels }. Each flight has
    id, from, to, date (ISO) and delay; each hotel has id, name, stars, imageUrl, city.
    The plan shown above the conversation is a snapshot from the start of your turn —
    call this tool to see the current state after you changed the plan, and to verify it.
  `.trim(),
  inputSchema: z.object({}),
  execute: async (_args, context) => {
    return readPlan(context);
  },
});
