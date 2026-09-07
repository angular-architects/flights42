import { Memory } from '@mastra/memory';

import { travelPlanSchema } from './plan-schemas.js';

export const travelPlanMemory = new Memory({
  options: {
    workingMemory: {
      enabled: true,
      scope: 'resource',
      schema: travelPlanSchema,
      agentManaged: false,
    },
  },
});
