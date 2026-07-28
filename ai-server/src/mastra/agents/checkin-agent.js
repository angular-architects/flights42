import { Agent } from '@mastra/core/agent';
import { model } from '../config.js';
import { checkinAgentPrompt } from './checkin-agent.prompt.js';
export const checkinAgent = new Agent({
  id: 'checkinAgent',
  name: 'Flights42 Check-in Assistant',
  instructions: checkinAgentPrompt,
  // Must be a vision-capable model. The user's ticket image arrives as an
  // AI-SDK `ImagePart` on a multipart user message (see fallback in
  // extended-mastra-agent.ts).
  model,
  defaultOptions: { maxSteps: 3 },
});
