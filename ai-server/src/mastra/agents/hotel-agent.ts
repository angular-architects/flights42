import { Agent } from '@mastra/core/agent';

import { findHotelsTool } from '../tools/find-hotels.js';
import { hotelAgentPrompt } from './hotel-agent.prompt.js';

export const hotelAgent = new Agent({
  id: 'hotelAgent',
  name: 'Flight42 Hotel Agent',
  instructions: hotelAgentPrompt,
  model: 'openai/gpt-5.3-chat-latest',
  tools: {
    findHotelsTool,
  },
});
