import { Agent } from '@mastra/core/agent';

import { model } from '../config.js';
import { findHotelsTool } from '../tools/find-hotels.js';
import { hotelAgentPrompt } from './hotel-agent.prompt.js';

export const hotelAgent = new Agent({
  id: 'hotelAgent',
  name: 'Flight42 Hotel Agent',
  instructions: hotelAgentPrompt,
  model,
  tools: {
    findHotelsTool,
  },
});
