import { Agent } from '@mastra/core/agent';

import { defaultOptions, model } from '../config.js';
import { checkinAgentPrompt } from './checkin-agent.prompt.js';

export const checkinAgent = new Agent({
  id: 'checkinAgent',
  name: 'Flights42 Check-in Assistant',
  instructions: checkinAgentPrompt,
  // Must be a vision-capable model. The user's ticket image arrives as an
  // AG-UI image part on a multipart user message, which the stock adapter's
  // `convertAGUIMessagesToMastra` (`@ag-ui/mastra`) maps to an AI-SDK
  // `ImagePart`.
  model,
  defaultOptions: { ...defaultOptions, maxSteps: 3 },
});
